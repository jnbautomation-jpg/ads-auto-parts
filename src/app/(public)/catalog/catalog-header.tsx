import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { getViewerTier } from "@/lib/customer-auth";
import { canSeeWholesale } from "@/lib/pricing";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { LanguageToggle } from "@/components/language-toggle";

export async function CatalogHeader({
  locale = "en",
  path = "/catalog",
}: {
  locale?: Locale;
  /** Language-neutral path, so the toggle stays on the current page. */
  path?: string;
} = {}) {
  const dict = getDictionary(locale);
  const tier = await getViewerTier();
  const signedIn = tier !== "GUEST";

  return (
    <>
    <div className="flex h-[60px] items-center justify-between gap-3 border-b border-white/10 px-4 lg:h-[72px] lg:px-10">
      <Link href={localePath(locale, "/")}>
        <BrandLogo size="md" />
      </Link>

      <div className="flex items-center gap-3 lg:gap-5">
        {/* When trade pricing is active, say so — otherwise a shop can't tell
            whether the numbers on screen are their price or the public one. */}
        {canSeeWholesale(tier) ? (
          <span className="hidden border border-[#E31E24] px-2 py-[3px] font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E31E24] sm:inline">
            {dict.nav.tradePricing}
          </span>
        ) : null}

        <Link
          href={localePath(locale, "/estimate")}
          className="hidden font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors hover:text-white lg:inline"
        >
          {dict.nav.uploadEstimate}
        </Link>

        {/* Bordered rather than plain text: this used to be the third of
            three identical grey links, and it is the feature customers are
            told to use to get the right panel. Not red — red stays with the
            phone CTA and the CAPA mark. */}
        <Link
          href={localePath(locale, "/vin")}
          className="hidden items-center gap-1.5 border border-white/25 px-3 py-[7px] font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-white transition-colors hover:border-white hover:bg-white/5 lg:inline-flex"
        >
          <VinIcon />
          {dict.nav.searchByVin}
        </Link>

        <Link
          href={localePath(locale, signedIn ? "/account" : "/account/sign-in")}
          className="hidden font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors hover:text-white sm:inline"
        >
          {signedIn ? dict.nav.myAccount : dict.nav.signIn}
        </Link>

        <LanguageToggle locale={locale} path={path} />

        <a
          href={`tel:${PHONE_HREF}`}
          className="flex min-h-[44px] items-center bg-[#E31E24] px-3.5 font-[family-name:var(--font-oswald)] text-[13px] font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] lg:bg-transparent lg:px-0 lg:text-[16px] lg:tracking-[0.08em] lg:text-white lg:hover:bg-transparent lg:hover:text-[#ff4a50]"
        >
          {PHONE_DISPLAY}
        </a>
      </div>
    </div>

    {/* Everything in the row above is hidden below lg, so on a phone the
        header was a logo, a language toggle and a phone number — VIN lookup,
        estimate upload and accounts were unreachable, not just hard to find.
        Horizontally scrollable so a longer Spanish label cannot wrap the bar. */}
    <nav className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-4 py-2.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href={localePath(locale, "/vin")}
        className="flex min-h-[36px] shrink-0 items-center gap-1.5 border border-white/25 px-3 font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-white transition-colors active:bg-white/10"
      >
        <VinIcon />
        {dict.nav.searchByVin}
      </Link>
      <Link
        href={localePath(locale, "/estimate")}
        className="flex min-h-[36px] shrink-0 items-center px-2.5 font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors active:text-white"
      >
        {dict.nav.uploadEstimate}
      </Link>
      <Link
        href={localePath(locale, signedIn ? "/account" : "/account/sign-in")}
        className="ml-auto flex min-h-[36px] shrink-0 items-center px-2.5 font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors active:text-white"
      >
        {signedIn ? dict.nav.myAccount : dict.nav.signIn}
      </Link>
    </nav>
    </>
  );
}

// Barcode-ish mark. A VIN is a printed code on the car, so this reads as
// "scan the number", which is what the page asks the customer to do.
function VinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 3v10M5 3v10M7.5 3v10M10.5 3v10M14 3v10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
