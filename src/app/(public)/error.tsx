"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bodyClass, h1Class, primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { localePath, stripLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// Catches uncaught exceptions anywhere under (public) — the landing page,
// the catalog, and product detail. Without this a visitor sees Next's raw
// error page on the shop's own site.
//
// Deliberately has no data dependencies: an error boundary that itself needs
// the database would fail for exactly the reason it was rendered.
export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // An error boundary is a Client Component, so it cannot read the header the
  // server pages use — usePathname gives it the same answer. The failure that
  // brought a Spanish visitor here should not also switch them to English.
  const { locale } = stripLocale(usePathname());
  const dict = getDictionary(locale);

  useEffect(() => {
    // Surfaces in Vercel's runtime logs. `digest` is the only handle on the
    // original server-side error, since the real message is withheld from
    // the client in production.
    console.error("Public route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-5 px-5 py-16">
      <h1 className={h1Class}>{dict.errors.somethingWrong}</h1>
      <p className={bodyClass}>{dict.errors.pageErrorBody}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => unstable_retry()} className={primaryButtonClass}>
          {dict.errors.tryAgain}
        </button>
        <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
          {dict.catalog.callUs} {PHONE_DISPLAY}
        </a>
        <Link href={localePath(locale, "/")} className={secondaryButtonClass}>
          {dict.nav.backToHome}
        </Link>
      </div>

      {error.digest ? (
        // Lets the shop quote a specific failure to whoever is maintaining
        // the site, instead of "a page broke sometime yesterday".
        <p className="font-[family-name:var(--font-barlow)] text-[12px] text-[#8A8A8A]">
          {dict.errors.reference}: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
