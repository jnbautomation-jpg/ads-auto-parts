"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { localePath, type Locale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/dictionaries";

// Transparent over the hero, solidifies with a blurred dark background once
// the hero has mostly scrolled past — matches the header treatment in the v2
// design (hero sits behind the sticky header via a negative margin overlap).
export function SiteHeader({
  heroId,
  locale = "en",
}: {
  heroId: string;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const [solid, setSolid] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    if (!hero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setSolid(entry.intersectionRatio < 0.25);
        }
      },
      { threshold: [0, 0.25, 0.5] },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroId]);

  return (
    <div
      ref={headerRef}
      className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 text-[var(--ink-on-band)] backdrop-blur-md transition-colors duration-300 lg:px-14 lg:py-4 ${
        solid ? "border-b border-[var(--accent)]/45 bg-[var(--surface-band)]/97" : "border-b border-white/0 bg-transparent"
      }`}
    >
      <Link href={localePath(locale, "/")}>
        <BrandLogo size="md" />
      </Link>
      <div className="hidden items-center gap-9 lg:flex">
        <nav className="flex gap-[30px] font-[family-name:var(--font-barlow)] text-[13px] font-semibold tracking-[0.14em]">
          <a href="#parts" className="text-[#ccc] transition-colors hover:text-white">
            {dict.landing.nav.parts}
          </a>
          <a href="#why" className="text-[#ccc] transition-colors hover:text-white">
            {dict.landing.nav.why}
          </a>
          <a href="#delivery" className="text-[#ccc] transition-colors hover:text-white">
            {dict.landing.nav.delivery}
          </a>
          <a href="#contact" className="text-[#ccc] transition-colors hover:text-white">
            {dict.landing.nav.contact}
          </a>
        </nav>
        {/* Spanish speakers need a visible way in — the landing page is where
            most of them arrive. */}
        <LanguageToggle locale={locale} path="/" />
        <a
          href={`tel:${PHONE_HREF}`}
          className="rounded-none bg-[var(--accent)] px-6 py-3 font-[family-name:var(--font-oswald)] text-[14px] font-bold tracking-[0.12em] text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          {PHONE_DISPLAY}
        </a>
      </div>
      <a
        href={`tel:${PHONE_HREF}`}
        className="flex items-center gap-1.5 bg-[var(--accent)] px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-[13px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.97] lg:hidden"
      >
        {PHONE_DISPLAY}
      </a>
    </div>
  );
}
