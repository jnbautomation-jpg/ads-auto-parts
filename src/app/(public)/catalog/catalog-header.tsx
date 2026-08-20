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

        <Link
          href={localePath(locale, "/vin")}
          className="hidden font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors hover:text-white sm:inline"
        >
          {dict.nav.searchByVin}
        </Link>

        <Link
          href={signedIn ? "/account" : "/account/sign-in"}
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
  );
}
