"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { lookupBadge, type LookupResult } from "@/app/admin/actions";
import { ScanResultCard } from "./ScanResultCard";

const READER_ID = "asnislan-qr-reader";

export function QrScanner({ initial }: { initial: LookupResult | null }) {
  const [result, setResult] = useState<LookupResult | null>(initial);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [pending, startTransition] = useTransition();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<AudioContext | null>(null);

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

  function lookup(text: string) {
    startTransition(async () => {
      const r = await lookupBadge(text);
      setResult(r);
    });
  }

  async function stopScanner() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {}
    }
  }

  async function startScanner() {
    setCameraError(null);
    setResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(260, w * 0.8), height: Math.min(260, h * 0.8) }) },
        (decoded) => {
          beep();
          void stopScanner();
          lookup(decoded);
        },
        () => {},
      );
    } catch (e) {
      console.error(e);
      scannerRef.current = null;
      setScanning(false);
      setCameraError("تعذر تشغيل الكاميرا. تأكد من منح الإذن للكاميرا واستخدام اتصال آمن (HTTPS)، أو أدخل الرمز يدوياً.");
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-navy">مسح رمز QR</h2>
          {scanning ? (
            <button type="button" onClick={stopScanner} className="btn-ghost">
              إيقاف الكاميرا
            </button>
          ) : (
            <button type="button" onClick={startScanner} className="btn-primary">
              <span aria-hidden>📷</span> تشغيل الكاميرا
            </button>
          )}
        </div>

        <div
          id={READER_ID}
          className={`mx-auto mt-4 w-full max-w-md overflow-hidden rounded-2xl bg-navy-deep ${scanning ? "min-h-[280px]" : "hidden"}`}
        />
        {!scanning ? (
          <p className="mt-4 rounded-2xl bg-rose-pale px-4 py-8 text-center text-sm text-muted">
            اضغط على «تشغيل الكاميرا» ثم وجّهها نحو رمز QR الموجود على بطاقة المشارك.
          </p>
        ) : null}

        {cameraError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {cameraError}
          </p>
        ) : null}

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) lookup(manual);
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

      {pending ? <div className="h-40 animate-pulse rounded-2xl bg-white/70" /> : null}

      {!pending && result ? (
        result.ok ? (
          <ScanResultCard r={result.registration} />
        ) : (
          <div className="fade-up flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700" role="alert">
            <span className="text-3xl" aria-hidden>
              ❌
            </span>
            <p className="font-bold">{result.message}</p>
          </div>
        )
      ) : null}

      {result && !scanning ? (
        <div className="text-center">
          <button type="button" onClick={startScanner} className="btn-primary">
            <span aria-hidden>📷</span> مسح بطاقة أخرى
          </button>
        </div>
      ) : null}
    </div>
  );
}
