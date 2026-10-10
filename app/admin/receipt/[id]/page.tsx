import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { EVENT, PAYMENT_STATUS } from "@/lib/constants";
import { getReceiptMeta, getRegistrationById } from "@/lib/registrations";
import { isCloudinaryConfigured, privateReceiptDownloadUrl } from "@/lib/cloudinary";
import { ReceiptPreview } from "@/components/admin/ReceiptPreview";
import { logout } from "../../actions";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
}

async function ReceiptViewer({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { id } = await params;
  const regId = Number(id);
  if (!Number.isInteger(regId)) notFound();

  const [registration, meta] = await Promise.all([getRegistrationById(regId), getReceiptMeta(regId)]);
  if (!registration) notFound();

  const localFile = `/admin/receipt/${regId}/file`;
  let openUrl = `${localFile}?inline=1`;
  let downloadUrl = `${localFile}?download=1`;
  let sourceLabel = "محلي";

  if (meta?.cloudinary_public_id && meta.cloudinary_resource_type && isCloudinaryConfigured()) {
    sourceLabel = "Cloudinary";
    try {
      const cloudUrl = privateReceiptDownloadUrl(meta.cloudinary_public_id, meta.cloudinary_resource_type, {
        fileName: meta.file_name,
        mimeType: meta.mime_type,
        expiresInSec: 60 * 15,
      });
      openUrl = cloudUrl;
      downloadUrl = cloudUrl;
    } catch (err) {
      console.error("private download url failed", err);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">وصل التحويل الخاص بـ</p>
            <h2 className="text-2xl font-extrabold text-navy">{registration.full_name}</h2>
            <p className="mt-1 text-sm text-muted">
              رقم التسجيل #{registration.id} · الهاتف{" "}
              <span className="ltr inline-block font-mono">{registration.phone}</span> · الحالة:{" "}
              <span className="font-bold text-navy">{PAYMENT_STATUS[registration.payment_status]}</span>
            </p>
          </div>
          {meta ? (
            <a href={downloadUrl} className="btn-gold" target="_blank" rel="noopener">
              <span aria-hidden>⬇️</span> تحميل الملف
            </a>
          ) : null}
        </div>
      </section>

      {!meta ? (
        <p className="rounded-2xl bg-rose-pale px-4 py-10 text-center text-muted">لا يوجد وصل مرفق بهذا التسجيل.</p>
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/5 px-4 py-3 text-sm">
            <span className="ltr truncate font-mono text-navy" dir="ltr">
              {meta.file_name}
            </span>
            <span className="text-muted">
              {meta.mime_type} · {formatSize(meta.size_bytes)} · {sourceLabel}
            </span>
          </div>

          <div className="bg-navy-deep/95 p-3 sm:p-6">
            <ReceiptPreview
              registrationId={regId}
              openUrl={openUrl}
              downloadUrl={downloadUrl}
              mimeType={meta.mime_type}
              fileName={meta.file_name}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default function ReceiptPage({ params }: PageProps<"/admin/receipt/[id]">) {
  return (
    <>
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-gold-light">{EVENT.edition}</p>
            <h1 className="text-xl font-extrabold">عرض وصل التحويل</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/scan" className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:bg-gold-light">
              <span aria-hidden>📷</span> مسح QR
            </Link>
            <Link href="/admin" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
              لوحة الإدارة
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-xl bg-rose px-4 py-2 text-sm font-bold hover:bg-rose/90">
                خروج
              </button>
            </form>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-l from-rose via-gold to-leaf" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white/70" />}>
          <ReceiptViewer params={params} />
        </Suspense>
      </main>
    </>
  );
}
