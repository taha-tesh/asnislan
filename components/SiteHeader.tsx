import Image from "next/image";
import Link from "next/link";
import header from "@/public/header.png";

export function SiteHeader() {
  return (
    <header className="relative w-full overflow-hidden bg-navy-deep">
      {/* Blurred copy of the banner fills the sides on wide screens */}
      <Image
        src={header}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover scale-110 blur-2xl opacity-70"
      />
      <div className="relative mx-auto max-w-5xl">
        <Link href="/" className="block" aria-label="الصفحة الرئيسية">
          <Image
            src={header}
            alt="آس نيسلان الطبعة 17 - مكتب العاصمة"
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full"
          />
        </Link>
      </div>
      <div className="relative h-1.5 w-full bg-gradient-to-l from-rose via-gold to-leaf" />
    </header>
  );
}
