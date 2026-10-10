import "server-only";
import { fetchReceiptFromCloudinary, isCloudinaryConfigured, privateReceiptDownloadUrl } from "@/lib/cloudinary";
import { getReceipt, getReceiptMeta } from "@/lib/registrations";

export type ReceiptPayload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Raw file bytes (for preview / proxy). */
  bytes: Buffer;
  source: "cloudinary" | "local";
  /** Short-lived Cloudinary Admin download URL (for open/download links). */
  cloudinaryDownloadUrl: string | null;
};

export async function loadReceiptPayload(registrationId: number): Promise<ReceiptPayload | null> {
  const meta = await getReceiptMeta(registrationId);
  if (!meta) return null;

  if (meta.cloudinary_public_id && meta.cloudinary_resource_type && isCloudinaryConfigured()) {
    const remote = await fetchReceiptFromCloudinary(meta.cloudinary_public_id, meta.cloudinary_resource_type, {
      fileName: meta.file_name,
      mimeType: meta.mime_type,
    });
    const downloadUrl = privateReceiptDownloadUrl(meta.cloudinary_public_id, meta.cloudinary_resource_type, {
      fileName: meta.file_name,
      mimeType: meta.mime_type,
      expiresInSec: 60 * 15,
    });
    return {
      fileName: meta.file_name,
      mimeType: remote.contentType.split(";")[0].trim() || meta.mime_type,
      sizeBytes: remote.bytes.length,
      bytes: remote.bytes,
      source: "cloudinary",
      cloudinaryDownloadUrl: downloadUrl,
    };
  }

  if (meta.has_local_data) {
    const receipt = await getReceipt(registrationId);
    if (!receipt?.data?.length) return null;
    const bytes = Buffer.from(receipt.data);
    return {
      fileName: meta.file_name,
      mimeType: meta.mime_type,
      sizeBytes: bytes.length,
      bytes,
      source: "local",
      cloudinaryDownloadUrl: null,
    };
  }

  return null;
}
