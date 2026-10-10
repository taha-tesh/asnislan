import {
  BLOOD_TYPES,
  PAYMENT_METHODS,
  RECEIPT_MAX_BYTES,
  RECEIPT_MIME_TYPES,
  isWeddingDateAllowed,
  type BloodType,
  type PaymentMethod,
} from "./constants";

export type FieldErrors = Partial<Record<string, string>>;

export type RegistrationInput = {
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  residence: string;
  profession: string;
  weddingYear: number;
  weddingMonth: number;
  phone: string;
  bloodType: BloodType;
  paymentMethod: PaymentMethod;
};

export type CardInput = {
  holder: string;
  number: string; // digits only
  expMonth: number;
  expYear: number; // 4 digits
  cvv: string;
};

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Normalise Arabic-Indic digits to ASCII so phone numbers and card numbers validate. */
export function normalizeDigits(s: string) {
  return s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
          .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizePhone(raw: string) {
  let p = normalizeDigits(raw).replace(/[\s\-().]/g, "");
  if (p.startsWith("+213")) p = "0" + p.slice(4);
  else if (p.startsWith("00213")) p = "0" + p.slice(5);
  return p;
}

export function isValidAlgerianMobile(phone: string) {
  return /^0[5-7]\d{8}$/.test(phone);
}

export function parseRegistration(fd: FormData): { data?: RegistrationInput; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const fullName = str(fd.get("fullName")).replace(/\s+/g, " ");
  if (fullName.length < 5) errors.fullName = "يرجى إدخال الاسم الكامل مع اسم الجد";
  else if (fullName.length > 120) errors.fullName = "الاسم طويل جداً";

  const birthDate = str(fd.get("birthDate"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) errors.birthDate = "يرجى إدخال تاريخ الميلاد";
  else {
    const d = new Date(birthDate + "T00:00:00Z");
    const now = new Date();
    const age = now.getUTCFullYear() - d.getUTCFullYear();
    if (Number.isNaN(d.getTime())) errors.birthDate = "تاريخ غير صالح";
    else if (age < 16 || age > 90) errors.birthDate = "تاريخ الميلاد غير منطقي";
  }

  const residence = str(fd.get("residence"));
  if (residence.length < 2) errors.residence = "يرجى إدخال القصر";
  else if (residence.length > 100) errors.residence = "النص طويل جداً";

  const profession = str(fd.get("profession"));
  if (profession.length < 2) errors.profession = "يرجى إدخال المهنة";
  else if (profession.length > 100) errors.profession = "النص طويل جداً";

  const wedding = str(fd.get("weddingDate"));
  const m = /^(\d{4})-(\d{2})$/.exec(wedding);
  let weddingYear = 0;
  let weddingMonth = 0;
  if (!m) errors.weddingDate = "يرجى اختيار شهر وسنة الزواج";
  else {
    weddingYear = Number(m[1]);
    weddingMonth = Number(m[2]);
    if (!isWeddingDateAllowed(weddingYear, weddingMonth))
      errors.weddingDate = "يجب أن يكون تاريخ الزواج بين ديسمبر 2026 ونوفمبر 2027";
  }

  const phone = normalizePhone(str(fd.get("phone")));
  if (!isValidAlgerianMobile(phone)) errors.phone = "يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456)";

  const bloodType = str(fd.get("bloodType")) as BloodType;
  if (!BLOOD_TYPES.includes(bloodType)) errors.bloodType = "يرجى اختيار فصيلة الدم";

  const paymentMethod = str(fd.get("paymentMethod")) as PaymentMethod;
  if (!(paymentMethod in PAYMENT_METHODS)) errors.paymentMethod = "يرجى اختيار طريقة الدفع";

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    data: { fullName, birthDate, residence, profession, weddingYear, weddingMonth, phone, bloodType, paymentMethod },
  };
}

export function validateReceipt(file: FormDataEntryValue | null): { file?: File; error?: string } {
  if (!(file instanceof File) || file.size === 0) return { error: "يرجى إرفاق وصل التحويل (صورة أو PDF)" };
  if (file.size > RECEIPT_MAX_BYTES) return { error: "حجم الملف يتجاوز 5 ميغابايت" };
  const type = file.type || "";
  const okType = RECEIPT_MIME_TYPES.includes(type) || /\.(jpe?g|png|webp|heic|pdf)$/i.test(file.name);
  if (!okType) return { error: "نوع الملف غير مدعوم. يُقبل: JPG, PNG, WEBP, PDF" };
  return { file };
}

export function luhnValid(digits: string) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function parseCard(fd: FormData): { card?: CardInput; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const holder = str(fd.get("cardHolder")).replace(/\s+/g, " ");
  if (holder.length < 3) errors.cardHolder = "يرجى إدخال اسم حامل البطاقة";

  const number = normalizeDigits(str(fd.get("cardNumber"))).replace(/\D/g, "");
  if (!/^\d{16,19}$/.test(number)) errors.cardNumber = "رقم البطاقة يجب أن يتكون من 16 رقماً";
  else if (!luhnValid(number)) errors.cardNumber = "رقم البطاقة غير صحيح، يرجى التحقق منه";

  const exp = normalizeDigits(str(fd.get("cardExpiry"))).replace(/\s/g, "");
  const em = /^(\d{2})\/?(\d{2}|\d{4})$/.exec(exp);
  let expMonth = 0;
  let expYear = 0;
  if (!em) errors.cardExpiry = "تاريخ الانتهاء بصيغة MM/YY";
  else {
    expMonth = Number(em[1]);
    expYear = em[2].length === 2 ? 2000 + Number(em[2]) : Number(em[2]);
    const now = new Date();
    const endOfMonth = new Date(expYear, expMonth, 0, 23, 59, 59);
    if (expMonth < 1 || expMonth > 12) errors.cardExpiry = "شهر غير صالح";
    else if (endOfMonth < now) errors.cardExpiry = "البطاقة منتهية الصلاحية";
  }

  const cvv = normalizeDigits(str(fd.get("cardCvv")));
  if (!/^\d{3,4}$/.test(cvv)) errors.cardCvv = "رمز CVV يتكون من 3 أرقام";

  if (Object.keys(errors).length) return { errors };
  return { errors, card: { holder, number, expMonth, expYear, cvv } };
}
