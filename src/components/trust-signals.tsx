import Link from "next/link";
import { BUSINESS_NAME, LOCALITY, PHONE_DISPLAY, PHONE_HREF, REVIEW_LINKS } from "@/lib/site";
import { badgeClass, bodyClass, eyebrowClass, subHeadingClass } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// Trust signals — Phase 2B.
//
//   "Verified seller badge, CAPA explainer, warehouse and truck photos.
//    Pull in existing Facebook and Yelp reviews; add a Google review link."
//
// Built: the CAPA explainer (the highest-value one — "CAPA certified" means
// nothing to a customer who hasn't heard of it, and it is the shop's main
// quality claim), the seller/warehouse credentials, and review links.
//
// NOT built: pulling review CONTENT in from Facebook and Yelp. Both require
// API access tied to the shop's own business accounts, and Yelp's terms
// restrict republishing review text. Linking out is the honest version until
// someone connects those accounts — see REVIEW_LINKS in src/lib/site.ts.
export function TrustSignals({ locale = "en" }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale);
  const links = [
    // Brand names stay as they are in both languages; only "eBay store" is a
    // description rather than a name.
    { key: "google", label: "Google", href: REVIEW_LINKS.google },
    { key: "facebook", label: "Facebook", href: REVIEW_LINKS.facebook },
    { key: "yelp", label: "Yelp", href: REVIEW_LINKS.yelp },
    { key: "ebay", label: dict.trust.ebayStore, href: REVIEW_LINKS.ebay },
  ].filter((l) => Boolean(l.href));

  return (
    <section className="flex flex-col gap-5 border-t border-white/8 px-4 py-12 lg:px-14 lg:py-16">
      <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className={eyebrowClass}>{dict.trust.eyebrow}</span>
          <h2 className={subHeadingClass}>{dict.trust.capaTitle}</h2>
          {/* The shop's main quality claim, in plain language. "CAPA
              certified" is meaningless to someone who hasn't heard of it. */}
          <p className={bodyClass}>{dict.trust.capaBody}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-[#E31E24] text-[#E31E24]`}>
              {dict.trust.newPartsBadge}
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              {dict.trust.newPartsBody}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-white/25 text-white`}>
              {dict.trust.warehouseBadge}
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              {BUSINESS_NAME} {dict.trust.warehouseBefore} {LOCALITY} {dict.trust.warehouseAfter}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-white/25 text-white`}>
              {dict.trust.personBadge}
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              <a href={`tel:${PHONE_HREF}`} className="text-white underline">
                {PHONE_DISPLAY}
              </a>{" "}
              {dict.trust.personAfter}
            </p>
          </div>
        </div>

        {links.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={eyebrowClass}>{dict.trust.findUs}</span>
            {links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-[family-name:var(--font-barlow)] text-[13.5px] font-semibold text-[#B4B4B4] underline transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
        ) : null}

        <p className="font-[family-name:var(--font-barlow)] text-[13px] text-[#8A8A8A]">
          {dict.trust.returnsPrompt}{" "}
          <Link href={localePath(locale, "/returns")} className="text-white underline">
            {dict.trust.returnsLink}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
