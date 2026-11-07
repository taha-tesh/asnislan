"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import header from "@/public/header.jpeg";
import { badgeScanUrl, formatBirthDate } from "@/lib/badge";

/** A6 proportions (105 × 148 mm) so it maps 1:1 onto the PDF page. */
export const BADGE_W = 340;
export const BADGE_H = Math.round((BADGE_W * 148) / 105);

export type BadgeData = { id: number; fullName: string; birthDate: string; badgeToken: string };

export function ParticipantBadge({ data, ref }: { data: BadgeData; ref?: React.Ref<HTMLDivElement> }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(badgeScanUrl(window.location.origin, data.badgeToken), {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1d1f3b", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [data.badgeToken]);

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ width: BADGE_W, height: BADGE_H, fontFamily: "var(--font-cairo), sans-serif" }}
      className="relative flex flex-col overflow-hidden rounded-[22px] bg-white text-ink shadow-2xl shadow-navy/20 ring-1 ring-navy/10"
    >
      <div className="w-full shrink-0">
        <Image
          src={header}
          alt="آس نيسلان الطبعة 18 - مكتب العاصمة"
          width={772}
          height={440}
          unoptimized
          loading="eager"
          className="block h-auto w-full"
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center px-5 pt-2 text-center">
        <p className="text-[11px] text-muted">الاسم الكامل</p>
        <p className="mt-0.5 line-clamp-2 text-[17px] font-extrabold leading-snug text-navy">{data.fullName}</p>

        <div className="mt-2 flex w-full items-stretch justify-center gap-2">
          <div className="flex-1 rounded-xl bg-rose-pale px-2 py-1">
            <p className="text-[10px] text-muted">تاريخ الميلاد</p>
            <p className="text-[12px] font-extrabold text-navy" dir="ltr">
              {formatBirthDate(data.birthDate)}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-leaf-light/60 px-2 py-1">
            <p className="text-[10px] text-muted">رقم التسجيل</p>
            <p className="text-[12px] font-extrabold text-leaf" dir="ltr">
              #{String(data.id).padStart(4, "0")}
            </p>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border-[3px] border-gold bg-white p-1.5 shadow-md shadow-gold/20">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="رمز QR الخاص بالمشارك" width={112} height={112} className="block h-[112px] w-[112px]" />
          ) : (
            <div className="h-[112px] w-[112px] animate-pulse rounded-lg bg-rose-pale" />
          )}
        </div>
        <p className="mt-1 text-[10px] text-muted">يُمسح هذا الرمز عند الحضور يوم الدورة للتحقق من التسجيل</p>
      </div>

      {/* Footer */}
      {/* <div className="mt-auto bg-rose-pale px-5 py-2.5 text-center">
        <p className="text-[10px] font-bold text-navy">شعارها التضحية لخدمة العشيرة والمجتمع</p>
      </div> */}
    </div>
  );
}
