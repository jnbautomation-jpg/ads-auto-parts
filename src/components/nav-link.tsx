"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center justify-between px-3 py-[9px] font-[family-name:var(--font-barlow)] text-[13px] font-semibold tracking-[0.06em] transition-colors md:min-h-0 ${
        active ? "bg-[#E31E24] text-white" : "text-[#333] hover:bg-black/[0.03]"
      }`}
    >
      <span>{label}</span>
      {badge ? (
        <span
          className={`font-[family-name:var(--font-barlow)] text-[11px] font-semibold ${
            active ? "text-white/80" : "text-[#8a8a8a]"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
