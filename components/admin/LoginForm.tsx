"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="field-label">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input ltr"
          aria-invalid={!!state.error}
        />
        {state.error ? (
          <p className="field-error" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "جاري التحقق..." : "دخول"}
      </button>
    </form>
  );
}
