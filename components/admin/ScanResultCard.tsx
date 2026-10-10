"use client";

import Link from "next/link";
import { PAYMENT_METHODS, PAYMENT_STATUS, formatWeddingDate, type PaymentStatus } from "@/lib/constants";
import { formatBirthDate } from "@/lib/badge";
import type { Registration } from "@/lib/registrations";

const statusTheme: Record<PaymentStatus, { bg: string; text: string; icon: string; title: string }> = {
  paid: { bg: "bg-leaf", text: "text-white", icon: "✅", title: "الاشتراك مدفوع - مرحباً بالمشارك" },
  pending: { bg: "bg-gold", text: "text-navy", icon: "⏳", title: "الدفع قيد التحقق" },
  rejected: { bg: "bg-red-600", text: "text-white", icon: "⛔", title: "الدفع مرفوض" },
};

export function ScanResultCard({ r }: { r: Registration }) {
  const t = statusTheme[r.payment_status];
  return (
    <div className="fade-up overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-xl shadow-navy/10">
      <div className={`flex items-center gap-3 px-5 py-4 ${t.bg} ${t.text}`}>
        <span className="text-3xl" aria-hidden>
          {t.icon}
        </span>
        <div>
          <p className="text-lg font-extrabold">{t.title}</p>
          <p className="text-sm opacity-90">
            الحالة: {PAYMENT_STATUS[r.payment_status]} · رقم التسجيل #{r.id}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-2xl font-extrabold text-navy">{r.full_name}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">تاريخ الميلاد</dt>
            <dd className="font-bold ltr text-right">{formatBirthDate(r.birth_date)}</dd>
          </div>
          <div>
            <dt className="text-muted">القصر</dt>
            <dd className="font-bold">{r.residence}</dd>
          </div>
          <div>
            <dt className="text-muted">المهنة</dt>
            <dd className="font-bold">{r.profession}</dd>
          </div>
          <div>
            <dt className="text-muted">تاريخ الزواج</dt>
            <dd className="font-bold">{formatWeddingDate(r.wedding_year, r.wedding_month)}</dd>
          </div>
          <div>
            <dt className="text-muted">الهاتف</dt>
            <dd className="font-bold">
              <a href={`https://wa.me/213${r.phone.slice(1)}`} target="_blank" rel="noopener" className="ltr inline-block font-mono text-navy hover:underline">
                {r.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted">فصيلة الدم</dt>
            <dd className="font-bold ltr text-right">{r.blood_type}</dd>
          </div>
          <div>
            <dt className="text-muted">طريقة الدفع</dt>
            <dd className="font-bold">{PAYMENT_METHODS[r.payment_method]}</dd>
          </div>
          <div>
            <dt className="text-muted">المبلغ</dt>
            <dd className="font-bold">{r.amount_dzd.toLocaleString("ar-DZ")} دج</dd>
          </div>
          {r.payment_reference ? (
            <div>
              <dt className="text-muted">مرجع الدفع</dt>
              <dd className="font-mono text-xs font-bold ltr text-right">{r.payment_reference}</dd>
            </div>
          ) : null}
        </dl>

        {r.has_receipt ? (
          <div className="mt-4 border-t border-navy/5 pt-4">
            <Link href={`/admin/receipt/${r.id}`} className="btn-ghost">
              <span aria-hidden>🧾</span> عرض وصل التحويل
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
