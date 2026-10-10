import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadReceiptPayload } from "@/lib/receipt-bytes";

/** JSON payload for in-page PDF/image preview (avoids empty binary Response bodies). */
export async function GET(_req: Request, ctx: RouteContext<"/admin/receipt/[id]/data">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const regId = Number(id);
  if (!Number.isInteger(regId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const payload = await loadReceiptPayload(regId);
    if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const base64 = payload.bytes.toString("base64");
    if (!base64 || payload.bytes.length === 0) {
      console.error("receipt data empty after Cloudinary/local load", regId, payload.sizeBytes);
      return NextResponse.json({ error: "Empty file" }, { status: 502 });
    }

    console.info("receipt data ok", {
      regId,
      bytes: payload.bytes.length,
      base64Len: base64.length,
      source: payload.source,
    });

    return NextResponse.json(
      {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeBytes: payload.bytes.length,
        source: payload.source,
        openUrl: payload.cloudinaryDownloadUrl,
        base64,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (err) {
    console.error("receipt data route failed", regId, err);
    return NextResponse.json({ error: "Failed to load file" }, { status: 502 });
  }
}
