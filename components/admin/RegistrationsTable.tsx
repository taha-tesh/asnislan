"use client";

import { useEffect, useId, useState } from "react";
import { PAYMENT_METHODS, PAYMENT_STATUS, formatWeddingDate } from "@/lib/constants";
import type { Registration } from "@/lib/registrations";
import { removeRegistration, setAttendanceStatus, setPaymentStatus } from "@/app/admin/actions";
import { ModalPortal } from "./ModalPortal";
import { ReceiptPreview } from "./ReceiptPreview";

const statusClass: Record<Registration["payment_status"], string> = {
  paid: "bg-leaf-light text-leaf",
  pending: "bg-gold/20 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-DZ", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: Registration["payment_status"] }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass[status]}`}>
      {PAYMENT_STATUS[status]}
    </span>
  );
}

function AttendanceBadge({ attendedAt }: { attendedAt: string | null }) {
  if (attendedAt) {
    return <span className="inline-block rounded-full bg-leaf-light px-2.5 py-0.5 text-xs font-bold text-leaf">حاضر</span>;
  }
  return <span className="inline-block rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-bold text-muted">غائب</span>;
}

function DetailActions({ r }: { r: Registration }) {
  const present = Boolean(r.attended_at);
  return (
    <div className="flex flex-wrap gap-2">
      <form action={setAttendanceStatus}>
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="present" value={present ? "0" : "1"} />
        <button
          type="submit"
          className={`rounded-xl px-3 py-2 text-sm font-bold ${
            present ? "bg-navy/10 text-navy hover:bg-navy/15" : "bg-leaf text-white hover:bg-emerald-600"
          }`}
        >
          {present ? "إلغاء الحضور" : "تسجيل حضور"}
        </button>
      </form>
      {r.payment_status !== "paid" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="paid" />
          <button type="submit" className="rounded-xl bg-leaf px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600">
            تأكيد الدفع
          </button>
        </form>
      ) : null}
      {r.payment_status !== "rejected" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="rejected" />
          <button type="submit" className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
            رفض
          </button>
        </form>
      ) : null}
      {r.payment_status !== "pending" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="pending" />
          <button type="submit" className="rounded-xl bg-gold/20 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-gold/30">
            إرجاع للتحقق
          </button>
        </form>
      ) : null}
      <form action={removeRegistration}>
        <input type="hidden" name="id" value={r.id} />
        <button type="submit" className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
          حذف
        </button>
      </form>
    </div>
  );
}

function RegistrationDetailModal({ r, onClose }: { r: Registration; onClose: () => void }) {
  const titleId = useId();
  const fileUrl = `/admin/receipt/${r.id}/file`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-navy-deep/70 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fade-up my-0 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:my-4 sm:max-h-[min(90dvh,880px)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-navy/10 px-5 py-4">
          <div>
            <p className="text-xs text-muted">تسجيل #{r.id}</p>
            <h2 id={titleId} className="text-xl font-extrabold text-navy">
              {r.full_name}
              {r.created_by_admin ? <span className="mr-2 text-xs font-bold text-gold">· يدوي</span> : null}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={r.payment_status} />
              <AttendanceBadge attendedAt={r.attended_at} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-bold text-navy hover:bg-navy/10"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">الهاتف</dt>
              <dd className="font-bold">
                <a
                  href={`https://wa.me/213${r.phone.slice(1)}`}
                  target="_blank"
                  rel="noopener"
                  className="ltr inline-block font-mono text-navy hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">تاريخ الميلاد</dt>
              <dd className="ltr text-right font-bold">{r.birth_date}</dd>
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
              <dt className="text-muted">فصيلة الدم</dt>
              <dd className="ltr text-right font-bold">{r.blood_type}</dd>
            </div>
            <div>
              <dt className="text-muted">طريقة الدفع</dt>
              <dd className="font-bold">{PAYMENT_METHODS[r.payment_method]}</dd>
            </div>
            <div>
              <dt className="text-muted">المبلغ</dt>
              <dd className="font-bold">{r.amount_dzd.toLocaleString("ar-DZ")} دج</dd>
            </div>
            <div>
              <dt className="text-muted">تاريخ التسجيل</dt>
              <dd className="font-bold">{fmtDate(r.created_at)}</dd>
            </div>
            {r.attended_at ? (
              <div>
                <dt className="text-muted">وقت الحضور</dt>
                <dd className="font-bold">{fmtDate(r.attended_at)}</dd>
              </div>
            ) : null}
            {r.payment_reference ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">مرجع الدفع</dt>
                <dd className="ltr text-right font-mono text-xs font-bold">{r.payment_reference}</dd>
              </div>
            ) : null}
            {r.admin_note ? (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted">ملاحظة الإدارة</dt>
                <dd className="font-bold">{r.admin_note}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 border-t border-navy/10 pt-4">
            <p className="mb-3 text-sm font-extrabold text-navy">الإجراءات</p>
            <DetailActions r={r} />
          </div>

          <div className="mt-5 border-t border-navy/10 pt-4">
            <p className="mb-3 text-sm font-extrabold text-navy">وصل التحويل</p>
            {r.has_receipt ? (
              <div className="overflow-hidden rounded-2xl bg-navy-deep/95 p-3">
                <ReceiptPreview
                  registrationId={r.id}
                  openUrl={fileUrl}
                  downloadUrl={`${fileUrl}?download=1`}
                  mimeType="application/octet-stream"
                  fileName={r.receipt_name ?? `receipt-${r.id}`}
                  compact
                />
              </div>
            ) : (
              <p className="rounded-2xl bg-rose-pale px-4 py-6 text-center text-sm text-muted">لا يوجد وصل مرفق بهذا التسجيل.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

export function RegistrationsTable({ rows }: { rows: Registration[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId == null ? null : (rows.find((r) => r.id === selectedId) ?? null);

  if (rows.length === 0) {
    return <p className="rounded-2xl bg-rose-pale px-4 py-10 text-center text-muted">لا توجد تسجيلات مطابقة.</p>;
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSelectedId(r.id)}
              className="w-full rounded-2xl border border-navy/10 bg-white p-4 text-right shadow-sm transition hover:border-gold/40 hover:bg-gold/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-navy">
                    {r.full_name}
                    {r.created_by_admin ? <span className="mr-1 text-[10px] font-bold text-gold"> يدوي</span> : null}
                  </p>
                  <p className="ltr mt-1 font-mono text-sm text-navy">{r.phone}</p>
                  <p className="mt-1 text-xs text-muted">{fmtDate(r.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={r.payment_status} />
                  <AttendanceBadge attendedAt={r.attended_at} />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-navy/10 md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-navy text-right text-xs text-white">
            <tr>
              {["الاسم الكامل", "الهاتف", "الحالة", "الحضور", "تاريخ التسجيل"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-bold first:pr-4 last:pl-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {rows.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedId(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(r.id);
                  }
                }}
                className="cursor-pointer odd:bg-white even:bg-rose-pale/40 hover:bg-gold/15 focus:bg-gold/20 focus:outline-none"
              >
                <td className="px-3 py-3 font-bold text-navy first:pr-4">
                  <span className="line-clamp-1">{r.full_name}</span>
                  {r.created_by_admin ? <span className="mr-1 text-[10px] font-bold text-gold">يدوي</span> : null}
                </td>
                <td className="px-3 py-3">
                  <span className="ltr inline-block font-mono text-navy">{r.phone}</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.payment_status} />
                </td>
                <td className="px-3 py-3">
                  <AttendanceBadge attendedAt={r.attended_at} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted last:pl-4">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-xs text-muted">اضغط على أي صف لعرض التفاصيل والإجراءات والوصل</p>

      {selected ? <RegistrationDetailModal r={selected} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}
