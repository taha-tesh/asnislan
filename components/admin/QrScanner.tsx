"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { lookupBadge, type LookupResult } from "@/app/admin/actions";
import { parseBadgeToken } from "@/lib/badge";
import { ModalPortal } from "./ModalPortal";
import { ScanResultCard } from "./ScanResultCard";

const READER_ID = "asnislan-qr-reader";
const POPUP_MS = 5000;
const RELEASE_MS = 900;

export function QrScanner({ initial, initialCode }: { initial: LookupResult | null; initialCode?: string }) {
  const [result, setResult] = useState<LookupResult | null>(initial);
  const [popupOpen, setPopupOpen] = useState(Boolean(initial));
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [pending, startTransition] = useTransition();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<AudioContext | null>(null);
  const popupOpenRef = useRef(Boolean(initial));
  const holdTokenRef = useRef<string | null>(initialCode ? parseBadgeToken(initialCode) ?? initialCode : null);
  const lastSeenRef = useRef(0);

  function beep() {
    try {
      const ctx = (beepRef.current ??= new AudioContext());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  const closePopup = useCallback(() => {
    popupOpenRef.current = false;
    setPopupOpen(false);
  }, []);

  function showLookup(text: string) {
    popupOpenRef.current = true;
    setPopupOpen(true);
    setResult(null);
    startTransition(async () => {
      const found = await lookupBadge(text);
      setResult(found);
    });
  }

  function onDecoded(decoded: string) {
    const token = parseBadgeToken(decoded) ?? decoded.trim();
    lastSeenRef.current = Date.now();
    if (popupOpenRef.current || holdTokenRef.current === token) return;
    holdTokenRef.current = token;
    beep();
    showLookup(decoded);
  }

  const sessionRef = useRef(0);

  const stopScanner = useCallback(async () => {
    sessionRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    setStarting(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {}
  }, []);

  const startScanner = useCallback(async () => {
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setCameraError(null);
    setStarting(true);
    setScanning(false);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (sessionRef.current !== session) return;
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(260, w * 0.8), height: Math.min(260, h * 0.8) }) },
        (decoded) => onDecoded(decoded),
        () => {},
      );
      if (sessionRef.current !== session) {
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch {}
        if (scannerRef.current === scanner) scannerRef.current = null;
        return;
      }
      setScanning(true);
    } catch (error) {
      console.error(error);
      if (sessionRef.current === session) {
        scannerRef.current = null;
        setScanning(false);
        setCameraError("تعذر تشغيل الكاميرا. تأكد من منح الإذن للكاميرا واستخدام اتصال آمن (HTTPS)، أو أدخل الرمز يدوياً.");
      }
    } finally {
      if (sessionRef.current === session) setStarting(false);
    }
    // onDecoded only reads refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void startScanner();
    const release = setInterval(() => {
      if (popupOpenRef.current) return;
      if (holdTokenRef.current && Date.now() - lastSeenRef.current > RELEASE_MS) {
        holdTokenRef.current = null;
      }
    }, 200);

    return () => {
      clearInterval(release);
      void stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-navy">مسح رمز QR</h2>
          {scanning ? (
            <button type="button" onClick={() => void stopScanner()} className="btn-ghost">
              إيقاف الكاميرا
            </button>
          ) : (
            <button type="button" onClick={() => void startScanner()} className="btn-primary" disabled={starting}>
              <span aria-hidden>📷</span> {starting ? "جاري التشغيل..." : "تشغيل الكاميرا"}
            </button>
          )}
        </div>

        <div
          id={READER_ID}
          className={`mx-auto mt-4 w-full max-w-md overflow-hidden rounded-2xl bg-navy-deep ${scanning || starting ? "min-h-[280px]" : "hidden"}`}
        />
        {!scanning && !starting ? (
          <p className="mt-4 rounded-2xl bg-rose-pale px-4 py-8 text-center text-sm text-muted">
            الكاميرا متوقفة. شغّلها لمسح بطاقة أخرى.
          </p>
        ) : null}
        {starting ? <p className="mt-3 text-center text-sm text-muted">جاري تشغيل الكاميرا...</p> : null}

        {cameraError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {cameraError}
          </p>
        ) : null}

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const text = manual.trim();
            if (!text) return;
            const token = parseBadgeToken(text);
            if (token) holdTokenRef.current = token;
            beep();
            showLookup(text);
          }}
        >
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="أو ألصق رابط/رمز البطاقة هنا"
            className="field-input ltr flex-1 font-mono text-sm"
          />
          <button type="submit" disabled={pending || !manual.trim()} className="btn-gold">
            بحث
          </button>
        </form>
      </div>

      {popupOpen ? (
        <ScanResultPopup pending={pending && !result} result={result} onClose={closePopup} />
      ) : null}
    </div>
  );
}

function ScanResultPopup({
  pending,
  result,
  onClose,
}: {
  pending: boolean;
  result: LookupResult | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (pending || !result) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / POPUP_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        clearInterval(timer);
        onClose();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pending, result, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const secondsLeft = Math.max(1, Math.ceil((1 - progress) * (POPUP_MS / 1000)));

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-deep/70 p-0 sm:items-center sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        >
          <div className="sticky top-0 z-10 bg-white/95 px-4 pt-3 backdrop-blur">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-navy/10">
              <div className="h-full bg-gold transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex items-center justify-between gap-3 pb-2">
              <p id={titleId} className="text-xs font-bold text-muted">
                {pending || !result
                  ? "جاري التحقق من البطاقة..."
                  : `تُغلق خلال ${secondsLeft} ${secondsLeft === 1 ? "ثانية" : "ثوانٍ"} لمسح البطاقة التالية`}
              </p>
              <button type="button" onClick={onClose} className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-bold text-navy hover:bg-navy/10">
                إغلاق
              </button>
            </div>
          </div>
          <div className="px-3 pb-4 sm:px-4">
            {pending || !result ? (
              <div className="h-48 animate-pulse rounded-2xl bg-rose-pale" />
            ) : result.ok ? (
              <ScanResultCard r={result.registration} firstTime={result.firstTime} />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-red-700" role="alert">
                <span className="text-3xl" aria-hidden>
                  ❌
                </span>
                <p className="font-bold">{result.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
