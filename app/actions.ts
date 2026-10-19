"use server";

import { pool } from "@/lib/db";
import { EVENT, formatWeddingDate } from "@/lib/constants";
import { isCloudinaryConfigured, uploadReceipt } from "@/lib/cloudinary";
import { ensureSchema } from "@/lib/ensure-schema";
import { parseRegistration, validateReceipt, type FieldErrors } from "@/lib/validation";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors }
  | {
      status: "success";
      id: number;
      fullName: string;
      birthDate: string;
      badgeToken: string;
      paymentStatus: "pending";
      weddingLabel: string;
    };

export async function submitRegistration(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const { data, errors } = parseRegistration(formData);
  if (!data) return { status: "error", errors, message: "يرجى تصحيح الحقول المشار إليها" };

  if (!isCloudinaryConfigured()) {
    return {
      status: "error",
      errors: { receipt: "رفع الملفات غير متاح حالياً" },
      message: "تعذر رفع وصل التحويل. يرجى المحاولة لاحقاً أو التواصل مع المنظمين.",
    };
  }

  const r = validateReceipt(formData.get("receipt"));
  if (r.error) return { status: "error", errors: { receipt: r.error }, message: "يرجى إرفاق وصل التحويل" };
  const receipt = r.file!;

  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; badge_token: string }>(
      `INSERT INTO asnislan_registrations
         (full_name, birth_date, residence, profession, wedding_month, wedding_year, phone, blood_type,
          payment_method, payment_status, amount_dzd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'baridimob','pending',$9)
       RETURNING id::int AS id, badge_token`,
      [
        data.fullName,
        data.birthDate,
        data.residence,
        data.profession,
        data.weddingMonth,
        data.weddingYear,
        data.phone,
        data.bloodType,
        EVENT.feeDzd,
      ],
    );
    const { id, badge_token: badgeToken } = rows[0];

    const uploaded = await uploadReceipt(receipt, id);
    await client.query(
      `INSERT INTO asnislan_receipts
         (registration_id, file_name, mime_type, size_bytes, cloudinary_url, cloudinary_public_id, cloudinary_resource_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id,
        receipt.name.slice(0, 200),
        uploaded.mimeType,
        uploaded.bytes,
        uploaded.url,
        uploaded.publicId,
        uploaded.resourceType,
      ],
    );

    await client.query("COMMIT");

    return {
      status: "success",
      id,
      fullName: data.fullName,
      birthDate: data.birthDate,
      badgeToken,
      paymentStatus: "pending",
      weddingLabel: formatWeddingDate(data.weddingYear, data.weddingMonth),
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("submitRegistration failed", err);
    return {
      status: "error",
      errors: {},
      message: "حدث خطأ أثناء حفظ التسجيل. يرجى المحاولة مرة أخرى أو التواصل مع المنظمين.",
    };
  } finally {
    client.release();
  }
}
