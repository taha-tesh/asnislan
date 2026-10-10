/** Helpers shared by the participant badge and the admin QR scanner (safe on client and server). */

const TOKEN_RE = /^[0-9a-f]{32}$/i;

/** URL encoded in the badge QR code. Opening it requires an admin login. */
export function badgeScanUrl(origin: string, token: string) {
  return `${origin}/admin/scan?c=${token}`;
}

/** Extracts the badge token from a scanned QR payload (full URL or bare token). */
export function parseBadgeToken(raw: string): string | null {
  const text = raw.trim();
  if (TOKEN_RE.test(text)) return text.toLowerCase();
  try {
    const c = new URL(text).searchParams.get("c");
    if (c && TOKEN_RE.test(c)) return c.toLowerCase();
  } catch {}
  return null;
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function formatBirthDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export const WHATSAPP_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ?? "";
