import "server-only";
import { query } from "./db";
import { ensureSchema } from "./ensure-schema";
import type { BloodType, PaymentMethod, PaymentStatus } from "./constants";
import type { RegistrationInput } from "./validation";

export type Registration = {
  id: number;
  full_name: string;
  birth_date: string; // YYYY-MM-DD
  residence: string;
  profession: string;
  wedding_month: number;
  wedding_year: number;
  phone: string;
  blood_type: BloodType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_dzd: number;
  card_holder: string | null;
  card_last4: string | null;
  payment_reference: string | null;
  admin_note: string | null;
  badge_token: string;
  attended_at: string | null;
  created_by_admin: boolean;
  created_at: string;
  updated_at: string;
  has_receipt: boolean;
  receipt_name: string | null;
};

export type ReceiptMeta = {
  file_name: string;
  mime_type: string;
  size_bytes: number;
  cloudinary_url: string | null;
  cloudinary_public_id: string | null;
  cloudinary_resource_type: string | null;
  has_local_data: boolean;
};

const SELECT = `
  SELECT r.id::int AS id, r.full_name, to_char(r.birth_date, 'YYYY-MM-DD') AS birth_date, r.residence, r.profession,
         r.wedding_month, r.wedding_year, r.phone, r.blood_type, r.payment_method, r.payment_status,
         r.amount_dzd, r.card_holder, r.card_last4, r.payment_reference, r.admin_note, r.badge_token,
         r.attended_at::text AS attended_at, r.created_by_admin,
         r.created_at::text AS created_at, r.updated_at::text AS updated_at,
         (rc.id IS NOT NULL) AS has_receipt, rc.file_name AS receipt_name
  FROM asnislan_registrations r
  LEFT JOIN asnislan_receipts rc ON rc.registration_id = r.id
`;

export type ListFilters = {
  q?: string;
  status?: PaymentStatus | "";
  method?: PaymentMethod | "";
  attendance?: "present" | "absent" | "";
};

export async function listRegistrations(filters: ListFilters = {}) {
  await ensureSchema();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(r.full_name ILIKE $${params.length} OR r.phone ILIKE $${params.length} OR r.residence ILIKE $${params.length} OR r.payment_reference ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`r.payment_status = $${params.length}`);
  }
  if (filters.method) {
    params.push(filters.method);
    where.push(`r.payment_method = $${params.length}`);
  }
  if (filters.attendance === "present") {
    where.push(`r.attended_at IS NOT NULL`);
  } else if (filters.attendance === "absent") {
    where.push(`r.attended_at IS NULL`);
  }
  const sql = `${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY r.created_at DESC`;
  const { rows } = await query<Registration>(sql, params);
  return rows;
}

export async function getRegistrationByToken(token: string) {
  await ensureSchema();
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  const { rows } = await query<Registration>(`${SELECT} WHERE r.badge_token = $1`, [token.toLowerCase()]);
  return rows[0] ?? null;
}

export async function getRegistrationById(id: number) {
  await ensureSchema();
  const { rows } = await query<Registration>(`${SELECT} WHERE r.id = $1`, [id]);
  return rows[0] ?? null;
}

export type Stats = {
  total: number;
  paid: number;
  pending: number;
  rejected: number;
  baridimob: number;
  dahabia: number;
  cash: number;
  present: number;
  revenue: number;
  cashRevenue: number;
};

