"use server";

import { pool } from "@/lib/db";
import { EVENT, formatWeddingDate, type PaymentMethod } from "@/lib/constants";
import { processCardPayment } from "@/lib/payment";
import { isCloudinaryConfigured, uploadReceipt } from "@/lib/cloudinary";
import { parseCard, parseRegistration, validateReceipt, type FieldErrors } from "@/lib/validation";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors }
  | {
      status: "success";
      id: number;
      fullName: string;
      birthDate: string;
      badgeToken: string;
      paymentMethod: PaymentMethod;
      paymentStatus: "pending" | "paid";
      reference: string | null;
      weddingLabel: string;
      testMode: boolean;
    };

export async function submitRegistration(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const { data, errors } = parseRegistration(formData);
  if (!data) return { status: "error", errors, message: "يرجى تصحيح الحقول المشار إليها" };

  let receipt: File | undefined;
  let payment: { reference: string; last4: string; holder: string; mode: "test" | "live" } | undefined;

  if (data.paymentMethod === "baridimob") {
    if (!isCloudinaryConfigured()) {
      return {
        status: "error",
        errors: { receipt: "رفع الملفات غير متاح حالياً" },
        message: "تعذر رفع وصل التحويل. يرجى المحاولة لاحقاً أو التواصل مع المنظمين.",
      };
    }
    const r = validateReceipt(formData.get("receipt"));
    if (r.error) return { status: "error", errors: { receipt: r.error }, message: "يرجى إرفاق وصل التحويل" };
    receipt = r.file;
  } else {
    const { card, errors: cardErrors } = parseCard(formData);
    if (!card) return { status: "error", errors: cardErrors, message: "يرجى التحقق من معلومات البطاقة" };

    const result = await processCardPayment(card, EVENT.feeDzd);
    if (!result.ok) return { status: "error", errors: { cardNumber: result.message }, message: result.message };
    payment = { reference: result.reference, last4: result.last4, holder: card.holder, mode: result.mode };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentStatus = payment ? "paid" : "pending";
    const { rows } = await client.query<{ id: number; badge_token: string }>(
      `INSERT INTO asnislan_registrations
         (full_name, birth_date, residence, profession, wedding_month, wedding_year, phone, blood_type,
          payment_method, payment_status, amount_dzd, card_holder, card_last4, payment_reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
        data.paymentMethod,
        paymentStatus,
        EVENT.feeDzd,
        payment?.holder ?? null,
        payment?.last4 ?? null,
        payment?.reference ?? null,
      ],
    );
    const { id, badge_token: badgeToken } = rows[0];

    if (receipt) {
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
    }

    await client.query("COMMIT");

    return {
      status: "success",
      id,
      fullName: data.fullName,
      birthDate: data.birthDate,
      badgeToken,
      paymentMethod: data.paymentMethod,
      paymentStatus,
      reference: payment?.reference ?? null,
      weddingLabel: formatWeddingDate(data.weddingYear, data.weddingMonth),
      testMode: payment?.mode === "test",
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
