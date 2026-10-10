import "server-only";
import { randomBytes } from "node:crypto";
import type { CardInput } from "./validation";

export type PaymentResult =
  | { ok: true; reference: string; last4: string; mode: "test" | "live" }
  | { ok: false; message: string };

/**
 * Charges an Edahabia / CIB card.
 *
 * Card payments in Algeria are processed by SATIM (or an aggregator such as
 * Chargily / SlickPay). Those gateways require a merchant contract and
 * credentials, so this module ships in *test* mode: it validates the card and
 * returns a `TEST-…` reference without moving any money.
 *
 * To go live: set PAYMENT_MODE=live and implement `chargeLive()` with your
 * gateway's API. Card details are only ever held in memory for this call and
 * are never written to the database or logs (only the last 4 digits are kept).
 */
export async function processCardPayment(card: CardInput, amountDzd: number): Promise<PaymentResult> {
  const mode = process.env.PAYMENT_MODE === "live" ? "live" : "test";
  const last4 = card.number.slice(-4);

  if (mode === "live") {
    return chargeLive(card, amountDzd, last4);
  }

  // Test mode: simulate gateway latency and accept the card.
  await new Promise((r) => setTimeout(r, 900));
  const reference = `TEST-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  return { ok: true, reference, last4, mode };
}

async function chargeLive(card: CardInput, amountDzd: number, last4: string): Promise<PaymentResult> {
  // TODO: integrate with SATIM / Chargily / SlickPay using your merchant credentials.
  // Return { ok: true, reference, last4, mode: "live" } on success.
  void card;
  void amountDzd;
  void last4;
  return {
    ok: false,
    message: "بوابة الدفع الإلكتروني غير مفعّلة حالياً. يرجى استخدام بريدي موب أو التواصل مع المنظمين.",
  };
}
