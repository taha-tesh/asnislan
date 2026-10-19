"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { adminRegisterWalkIn, type AdminRegisterState } from "@/app/admin/actions";
import { BLOOD_TYPES, EVENT, weddingOptions } from "@/lib/constants";
import { ModalPortal } from "./ModalPortal";

const WEDDING_OPTIONS = weddingOptions();

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminRegisterForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AdminRegisterState, FormData>(adminRegisterWalkIn, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errors = state.status === "error" ? state.errors : {};

  useEffect(() => {
    const maxBirth = new Date();
    maxBirth.setFullYear(maxBirth.getFullYear() - 16);
    if (birthRef.current) birthRef.current.max = maxBirth.toISOString().slice(0, 10);
  }, [open]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, pending]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <span aria-hidden>➕</span> تسجيل يدوي
      </button>

      {open ? (
        <ModalPortal>
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-navy-deep/70 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fade-up my-0 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:my-4 sm:max-h-[min(90dvh,880px)] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-navy/10 px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-extrabold text-navy">
                  تسجيل يدوي (حضور نقدي)
                </h2>
                <p className="mt-1 text-sm text-muted">
                  يُسجَّل الدفع نقداً ({EVENT.feeLabel}) ويُعلَّم حاضراً تلقائياً.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-bold text-navy hover:bg-navy/10"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form ref={formRef} action={action} noValidate className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
                {state.status === "success" ? (
                  <p className="mb-4 rounded-xl bg-leaf-light px-4 py-3 text-sm font-bold text-leaf" role="status">
                    تم تسجيل «{state.fullName}» برقم #{state.id} · دفع نقدي · حاضر
                  </p>
                ) : null}

                {state.status === "error" && state.message ? (
                  <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">
                    {state.message}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="paymentMethod" value="baridimob" />

                  <div className="sm:col-span-2">
                    <Field label="الاسم الكامل (مع اسم الجد)" name="fullName" error={errors.fullName}>
                      <input id="fullName" name="fullName" type="text" required className="field-input" aria-invalid={!!errors.fullName} />
                    </Field>
                  </div>

                  <Field label="تاريخ الميلاد" name="birthDate" error={errors.birthDate}>
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

                  <Field label="القصر" name="residence" error={errors.residence}>
                    <input id="residence" name="residence" type="text" required className="field-input" aria-invalid={!!errors.residence} />
                  </Field>

                  <Field label="المهنة" name="profession" error={errors.profession}>
                    <input id="profession" name="profession" type="text" required className="field-input" aria-invalid={!!errors.profession} />
                  </Field>

                  <Field label="تاريخ الزواج" name="weddingDate" error={errors.weddingDate}>
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

                  <Field label="رقم الهاتف (الواتساب)" name="phone" error={errors.phone}>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      placeholder="05XXXXXXXX"
                      className="field-input"
                      aria-invalid={!!errors.phone}
                    />
                  </Field>

                  <Field label="فصيلة الدم" name="bloodType" error={errors.bloodType}>
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
              </div>

              <div className="shrink-0 border-t border-navy/10 bg-white px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-leaf-light/50 px-4 py-3 text-sm">
                  <p className="font-bold text-navy">
                    الدفع: <span className="text-leaf">نقداً {EVENT.feeLabel}</span> · يُسجَّل حاضراً فوراً
                  </p>
                  <div className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => setOpen(false)} className="btn-ghost">
                      إلغاء
                    </button>
                    <button type="submit" disabled={pending} className="btn-primary">
                      {pending ? "جاري الحفظ..." : "تسجيل الحاضر"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
