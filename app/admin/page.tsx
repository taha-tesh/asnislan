import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { EVENT, PAYMENT_METHODS, PAYMENT_STATUS, type PaymentMethod, type PaymentStatus } from "@/lib/constants";
import { getStats, listRegistrations } from "@/lib/registrations";
import { logout } from "./actions";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminRegisterForm } from "@/components/admin/AdminRegisterForm";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { StatCard } from "@/components/admin/StatCard";

type Search = { q?: string; status?: string; method?: string; attendance?: string };

function cleanFilters(sp: Search): {
  q: string;
  status: PaymentStatus | "";
  method: PaymentMethod | "";
  attendance: "present" | "absent" | "";
} {
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = (sp.status ?? "") in PAYMENT_STATUS ? (sp.status as PaymentStatus) : "";
  const method = (sp.method ?? "") in PAYMENT_METHODS ? (sp.method as PaymentMethod) : "";
  const attendance =
    sp.attendance === "present" || sp.attendance === "absent" ? sp.attendance : "";
  return { q, status, method, attendance };
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي التسجيلات" value={stats.total} tone="navy" />
        <StatCard label="الحضور" value={stats.present} tone="leaf" />
        <StatCard label="مدفوع" value={stats.paid} tone="leaf" />
        <StatCard label="قيد التحقق" value={stats.pending} tone="gold" />
        <StatCard label="مرفوض" value={stats.rejected} tone="rose" />
        <StatCard label="بريدي موب" value={stats.baridimob} tone="navy" />
        <StatCard label="مدفوعات نقدية" value={`${stats.cashRevenue.toLocaleString("ar-DZ")} دج`} tone="gold" />
        <StatCard label="إجمالي المحصّل" value={`${stats.revenue.toLocaleString("ar-DZ")} دج`} tone="leaf" />
      </div>

      <section className="card mt-4 p-3 sm:mt-6 sm:p-6">
        <AdminFilters
          q={filters.q}
          status={filters.status}
          method={filters.method}
          attendance={filters.attendance}
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            عدد النتائج: <span className="font-extrabold text-navy">{rows.length}</span>
            {" · "}
            حضور: <span className="font-extrabold text-leaf">{stats.present}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminRegisterForm />
            <a href={`/admin/export${exportQuery ? `?${exportQuery}` : ""}`} className="btn-gold" download>
              <span aria-hidden>📊</span> تصدير إلى Excel
            </a>
          </div>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
      <div className="h-96 animate-pulse rounded-2xl bg-white/70" />
    </div>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div>
            <p className="text-xs text-gold-light">{EVENT.edition}</p>
            <h1 className="text-lg font-extrabold sm:text-xl">لوحة الإدارة - التسجيلات</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/scan" className="rounded-xl bg-gold px-3 py-2 text-xs font-bold text-navy hover:bg-gold-light sm:px-4 sm:text-sm">
              <span aria-hidden>📷</span> مسح QR
            </Link>
            <Link href="/" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 sm:px-4 sm:text-sm">
              الاستمارة
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-xl bg-rose px-3 py-2 text-xs font-bold hover:bg-rose/90 sm:px-4 sm:text-sm">
                خروج
              </button>
            </form>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-l from-rose via-gold to-leaf" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard searchParams={searchParams as Promise<Search>} />
        </Suspense>
      </main>
    </>
  );
}
