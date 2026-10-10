import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "@/components/admin/LoginForm";

async function Gate() {
  if (await isAdmin()) redirect("/admin");
  return <LoginForm />;
}

export default function AdminLoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-start px-4 py-10">
        <section className="card w-full px-6 py-8">
          <h1 className="text-center text-2xl font-extrabold text-navy">لوحة الإدارة</h1>
          <p className="mt-1 text-center text-sm text-muted">أدخل كلمة المرور للوصول إلى التسجيلات</p>
          <div className="mt-6">
            <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-rose-pale" />}>
              <Gate />
            </Suspense>
          </div>
        </section>
      </main>
    </>
  );
}
