import { RegistrationForm } from "@/components/RegistrationForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { EVENT } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        <section className="card overflow-hidden">
          <div className="bg-gradient-to-l from-navy via-navy-soft to-navy px-5 py-6 text-center text-white sm:px-8">
            <p className="text-sm font-bold text-gold-light">{EVENT.edition}</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{EVENT.title}</h1>
            <p className="mt-2 text-sm text-white/80">{EVENT.subtitle}</p>
          </div>

          <div className="space-y-4 px-5 py-6 sm:px-8">
            <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
              <span aria-hidden className="text-lg">
                📝
              </span>
              <p>
                <span className="font-extrabold text-navy">ملاحظة: </span>
                {EVENT.note}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-rose-pale px-4 py-3">
                <p className="text-xs text-muted">الرقم الخاص بالدفع عن بعد (بريدي موب)</p>
                <p className="ltr mt-1 font-mono text-base font-extrabold text-navy break-all">{EVENT.baridimobNumber}</p>
              </div>
              <div className="rounded-2xl bg-leaf-light/60 px-4 py-3">
                <p className="text-xs text-muted">اشتراك الدورة</p>
                <p className="mt-1 text-xl font-extrabold text-leaf">{EVENT.feeLabel}</p>
                <p className="text-xs text-navy/70">{EVENT.confirmNote}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card mt-6 px-5 py-6 sm:px-8 sm:py-8">
          <RegistrationForm />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
