"use client";

import { useEffect, useRef, useState } from "react";
import { ParticipantBadge, type BadgeData } from "@/components/ParticipantBadge";
import type { Registration } from "@/lib/registrations";
import { ModalPortal } from "./ModalPortal";

function toBadge(r: Registration): BadgeData {
  return { id: r.id, fullName: r.full_name, birthDate: r.birth_date, badgeToken: r.badge_token };
}

export function BadgePrintDialog({
  rows,
  onClose,
  autoPrint = false,
}: {
  rows: Registration[];
  onClose: () => void;
  autoPrint?: boolean;
}) {
  const printed = useRef(false);
  const [pagesEl, setPagesEl] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      document.body.classList.remove("printing-badges");
    };
  }, [onClose]);

  useEffect(() => {
    if (!pagesEl) return;
    let cancelled = false;
    setReady(false);

    async function waitForCards() {
      await document.fonts?.ready;
      const start = Date.now();
      while (!cancelled && Date.now() - start < 10000) {
        const imgs = [...pagesEl.querySelectorAll("img")];
        if (imgs.length >= rows.length && imgs.every((img) => img.complete && img.naturalWidth > 0)) break;
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!cancelled) setReady(true);
    }

    void waitForCards();
    return () => {
      cancelled = true;
    };
  }, [pagesEl, rows]);

  function printCards() {
    document.body.classList.add("printing-badges");
    const cleanup = () => {
      document.body.classList.remove("printing-badges");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  useEffect(() => {
    if (!ready || !autoPrint || printed.current) return;
    printed.current = true;
    printCards();
  }, [ready, autoPrint]);

  return (
    <ModalPortal>
      <div className="badge-print-root fixed inset-0 z-[110] flex flex-col bg-navy-deep/70">
        <div className="no-print flex shrink-0 flex-wrap items-center justify-between gap-3 bg-navy-deep px-4 py-3 text-white">
          <div>
            <p className="text-sm font-extrabold">بطاقات المشاركين · ورق A6</p>
            <p className="text-xs text-white/70">
              {rows.length === 1 ? "بطاقة واحدة" : `${rows.length} بطاقات`} · كل بطاقة في صفحة
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
              إغلاق
            </button>
            <button type="button" onClick={printCards} disabled={!ready} className="btn-gold disabled:opacity-60">
              {ready ? "طباعة" : "جاري تجهيز البطاقات..."}
            </button>
          </div>
        </div>

        <div ref={setPagesEl} className="badge-print-pages min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {rows.map((r) => (
            <div key={r.id} className="badge-sheet">
              <div className="badge-scale">
                <ParticipantBadge data={toBadge(r)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalPortal>
  );
}