export async function getStats(): Promise<Stats> {
  await ensureSchema();
  const { rows } = await query<Record<string, string>>(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
           count(*) FILTER (WHERE payment_status = 'pending')::int AS pending,
           count(*) FILTER (WHERE payment_status = 'rejected')::int AS rejected,
           count(*) FILTER (WHERE payment_method = 'baridimob')::int AS baridimob,
           count(*) FILTER (WHERE payment_method = 'dahabia')::int AS dahabia,
           count(*) FILTER (WHERE payment_method = 'cash')::int AS cash,
           count(*) FILTER (WHERE attended_at IS NOT NULL)::int AS present,
           coalesce(sum(amount_dzd) FILTER (WHERE payment_status = 'paid'), 0)::int AS revenue,
           coalesce(sum(amount_dzd) FILTER (WHERE payment_method = 'cash' AND payment_status = 'paid'), 0)::int AS cash_revenue
    FROM asnislan_registrations
  `);
  const r = rows[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    paid: Number(r.paid ?? 0),
    pending: Number(r.pending ?? 0),
    rejected: Number(r.rejected ?? 0),
    baridimob: Number(r.baridimob ?? 0),
    dahabia: Number(r.dahabia ?? 0),
    cash: Number(r.cash ?? 0),
    present: Number(r.present ?? 0),
    revenue: Number(r.revenue ?? 0),
    cashRevenue: Number(r.cash_revenue ?? 0),
  };
}

/** Mark present if not already; returns { registration, firstTime }. */
export async function markPresentByToken(token: string) {
  await ensureSchema();
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  const existing = await getRegistrationByToken(token);
  if (!existing) return null;
  const firstTime = !existing.attended_at;
  if (firstTime) {
    await query(`UPDATE asnislan_registrations SET attended_at = now() WHERE id = $1 AND attended_at IS NULL`, [existing.id]);
  }
  const updated = await getRegistrationById(existing.id);
  return updated ? { registration: updated, firstTime } : null;
}

export async function setAttendance(id: number, present: boolean) {
  await ensureSchema();
  if (present) {
    await query(`UPDATE asnislan_registrations SET attended_at = coalesce(attended_at, now()) WHERE id = $1`, [id]);
  } else {
    await query(`UPDATE asnislan_registrations SET attended_at = NULL WHERE id = $1`, [id]);
  }
}

export async function createAdminRegistration(data: RegistrationInput, amountDzd: number) {
  await ensureSchema();
  const { rows } = await query<{ id: number; badge_token: string }>(
    `INSERT INTO asnislan_registrations
       (full_name, birth_date, residence, profession, wedding_month, wedding_year, phone, blood_type,
        payment_method, payment_status, amount_dzd, created_by_admin, attended_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'cash','paid',$9,true,now())
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
      amountDzd,
    ],
  );
  return rows[0];
}

/** Legacy BYTEA rows (before Cloudinary). */
export async function getReceipt(registrationId: number) {
  const { rows } = await query<{ file_name: string; mime_type: string; data: Buffer }>(
    `SELECT file_name, mime_type, data FROM asnislan_receipts
     WHERE registration_id = $1 AND data IS NOT NULL`,
    [registrationId],
  );
  return rows[0] ?? null;
}

export async function getReceiptMeta(registrationId: number): Promise<ReceiptMeta | null> {
  const { rows } = await query<{
    file_name: string;
    mime_type: string;
    size_bytes: number;
    cloudinary_url: string | null;
    cloudinary_public_id: string | null;
    cloudinary_resource_type: string | null;
    has_local_data: boolean;
  }>(
    `SELECT file_name, mime_type, size_bytes,
            cloudinary_url, cloudinary_public_id, cloudinary_resource_type,
            (data IS NOT NULL) AS has_local_data
     FROM asnislan_receipts WHERE registration_id = $1`,
    [registrationId],
  );
  return rows[0] ?? null;
}

export async function getReceiptCloudinary(registrationId: number) {
  const { rows } = await query<{
    cloudinary_public_id: string;
    cloudinary_resource_type: string;
    file_name: string;
  }>(
    `SELECT cloudinary_public_id, cloudinary_resource_type, file_name
     FROM asnislan_receipts
     WHERE registration_id = $1 AND cloudinary_public_id IS NOT NULL`,
    [registrationId],
  );
  return rows[0] ?? null;
}

export async function updateStatus(id: number, status: PaymentStatus, note?: string | null) {
  await ensureSchema();
  await query(
    `UPDATE asnislan_registrations SET payment_status = $2, admin_note = coalesce($3, admin_note) WHERE id = $1`,
    [id, status, note ?? null],
  );
}

export async function deleteRegistration(id: number) {
  await ensureSchema();
  const asset = await getReceiptCloudinary(id);
  await query(`DELETE FROM asnislan_registrations WHERE id = $1`, [id]);
  if (asset) {
    const { deleteReceiptAsset } = await import("./cloudinary");
    await deleteReceiptAsset(asset.cloudinary_public_id, asset.cloudinary_resource_type);
  }
}
