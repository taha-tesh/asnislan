import * as XLSX from "xlsx";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_STATUS, formatWeddingDate, type PaymentMethod, type PaymentStatus } from "@/lib/constants";
import { listRegistrations } from "@/lib/registrations";

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const method = sp.get("method") ?? "";
  const rows = await listRegistrations({
    q: (sp.get("q") ?? "").trim().slice(0, 100),
    status: status in PAYMENT_STATUS ? (status as PaymentStatus) : "",
    method: method in PAYMENT_METHODS ? (method as PaymentMethod) : "",
  });

  const data = rows.map((r, i) => ({
    "الرقم": i + 1,
    "رقم التسجيل": r.id,
    "الاسم الكامل": r.full_name,
    "تاريخ الميلاد": r.birth_date,
    "القصر": r.residence,
    "المهنة": r.profession,
    "تاريخ الزواج": formatWeddingDate(r.wedding_year, r.wedding_month),
    "رقم الهاتف (الواتساب)": r.phone,
    "فصيلة الدم": r.blood_type,
    "طريقة الدفع": PAYMENT_METHODS[r.payment_method],
    "حالة الدفع": PAYMENT_STATUS[r.payment_status],
    "المبلغ (دج)": r.amount_dzd,
    "مرجع الدفع": r.payment_reference ?? "",
    "آخر 4 أرقام البطاقة": r.card_last4 ?? "",
    "وصل مرفق": r.has_receipt ? "نعم" : "لا",
    "ملاحظة الإدارة": r.admin_note ?? "",
    "تاريخ التسجيل": new Date(r.created_at).toLocaleString("ar-DZ"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [4, 10, 30, 12, 16, 16, 14, 16, 8, 22, 12, 10, 22, 12, 8, 24, 20].map((wch) => ({ wch }));
  if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "التسجيلات");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asnislan17-registrations-${date}.xlsx"; filename*=UTF-8''${encodeURIComponent(`تسجيلات-آس-نيسلان-17-${date}.xlsx`)}`,
      "Cache-Control": "no-store",
    },
  });
}
