import Link from "next/link";
import { EVENT } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-muted">
      <p>مكتب العاصمة - شعارها التضحية لخدمة العشيرة والمجتمع</p>
      <p className="mt-2">
        {EVENT.place} · {EVENT.schedule}
      </p>
      <p className="mt-1">
        للاستفسار:{" "}
        {EVENT.inquiryPhones.map((phone, i) => (
          <span key={phone.tel}>
            {i > 0 ? " - " : null}
            <a href={`tel:${phone.tel}`} className="ltr inline-block font-bold text-navy hover:underline">
              {phone.display}
            </a>
          </span>
        ))}
      </p>
      {/* <p className="mt-2">
        <Link href="/admin" className="text-muted/70 hover:text-navy underline-offset-4 hover:underline">
          لوحة الإدارة
        </Link>
      </p> */}
    </footer>
  );
}
