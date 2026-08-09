import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function CatalogHeader() {
  return (
    <div className="flex h-[60px] items-center justify-between border-b border-white/10 px-4 lg:h-[72px] lg:px-10">
      <Link href="/">
        <BrandLogo size="md" />
      </Link>
      <a
        href={`tel:${PHONE_HREF}`}
        className="flex min-h-[44px] items-center bg-[#E31E24] px-3.5 font-[family-name:var(--font-oswald)] text-[13px] font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] lg:bg-transparent lg:px-0 lg:text-[16px] lg:tracking-[0.08em] lg:text-white lg:hover:bg-transparent lg:hover:text-[#ff4a50]"
      >
        {PHONE_DISPLAY}
      </a>
    </div>
  );
}
