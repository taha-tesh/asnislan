import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

function ensureConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export type UploadedReceipt = {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format: string | null;
  mimeType: string;
};

function extensionFrom(fileName: string, mimeType: string, format?: string | null) {
  if (format) return format.replace(/^\./, "");
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/i.test(fromName)) return fromName;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

/**
 * Temporary authenticated download URL via Cloudinary Admin API.
 * Needed because this cloud has Restricted media delivery — public CDN URLs
 * (even signed with sign_url) return HTTP 401.
 */
export function privateReceiptDownloadUrl(
  publicId: string,
  resourceType: string,
  opts: { format?: string | null; fileName?: string; mimeType?: string; expiresInSec?: number } = {},
) {
  ensureConfigured();
  const format = extensionFrom(opts.fileName ?? "", opts.mimeType ?? "", opts.format);
  const expiresAt = Math.floor(Date.now() / 1000) + (opts.expiresInSec ?? 60 * 30);
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType as "image" | "raw" | "auto",
    type: "upload",
    expires_at: expiresAt,
  });
}

/** Upload a BaridiMob receipt (image or PDF) to Cloudinary under asnislan17/receipts. */
export async function uploadReceipt(file: File, registrationId: number): Promise<UploadedReceipt> {
  ensureConfigured();

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const resourceType: "image" | "raw" = isPdf || file.type.startsWith("image/") ? "image" : "raw";
  const publicId = `asnislan17/receipts/reg-${registrationId}-${Date.now()}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          overwrite: false,
          invalidate: true,
          use_filename: false,
          unique_filename: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error ?? new Error("Cloudinary upload failed"));
          else resolve(uploadResult);
        },
      )
      .end(buffer);
  });

  const mime =
    file.type ||
    (result.format === "pdf"
      ? "application/pdf"
      : result.format
        ? `image/${result.format}`
        : "application/octet-stream");

  // Store a private download URL as a hint; the file route always regenerates a fresh one.
  const url = privateReceiptDownloadUrl(result.public_id, result.resource_type, {
    format: result.format,
    fileName: file.name,
    mimeType: mime,
  });

  return {
    url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    bytes: result.bytes,
    format: result.format ?? null,
    mimeType: mime,
  };
}

/** @deprecated Prefer proxying via /admin/receipt/[id]/file — kept for metadata. */
export function receiptDownloadUrl(publicId: string, resourceType: string, fileName: string, mimeType?: string) {
  return privateReceiptDownloadUrl(publicId, resourceType, { fileName, mimeType });
}

/** Server-side fetch of a receipt from Cloudinary (Admin private download). */
export async function fetchReceiptFromCloudinary(
  publicId: string,
  resourceType: string,
  opts: { fileName?: string; mimeType?: string; format?: string | null } = {},
): Promise<{ bytes: Buffer; contentType: string }> {
  const url = privateReceiptDownloadUrl(publicId, resourceType, opts);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Cloudinary fetch failed: HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  if (!ab.byteLength) {
    throw new Error("Cloudinary returned an empty file");
  }
  const contentType =
    res.headers.get("content-type") || opts.mimeType || "application/octet-stream";
  return { bytes: Buffer.from(ab), contentType };
}

/** Best-effort delete when a registration is removed. */
export async function deleteReceiptAsset(publicId: string, resourceType: string) {
  if (!isCloudinaryConfigured() || !publicId) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType as "image" | "raw" });
  } catch (err) {
    console.error("Cloudinary delete failed", publicId, err);
  }
}
