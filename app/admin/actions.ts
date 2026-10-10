"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { checkPassword, clearAdminSession, isAdmin, setAdminSession } from "@/lib/auth";
import { PAYMENT_STATUS, type PaymentStatus } from "@/lib/constants";
import { parseBadgeToken } from "@/lib/badge";
import { deleteRegistration, getRegistrationByToken, updateStatus, type Registration } from "@/lib/registrations";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  // Small delay to slow down brute force attempts.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password)) return { error: "كلمة المرور غير صحيحة" };
  await setAdminSession();
  redirect("/admin");
}

export async function logout() {
  await clearAdminSession();
  redirect("/admin/login");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function setPaymentStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as PaymentStatus;
  if (!Number.isInteger(id) || !(status in PAYMENT_STATUS)) throw new Error("Bad request");
  await updateStatus(id, status);
  refresh();
}

export type LookupResult = { ok: true; registration: Registration } | { ok: false; message: string };

export async function lookupBadge(raw: string): Promise<LookupResult> {
  await requireAdmin();
  const token = parseBadgeToken(raw);
  if (!token) return { ok: false, message: "رمز QR غير صالح أو لا ينتمي لهذه الدورة" };
  const registration = await getRegistrationByToken(token);
  if (!registration) return { ok: false, message: "لم يتم العثور على تسجيل مطابق لهذا الرمز" };
  return { ok: true, registration };
}

export async function removeRegistration(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("Bad request");
  await deleteRegistration(id);
  refresh();
}
