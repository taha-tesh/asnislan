import Link from "next/link";
import { PAYMENT_METHODS, PAYMENT_STATUS, formatWeddingDate } from "@/lib/constants";
import type { Registration } from "@/lib/registrations";
import { removeRegistration, setPaymentStatus } from "@/app/admin/actions";

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
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass[status]}`}>{PAYMENT_STATUS[status]}</span>;
}

function Actions({ r }: { r: Registration }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {r.has_receipt ? (
        <Link href={`/admin/receipt/${r.id}`} className="rounded-lg bg-navy px-2.5 py-1 text-xs font-bold text-white hover:bg-navy-soft">
          الوصل
        </Link>
      ) : null}
      {r.payment_status !== "paid" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="paid" />
          <button className="rounded-lg bg-leaf px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-600">تأكيد</button>
        </form>
      ) : null}
      {r.payment_status !== "rejected" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="rejected" />
          <button className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-200">رفض</button>
        </form>
      ) : null}
      {r.payment_status !== "pending" ? (
        <form action={setPaymentStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="pending" />
          <button className="whitespace-nowrap rounded-lg bg-gold/20 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-gold/30">إرجاع للتحقق</button>
        </form>
      ) : null}
      <form action={removeRegistration}>
        <input type="hidden" name="id" value={r.id} />
        <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">حذف</button>
      </form>
    </div>
  );
}

export function RegistrationsTable({ rows }: { rows: Registration[] }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-rose-pale px-4 py-10 text-center text-muted">لا توجد تسجيلات مطابقة.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-navy/10 lg:block">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-navy text-right text-xs text-white">
            <tr>
              {["#", "الاسم الكامل", "تاريخ الميلاد", "القصر", "المهنة", "تاريخ الزواج", "الهاتف", "فصيلة الدم", "طريقة الدفع", "الحالة", "المرجع", "تاريخ التسجيل", "إجراءات"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-rose-pale/40 hover:bg-gold/10">
                <td className="px-3 py-2 font-mono text-xs text-muted">{r.id}</td>
                <td className="px-3 py-2 font-bold text-navy">{r.full_name}</td>
                <td className="px-3 py-2 ltr text-right tabular-nums">{r.birth_date}</td>
                <td className="px-3 py-2">{r.residence}</td>
                <td className="px-3 py-2">{r.profession}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatWeddingDate(r.wedding_year, r.wedding_month)}</td>
                <td className="px-3 py-2">
                  <a href={`https://wa.me/213${r.phone.slice(1)}`} target="_blank" rel="noopener" className="ltr inline-block font-mono text-navy hover:text-leaf hover:underline">
                    {r.phone}
                  </a>
                </td>
                <td className="px-3 py-2 ltr text-right font-bold">{r.blood_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {PAYMENT_METHODS[r.payment_method]}
                  {r.card_last4 ? <span className="ltr block font-mono text-xs text-muted">•••• {r.card_last4}</span> : null}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.payment_status} />
                </td>
                <td className="px-3 py-2 ltr text-right font-mono text-xs">{r.payment_reference ?? "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted">{fmtDate(r.created_at)}</td>
                <td className="min-w-[260px] px-3 py-2">
                  <Actions r={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-navy">{r.full_name}</p>
                <p className="text-xs text-muted">
                  #{r.id} · {fmtDate(r.created_at)}
                </p>
              </div>
              <StatusBadge status={r.payment_status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">تاريخ الميلاد</dt>
              <dd className="ltr text-right">{r.birth_date}</dd>
              <dt className="text-muted">القصر</dt>
              <dd>{r.residence}</dd>
              <dt className="text-muted">المهنة</dt>
              <dd>{r.profession}</dd>
              <dt className="text-muted">تاريخ الزواج</dt>
              <dd>{formatWeddingDate(r.wedding_year, r.wedding_month)}</dd>
              <dt className="text-muted">الهاتف</dt>
              <dd>
                <a href={`https://wa.me/213${r.phone.slice(1)}`} target="_blank" rel="noopener" className="ltr inline-block font-mono text-navy hover:underline">
                  {r.phone}
                </a>
              </dd>
              <dt className="text-muted">فصيلة الدم</dt>
              <dd className="ltr text-right font-bold">{r.blood_type}</dd>
              <dt className="text-muted">طريقة الدفع</dt>
              <dd>
                {PAYMENT_METHODS[r.payment_method]}
                {r.card_last4 ? <span className="ltr block font-mono text-xs text-muted">•••• {r.card_last4}</span> : null}
              </dd>
              {r.payment_reference ? (
                <>
                  <dt className="text-muted">المرجع</dt>
                  <dd className="ltr text-right font-mono text-xs">{r.payment_reference}</dd>
                </>
              ) : null}
            </dl>
            <div className="mt-3 border-t border-navy/5 pt-3">
              <Actions r={r} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
