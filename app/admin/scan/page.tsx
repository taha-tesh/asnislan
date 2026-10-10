import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { EVENT } from "@/lib/constants";
import { getRegistrationByToken } from "@/lib/registrations";
import { parseBadgeToken } from "@/lib/badge";
import { logout, type LookupResult } from "../actions";
import { QrScanner } from "@/components/admin/QrScanner";

type Search = { c?: string };

async function Scanner({ searchParams }: { searchParams: Promise<Search> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { c } = await searchParams;
  let initial: LookupResult | null = null;
  if (c) {
    const token = parseBadgeToken(c);
    const registration = token ? await getRegistrationByToken(token) : null;
    initial = registration ? { ok: true, registration } : { ok: false, message: "لم يتم العثور على تسجيل مطابق لهذا الرمز" };
  }
  return <QrScanner initial={initial} />;
}

export default function AdminScanPage({ searchParams }: PageProps<"/admin/scan">) {
  return (
    <>
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-gold-light">{EVENT.edition}</p>
            <h1 className="text-xl font-extrabold">ماسح بطاقات المشاركين</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
              لوحة الإدارة
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/70" />}>
          <Scanner searchParams={searchParams as Promise<Search>} />
        </Suspense>
      </main>
    </>
  );
}
