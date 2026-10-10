"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitRegistration, type SubmitState } from "@/app/actions";
import { BLOOD_TYPES, EVENT, weddingOptions, type PaymentMethod } from "@/lib/constants";
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

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function RegistrationForm() {
  // Re-mounting the inner form (via key) resets useActionState after a successful submission.
  const [formKey, setFormKey] = useState(0);
  return <RegistrationFormInner key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}

function RegistrationFormInner({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitRegistration, { status: "idle" });
  const [method, setMethod] = useState<PaymentMethod>("baridimob");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
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

      {/* الدفع */}
      <section className="space-y-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-sm text-navy">2</span>
          8- طريقة الدفع
          <span className="mr-auto rounded-full bg-leaf-light px-3 py-1 text-sm font-bold text-leaf">{EVENT.feeLabel}</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="طريقة الدفع">
          {(
            [
              { id: "baridimob", title: "بريدي موب", desc: "تحويل عبر BaridiMob ثم رفع وصل العملية", icon: "📲" },
              { id: "dahabia", title: "البطاقة الذهبية / CIB", desc: "دفع إلكتروني مباشر بالبطاقة", icon: "💳" },
            ] as const
          ).map((opt) => {
            const selected = method === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                  selected ? "border-rose bg-rose-pale shadow-md shadow-rose/10" : "border-navy/10 bg-white hover:border-rose-light"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={opt.id}
                  checked={selected}
                  onChange={() => setMethod(opt.id)}
                  className="mt-1 h-4 w-4 accent-rose"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-extrabold text-navy">
                    <span aria-hidden>{opt.icon}</span>
                    {opt.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{opt.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.paymentMethod ? <p className="field-error">{errors.paymentMethod}</p> : null}

        {method === "baridimob" ? (
          <div className="space-y-4 fade-up">
            <div className="rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm text-white/80">الرقم الخاص بالدفع عن بعد (بريدي موب)</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="ltr font-mono text-lg font-bold tracking-wider sm:text-xl break-all">{EVENT.baridimobNumber}</span>
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
        ) : (
          <div className="space-y-4 fade-up">
            <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-navy to-navy-soft p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gold-light">البطاقة الذهبية / CIB</span>
                <span className="text-xs text-white/70">المبلغ: {EVENT.feeLabel}</span>
              </div>
              <div className="mt-4 ltr font-mono text-xl tracking-widest text-white/90">{cardNumber || "•••• •••• •••• ••••"}</div>
            </div>

            <Field label="اسم حامل البطاقة" name="cardHolder" error={errors.cardHolder}>
              <input
                id="cardHolder"
                name="cardHolder"
                type="text"
                autoComplete="cc-name"
                placeholder="الاسم كما هو مكتوب على البطاقة"
                className="field-input"
                aria-invalid={!!errors.cardHolder}
              />
            </Field>

            <Field label="رقم البطاقة" name="cardNumber" error={errors.cardNumber}>
              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="6280 XXXX XXXX XXXX"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="field-input ltr font-mono"
                aria-invalid={!!errors.cardNumber}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الانتهاء" name="cardExpiry" error={errors.cardExpiry}>
                <input
                  id="cardExpiry"
                  name="cardExpiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="field-input ltr font-mono"
                  aria-invalid={!!errors.cardExpiry}
                />
              </Field>
              <Field label="رمز الأمان CVV" name="cardCvv" error={errors.cardCvv}>
                <input
                  id="cardCvv"
                  name="cardCvv"
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  placeholder="•••"
                  className="field-input ltr font-mono"
                  aria-invalid={!!errors.cardCvv}
                />
              </Field>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted">
              <span aria-hidden>🔒</span>
              معلومات البطاقة تُستخدم لإتمام عملية الدفع فقط ولا يتم تخزينها.
            </p>
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-rose-pale px-4 py-3 text-sm font-bold text-navy">
        {EVENT.confirmNote}
        {method === "baridimob" ? " - سيتم التحقق من الوصل من طرف المنظمين." : ""}
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            {method === "dahabia" ? "جاري معالجة الدفع..." : "جاري الإرسال..."}
          </>
        ) : method === "dahabia" ? (
          `ادفع ${EVENT.feeLabel} وأكّد التسجيل`
        ) : (
          "إرسال التسجيل"
        )}
      </button>
    </form>
    </div>
  );
}
