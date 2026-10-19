"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { checkPassword, clearAdminSession, isAdmin, setAdminSession } from "@/lib/auth";
import { EVENT, PAYMENT_STATUS, type PaymentStatus } from "@/lib/constants";
import { parseBadgeToken } from "@/lib/badge";
import {
  createAdminRegistration,
  deleteRegistration,
  markPresentByToken,
  setAttendance,
  updateStatus,
  type Registration,
} from "@/lib/registrations";
import { parseRegistration, type FieldErrors } from "@/lib/validation";

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

export async function setAttendanceStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const present = String(formData.get("present")) === "1";
  if (!Number.isInteger(id)) throw new Error("Bad request");
  await setAttendance(id, present);
  refresh();
}

export type LookupResult =
  | { ok: true; registration: Registration; firstTime: boolean }
  | { ok: false; message: string };

/** Lookup badge and automatically mark the participant present. */
export async function lookupBadge(raw: string): Promise<LookupResult> {
  await requireAdmin();
  const token = parseBadgeToken(raw);
  if (!token) return { ok: false, message: "رمز QR غير صالح أو لا ينتمي لهذه الدورة" };
  const marked = await markPresentByToken(token);
  if (!marked) return { ok: false, message: "لم يتم العثور على تسجيل مطابق لهذا الرمز" };
  return { ok: true, registration: marked.registration, firstTime: marked.firstTime };
}

export async function removeRegistration(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("Bad request");
  await deleteRegistration(id);
  refresh();
}

export type AdminRegisterState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: FieldErrors }
  | { status: "success"; id: number; fullName: string };

export async function adminRegisterWalkIn(
  _prev: AdminRegisterState,
  formData: FormData,
): Promise<AdminRegisterState> {
  await requireAdmin();
  const { data, errors } = parseRegistration(formData);
  if (!data) return { status: "error", errors, message: "يرجى تصحيح الحقول المشار إليها" };

  try {
    const row = await createAdminRegistration(data, EVENT.feeDzd);
    refresh();
    return { status: "success", id: row.id, fullName: data.fullName };
  } catch (err) {
    console.error("adminRegisterWalkIn failed", err);
    return {
      status: "error",
      errors: {},
      message: "تعذر حفظ التسجيل. يرجى المحاولة مرة أخرى.",
    };
  }
}
