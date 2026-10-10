import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadReceiptPayload } from "@/lib/receipt-bytes";

/**
 * Serves / redirects to the receipt file.
 * Cloudinary-backed receipts redirect to a short-lived Admin download URL
 * (CDN delivery is restricted on this cloud — unsigned/signed res.* URLs 401).
 * Legacy BYTEA rows are streamed from the database.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/admin/receipt/[id]/file">) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const regId = Number(id);
  if (!Number.isInteger(regId)) return new NextResponse("Bad request", { status: 400 });

  let payload;
  try {
    payload = await loadReceiptPayload(regId);
  } catch (err) {
    console.error("receipt file load failed", regId, err);
    return new NextResponse("Failed to load file", { status: 502 });
  }
  if (!payload) return new NextResponse("Not found", { status: 404 });

  // Prefer Cloudinary's authenticated download endpoint — avoids Next.js empty binary bodies.
  if (payload.cloudinaryDownloadUrl) {
    return NextResponse.redirect(payload.cloudinaryDownloadUrl, 302);
  }

  const wantDownload = req.nextUrl.searchParams.get("download") === "1";
  const wantInline = req.nextUrl.searchParams.get("inline") === "1";
  const mime = payload.mimeType || "application/octet-stream";
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(payload.fileName);
  const isImage = mime.startsWith("image/");

  const dispositionType =
    wantDownload || (isPdf && !wantInline) || (!isImage && !isPdf) ? "attachment" : "inline";
  const asciiName =
    payload.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "") ||
    `receipt-${regId}${isPdf ? ".pdf" : ""}`;
  const disposition = `${dispositionType}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`;

  // Copy into a standalone Uint8Array (BodyInit) — Buffer.buffer.slice() can be SharedArrayBuffer.
  const body = Uint8Array.from(payload.bytes);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
