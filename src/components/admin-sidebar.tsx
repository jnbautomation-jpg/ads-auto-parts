"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";

type NavItem = { href: string; label: string; badge?: number };

export function AdminSidebar({
  nav,
  userEmail,
  footer,
}: {
  nav: NavItem[];
  userEmail: string;
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile top bar — hidden at md and up, where the static sidebar takes over */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-white px-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px]"
        >
          <span className="h-[2px] w-5 bg-black" />
          <span className="h-[2px] w-5 bg-black" />
          <span className="h-[2px] w-5 bg-black" />
        </button>
        <div className="flex items-center gap-[6px]">
          <div className="h-4 w-[7px] -skew-x-12 bg-[#E31E24]" />
          <div className="font-[family-name:var(--font-oswald)] text-[15px] font-bold tracking-[0.16em]">ADS</div>
          <div className="h-4 w-[7px] skew-x-12 bg-[#E31E24]" />
        </div>
        <div className="h-11 w-11 shrink-0" />
      </div>

      {/* Backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar — static on desktop, slide-out drawer below md */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] shrink-0 flex-col bg-white border-r border-black/10 transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0 md:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-1.5 border-b border-black/8 px-4 py-[18px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[7px]">
              <div className="h-5 w-2 -skew-x-12 bg-[#E31E24]" />
              <div className="flex flex-col items-center leading-none">
                <div className="font-[family-name:var(--font-oswald)] text-[19px] font-bold tracking-[0.16em]">
                  ADS
                </div>
                <div className="mt-0.5 font-[family-name:var(--font-oswald)] text-[6px] font-semibold tracking-[0.28em] text-[#999]">
                  AUTO DOOR STORE · ORLANDO
                </div>
              </div>
              <div className="h-5 w-2 skew-x-12 bg-[#E31E24]" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center text-2xl leading-none text-[#999] md:hidden"
            >
              ×
            </button>
          </div>
          <div className="truncate font-[family-name:var(--font-barlow)] text-[11px] text-[#8a8a8a]">
            {userEmail}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} badge={item.badge} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-black/8 px-4 py-3.5">{footer}</div>
      </aside>
    </>
  );
}
