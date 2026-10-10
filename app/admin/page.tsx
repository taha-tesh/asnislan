import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { EVENT, PAYMENT_METHODS, PAYMENT_STATUS, type PaymentMethod, type PaymentStatus } from "@/lib/constants";
import { getStats, listRegistrations } from "@/lib/registrations";
import { logout } from "./actions";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { StatCard } from "@/components/admin/StatCard";

type Search = { q?: string; status?: string; method?: string };

function cleanFilters(sp: Search): { q: string; status: PaymentStatus | ""; method: PaymentMethod | "" } {
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = (sp.status ?? "") in PAYMENT_STATUS ? (sp.status as PaymentStatus) : "";
  const method = (sp.method ?? "") in PAYMENT_METHODS ? (sp.method as PaymentMethod) : "";
  return { q, status, method };
}

async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const filters = cleanFilters(await searchParams);
  const [stats, rows] = await Promise.all([getStats(), listRegistrations(filters)]);

  const exportQuery = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>,
  ).toString();

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="إجمالي التسجيلات" value={stats.total} tone="navy" />
        <StatCard label="مدفوع" value={stats.paid} tone="leaf" />
        <StatCard label="قيد التحقق" value={stats.pending} tone="gold" />
        <StatCard label="مرفوض" value={stats.rejected} tone="rose" />
        <StatCard label="بريدي موب / بطاقة" value={`${stats.baridimob} / ${stats.dahabia}`} tone="navy" />
        <StatCard label="المبالغ المحصّلة" value={`${stats.revenue.toLocaleString("ar-DZ")} دج`} tone="leaf" />
      </div>

      <section className="card mt-6 p-4 sm:p-6">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="بحث بالاسم، الهاتف، القصر أو مرجع الدفع..."
            className="field-input"
          />
          <select name="status" defaultValue={filters.status} className="field-input sm:w-44">
            <option value="">كل الحالات</option>
            {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="method" defaultValue={filters.method} className="field-input sm:w-52">
            <option value="">كل طرق الدفع</option>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-ghost">
            تصفية
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            عدد النتائج: <span className="font-extrabold text-navy">{rows.length}</span>
          </p>
          <a href={`/admin/export${exportQuery ? `?${exportQuery}` : ""}`} className="btn-gold" download>
            <span aria-hidden>📊</span> تصدير إلى Excel
          </a>
        </div>

        <div className="mt-4">
          <RegistrationsTable rows={rows} />
        </div>
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-white/70" />
    </div>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-gold-light">{EVENT.edition}</p>
            <h1 className="text-xl font-extrabold">لوحة الإدارة - التسجيلات</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/scan" className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:bg-gold-light">
              <span aria-hidden>📷</span> مسح QR
            </Link>
            <Link href="/" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
              الاستمارة
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-xl bg-rose px-4 py-2 text-sm font-bold hover:bg-rose/90">
                خروج
              </button>
            </form>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-l from-rose via-gold to-leaf" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard searchParams={searchParams as Promise<Search>} />
        </Suspense>
      </main>
    </>
  );
}
