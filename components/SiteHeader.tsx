import Image from "next/image";
import Link from "next/link";
import header from "@/public/header.jpeg";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
      <Link href="/" className="block overflow-hidden rounded-2xl" aria-label="الصفحة الرئيسية">
        <Image
          src={header}
          alt="آس نيسلان الطبعة 18 - مكتب العاصمة"
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
        />
      </Link>
    </header>
  );
}
