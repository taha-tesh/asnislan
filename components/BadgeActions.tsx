"use client";

import { useRef, useState } from "react";
import { BADGE_H, BADGE_W, ParticipantBadge, type BadgeData } from "./ParticipantBadge";
import { WHATSAPP_GROUP_URL } from "@/lib/badge";

export function BadgeActions({ data }: { data: BadgeData }) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    const node = badgeRef.current;
    if (!node) return;
    setBusy(true);
    setError(null);
    try {
      // Wait for the QR image (if still loading) and fonts before rasterising.
      await document.fonts?.ready;
      const img = node.querySelector("img");
      if (img && !img.complete) await new Promise((r) => img.addEventListener("load", r, { once: true }));

      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const png = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        width: BADGE_W,
        height: BADGE_H,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [105, 148] });
      pdf.addImage(png, "PNG", 0, 0, 105, 148, undefined, "FAST");
      pdf.save(`asnislan17-badge-${String(data.id).padStart(4, "0")}.pdf`);
    } catch (e) {
      console.error(e);
      setError("تعذر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center overflow-x-auto py-2">
        <ParticipantBadge ref={badgeRef} data={data} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={downloadPdf} disabled={busy} className="btn-primary">
          {busy ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              جاري إنشاء الملف...
            </>
          ) : (
            <>
              <span aria-hidden>⬇️</span> تحميل البطاقة PDF
            </>
          )}
        </button>

        <a
          href={WHATSAPP_GROUP_URL || "#"}
          target="_blank"
          rel="noopener"
          aria-disabled={!WHATSAPP_GROUP_URL}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1ebe5b] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 aria-disabled:pointer-events-none aria-disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
            <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 15 3.7 13.5 3.7 12c0-4.6 3.7-8.3 8.3-8.3s8.3 3.7 8.3 8.3-3.7 8.2-8.3 8.2z" />
          </svg>
          الانضمام إلى مجموعة الواتساب
        </a>
      </div>

      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3 text-center text-sm font-bold text-navy">
        الانضمام إلى مجموعة الواتساب إلزامي لمتابعة تفاصيل الدورة ومواعيدها.
      </p>
    </div>
  );
}
