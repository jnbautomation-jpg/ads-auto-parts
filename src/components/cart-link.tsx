"use client";

import Link from "next/link";
import { cartCount } from "@/lib/cart";
import { useCart } from "@/components/cart-store";
import { localePath, type Locale } from "@/lib/i18n";

/**
 * The cart entry point in the header.
 *
 * Renders on the band, so it states its own colour rather than inheriting —
 * the (public) layout sets dark ink for the page and an inheriting element
 * here would be black on graphite. That bug has shipped twice on this site
 * (CHANGELOG decision 9).
 *
 * The badge is absent rather than "0" when the cart is empty: a zero badge is
 * visual noise that never means anything, and it would also flash on every
 * first paint before localStorage is read.
 */
export function CartLink({ locale, label }: { locale: Locale; label: string }) {
  const count = cartCount(useCart());

  return (
    <Link
      href={localePath(locale, "/cart")}
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative flex min-h-[44px] items-center gap-2 px-1 font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-on-band-muted)] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <CartIcon />
      <span className="hidden lg:inline">{label}</span>
      {count > 0 ? (
        <span
          // Red is the primary-action colour and this is the route to paying,
          // so it is the one place a badge earns it.
          className="absolute -right-2 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 font-[family-name:var(--font-barlow)] text-[11px] font-bold leading-none text-white lg:static lg:ml-0.5"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.55L21 8H6" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
    </svg>
  );
}
