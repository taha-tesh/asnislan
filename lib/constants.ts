export const EVENT = {
  title: "دورة المقبلين على الزواج",
  edition: "آس نيسلان الطبعة 17",
  subtitle: "استمارة خاصة بالتسجيل عن بعد",
  note: "يرجى منك أخي الفاضل تسجيل كل المعلومات بعناية. شكرا",
  baridimobNumber: "00799999001369457264",
  feeDzd: 3000,
  feeLabel: "3000 دج",
  confirmNote: "يتم تأكيد التسجيل بدفع الاشتراك",
} as const;

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const PAYMENT_METHODS = {
  baridimob: "بريدي موب (تحويل بنكي)",
  dahabia: "البطاقة الذهبية / CIB",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PAYMENT_STATUS = {
  pending: "قيد التحقق",
  paid: "مدفوع",
  rejected: "مرفوض",
} as const;
export type PaymentStatus = keyof typeof PAYMENT_STATUS;

/** Algerian month names. */
export const MONTHS_AR = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/** Allowed wedding dates: December 2026 → November 2027 (inclusive). */
export type MonthYear = { year: number; month: number };

export const WEDDING_RANGE: { start: MonthYear; end: MonthYear } = {
  start: { year: 2026, month: 12 },
  end: { year: 2027, month: 11 },
};

export function weddingOptions(): (MonthYear & { value: string; label: string })[] {
  const out: (MonthYear & { value: string; label: string })[] = [];
  let { year, month }: MonthYear = WEDDING_RANGE.start;
  while (year < WEDDING_RANGE.end.year || (year === WEDDING_RANGE.end.year && month <= WEDDING_RANGE.end.month)) {
    out.push({
      year,
      month,
      value: `${year}-${String(month).padStart(2, "0")}`,
      label: `${MONTHS_AR[month - 1]} ${year}`,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

export function isWeddingDateAllowed(year: number, month: number) {
  return weddingOptions().some((o) => o.year === year && o.month === month);
}

export function formatWeddingDate(year: number, month: number) {
  return `${MONTHS_AR[month - 1] ?? month} ${year}`;
}

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
