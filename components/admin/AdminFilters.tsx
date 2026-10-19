"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/constants";

const DEBOUNCE_MS = 300;

type Props = {
  q: string;
  status: string;
  method: string;
  attendance: string;
};

export function AdminFilters({ q, status, method, attendance }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local search box in sync when navigating back/forward or clearing filters externally.
  useEffect(() => {
    setQuery(q);
  }, [q]);

  function apply(patch: { q?: string; status?: string; method?: string; attendance?: string }) {
    const values = {
      q: patch.q ?? query,
      status: patch.status ?? searchParams.get("status") ?? "",
      method: patch.method ?? searchParams.get("method") ?? "",
      attendance: patch.attendance ?? searchParams.get("attendance") ?? "",
    };

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      const trimmed = value.trim();
      if (trimmed) params.set(key, trimmed);
    }

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apply({ q: value });
    }, DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={`grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 ${pending ? "opacity-80" : ""}`}>
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="بحث بالاسم، الهاتف، القصر..."
        className="field-input col-span-full lg:col-span-1"
        autoComplete="off"
      />
      <select
        value={status}
        onChange={(e) => apply({ status: e.target.value })}
        className="field-input"
        aria-label="حالة الدفع"
      >
        <option value="">كل الحالات</option>
        {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select
        value={method}
        onChange={(e) => apply({ method: e.target.value })}
        className="field-input"
        aria-label="طريقة الدفع"
      >
        <option value="">كل طرق الدفع</option>
        {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select
        value={attendance}
        onChange={(e) => apply({ attendance: e.target.value })}
        className="field-input"
        aria-label="الحضور"
      >
        <option value="">كل الحضور</option>
        <option value="present">حاضر</option>
        <option value="absent">غائب</option>
      </select>
    </div>
  );
}
