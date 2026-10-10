"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  registrationId: number;
  openUrl: string;
  downloadUrl: string;
  mimeType: string;
  fileName: string;
};

function base64ToUint8Array(base64: string) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function ReceiptPreview({ registrationId, openUrl, downloadUrl, mimeType, fileName }: Props) {
  const routeParams = useParams<{ id: string }>();
  const resolvedId = Number.isInteger(registrationId) && registrationId > 0 ? registrationId : Number(routeParams?.id);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | null>(null);
  const [resolvedOpen, setResolvedOpen] = useState(openUrl);
  const [resolvedDownload, setResolvedDownload] = useState(downloadUrl);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setPreviewUrl(null);
      setPreviewKind(null);

      if (!Number.isInteger(resolvedId) || resolvedId <= 0) {
        setError("تعذر تحديد رقم التسجيل.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/admin/receipt/${resolvedId}/data`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          base64?: string;
          mimeType?: string;
          sizeBytes?: number;
          openUrl?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!json.base64 || !json.sizeBytes) throw new Error(json.error || "Empty file");

        if (json.openUrl) {
          setResolvedOpen(json.openUrl);
          setResolvedDownload(json.openUrl);
        }

        const type = json.mimeType || mimeType;
        const bytes = base64ToUint8Array(json.base64);
        if (!bytes.byteLength) throw new Error("Empty file");

        // Verify PDF magic header when claiming application/pdf
        const isPdf =
          type === "application/pdf" ||
          fileName.toLowerCase().endsWith(".pdf") ||
          (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46); // %PDF
        const isImage = type.startsWith("image/");

        if (!isPdf && !isImage) {
          setError("نوع الملف غير قابل للعرض داخل الصفحة. استخدم زر التحميل.");
          setLoading(false);
          return;
        }

        if (isPdf) {
          const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
          if (head !== "%PDF") {
            throw new Error(`Not a PDF (header: ${JSON.stringify(head)})`);
          }
        }

        const blob = new Blob([bytes], { type: isPdf ? "application/pdf" : type });
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setPreviewKind(isPdf ? "pdf" : "image");
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("تعذر تحميل أو عرض الملف. جرّب فتحه أو تحميله مباشرة.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedId, mimeType, fileName]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <a href={resolvedOpen} target="_blank" rel="noopener" className="btn-ghost">
          فتح في تبويب جديد
        </a>
        <a href={resolvedDownload} target="_blank" rel="noopener" className="btn-gold">
          <span aria-hidden>⬇️</span> تحميل الملف
        </a>
      </div>

      {loading ? <div className="h-[50vh] animate-pulse rounded-2xl bg-white/10" /> : null}

      {error ? (
        <p className="rounded-xl bg-rose-pale px-4 py-6 text-center text-sm text-navy" role="alert">
          {error}{" "}
          <a href={resolvedDownload} className="font-bold underline" target="_blank" rel="noopener">
            تحميل
          </a>
        </p>
      ) : null}

      {previewUrl && previewKind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={fileName}
          className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg shadow-2xl"
        />
      ) : null}

      {previewUrl && previewKind === "pdf" ? (
        <iframe
          title={fileName}
          src={previewUrl}
          className="h-[min(80vh,900px)] w-full rounded-lg bg-white shadow-2xl"
        />
      ) : null}
    </div>
  );
}
