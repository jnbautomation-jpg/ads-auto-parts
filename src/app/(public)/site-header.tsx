"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdsLogoImage } from "@/components/ads-logo";

const PHONE_DISPLAY = "(407) 743-4644";
const PHONE_HREF = "4077434644";

// Transparent over the hero, solidifies with a blurred dark background once
// the hero has mostly scrolled past — matches the header treatment in the v2
// design (hero sits behind the sticky header via a negative margin overlap).
export function SiteHeader({ heroId }: { heroId: string }) {
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
      className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur-md transition-colors duration-300 lg:px-14 lg:py-4 ${
        solid ? "border-b border-[#E31E24]/45 bg-[#080808]/97" : "border-b border-white/0 bg-transparent"
      }`}
    >
      <Link href="/">
        <AdsLogoImage className="h-11 w-auto lg:h-[52px]" />
      </Link>
      <div className="hidden items-center gap-9 lg:flex">
        <nav className="flex gap-[30px] font-[family-name:var(--font-barlow)] text-[13px] font-semibold tracking-[0.14em]">
          <a href="#parts" className="text-[#ccc] transition-colors hover:text-white">
            PARTS
          </a>
          <a href="#why" className="text-[#ccc] transition-colors hover:text-white">
            WHY ADS
          </a>
          <a href="#delivery" className="text-[#ccc] transition-colors hover:text-white">
            DELIVERY
          </a>
          <a href="#contact" className="text-[#ccc] transition-colors hover:text-white">
            CONTACT
          </a>
        </nav>
        <a
          href={`tel:${PHONE_HREF}`}
          className="rounded-none bg-[#E31E24] px-6 py-3 font-[family-name:var(--font-oswald)] text-[14px] font-bold tracking-[0.12em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97]"
        >
          {PHONE_DISPLAY}
        </a>
      </div>
      <a
        href={`tel:${PHONE_HREF}`}
        className="flex items-center gap-1.5 bg-[#E31E24] px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-[13px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] lg:hidden"
      >
        {PHONE_DISPLAY}
      </a>
    </div>
  );
}
