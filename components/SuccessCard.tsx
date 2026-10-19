"use client";

import type { SubmitState } from "@/app/actions";
import { EVENT } from "@/lib/constants";
import { BadgeActions } from "./BadgeActions";

export function SuccessCard({ state, onReset }: { state: Extract<SubmitState, { status: "success" }>; onReset: () => void }) {
  return (
    <div className="fade-up space-y-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold-light text-4xl">⏳</div>
      <div>
        <h2 className="text-2xl font-extrabold text-navy">تم استلام طلب التسجيل</h2>
        <p className="mt-2 text-muted">
          شكراً لك <span className="font-bold text-navy">{state.fullName}</span>، تم تسجيل طلبك في {EVENT.title} - {EVENT.edition}.
        </p>
      </div>

      <dl className="mx-auto grid max-w-md gap-3 rounded-2xl bg-rose-pale p-4 text-right text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">رقم التسجيل</dt>
          <dd className="ltr font-extrabold text-navy">#{state.id}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">تاريخ الزواج</dt>
          <dd className="font-bold text-navy">{state.weddingLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">طريقة الدفع</dt>
          <dd className="font-bold text-navy">بريدي موب</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">حالة الدفع</dt>
          <dd className="font-bold text-gold">قيد التحقق</dd>
        </div>
      </dl>

      <p className="text-sm text-muted">سيقوم المنظمون بالتحقق من وصل التحويل وتأكيد تسجيلك عبر الواتساب.</p>

      <section className="space-y-3 border-t border-navy/10 pt-6 text-right">
        <h3 className="text-center text-lg font-extrabold text-navy">بطاقة المشارك</h3>
        <p className="text-center text-sm text-muted">
          حمّل بطاقتك واحتفظ بها على هاتفك أو اطبعها، وسيتم مسح رمز QR عند الدخول إلى الدورة.
        </p>
        <BadgeActions data={{ id: state.id, fullName: state.fullName, birthDate: state.birthDate, badgeToken: state.badgeToken }} />
      </section>

      <button type="button" onClick={onReset} className="btn-ghost">
        تسجيل مشترك آخر
      </button>
    </div>
  );
}
