"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitRegistration, type SubmitState } from "@/app/actions";
import { BLOOD_TYPES, EVENT, weddingOptions } from "@/lib/constants";
import { SuccessCard } from "./SuccessCard";

const WEDDING_OPTIONS = weddingOptions();

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25 transition"
    >
      {copied ? "تم النسخ ✓" : "نسخ"}
    </button>
  );
}

export function RegistrationForm() {
  // Re-mounting the inner form (via key) resets useActionState after a successful submission.
  const [formKey, setFormKey] = useState(0);
  return <RegistrationFormInner key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}

function RegistrationFormInner({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitRegistration, { status: "idle" });
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);

  const errors = state.status === "error" ? state.errors : {};

  // The upper bound depends on "today", so it is applied on the client after mount
  // to keep the page prerenderable.
  useEffect(() => {
    const maxBirth = new Date();
    maxBirth.setFullYear(maxBirth.getFullYear() - 16);
    if (birthRef.current) birthRef.current.max = maxBirth.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (state.status !== "idle") topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={topRef}>
        <SuccessCard state={state} onReset={onReset} />
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-4">
      <form action={action} noValidate className="space-y-8">
        <input type="hidden" name="paymentMethod" value="baridimob" />

        {state.status === "error" && state.message ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">
            {state.message}
          </div>
        ) : null}

        {/* المعلومات الشخصية */}
        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-rose text-sm text-white">1</span>
            المعلومات الشخصية
          </h2>

          <Field label="1- الاسم الكامل (مع اسم الجد)" name="fullName" error={errors.fullName}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="مثال: محمد بن أحمد بن علي"
              className="field-input"
              aria-invalid={!!errors.fullName}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="2- تاريخ الميلاد" name="birthDate" error={errors.birthDate}>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                required
                ref={birthRef}
                min="1940-01-01"
                className="field-input"
                aria-invalid={!!errors.birthDate}
              />
            </Field>

            <Field label="3- القصر" name="residence" error={errors.residence}>
              <input
                id="residence"
                name="residence"
                type="text"
                required
                placeholder="اسم القصر"
                className="field-input"
                aria-invalid={!!errors.residence}
              />
            </Field>

            <Field label="4- المهنة" name="profession" error={errors.profession}>
              <input
                id="profession"
                name="profession"
                type="text"
                required
                placeholder="المهنة"
                className="field-input"
                aria-invalid={!!errors.profession}
              />
            </Field>

            <Field
              label="5- تاريخ الزواج (الشهر والسنة)"
              name="weddingDate"
              error={errors.weddingDate}
              hint="بين ديسمبر 2026 ونوفمبر 2027"
            >
              <select id="weddingDate" name="weddingDate" required defaultValue="" className="field-input" aria-invalid={!!errors.weddingDate}>
                <option value="" disabled>
                  اختر الشهر والسنة
                </option>
                {WEDDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="6- رقم الهاتف (الواتساب)" name="phone" error={errors.phone} hint="مثال: 0550123456">
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                placeholder="05XXXXXXXX"
                className="field-input"
                aria-invalid={!!errors.phone}
              />
            </Field>

            <Field label="7- فصيلة الدم" name="bloodType" error={errors.bloodType}>
              <select id="bloodType" name="bloodType" required defaultValue="" className="field-input" aria-invalid={!!errors.bloodType}>
                <option value="" disabled>
                  اختر فصيلة الدم
                </option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* الدفع عبر بريدي موب فقط */}
        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-sm text-navy">2</span>
            8- الدفع عبر بريدي موب
            <span className="mr-auto rounded-full bg-leaf-light px-3 py-1 text-sm font-bold text-leaf">{EVENT.feeLabel}</span>
          </h2>

          <div className="space-y-4">
            <div className="rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm text-white/80">الرقم الخاص بالدفع عن بعد (بريدي موب)</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="ltr break-all font-mono text-lg font-bold tracking-wider sm:text-xl">{EVENT.baridimobNumber}</span>
                <CopyButton text={EVENT.baridimobNumber} />
              </div>
              <p className="mt-3 text-xs text-white/70">
                قم بتحويل مبلغ <span className="font-bold text-gold-light">{EVENT.feeLabel}</span> إلى الرقم أعلاه ثم أرفق صورة الوصل.
              </p>
            </div>

            <Field label="وصل التحويل" name="receipt" error={errors.receipt} hint="صورة (JPG/PNG) أو PDF - الحجم الأقصى 5 ميغابايت">
              <label
                htmlFor="receipt"
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition hover:bg-rose-pale ${
                  errors.receipt ? "border-red-400" : "border-rose-light"
                }`}
              >
                <span className="text-3xl" aria-hidden>
                  📎
                </span>
                <span className="text-sm font-bold text-navy">{receiptName ?? "اضغط هنا لاختيار ملف الوصل"}</span>
                <span className="text-xs text-muted">{receiptName ? "اضغط لتغيير الملف" : "أو التقط صورة من الهاتف"}</span>
                <input
                  id="receipt"
                  name="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            </Field>
          </div>
        </section>

        <div className="rounded-2xl bg-rose-pale px-4 py-3 text-sm font-bold text-navy">
          {EVENT.confirmNote} - سيتم التحقق من الوصل من طرف المنظمين.
        </div>

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              جاري الإرسال...
            </>
          ) : (
            "إرسال التسجيل"
          )}
        </button>
      </form>
    </div>
  );
}
