import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-muted">
      <p>مكتب العاصمة - شعارها التضحية لخدمة العشيرة والمجتمع</p>
      <p className="mt-2">
        <Link href="/admin" className="text-muted/70 hover:text-navy underline-offset-4 hover:underline">
          لوحة الإدارة
        </Link>
      </p>
    </footer>
  );
}
