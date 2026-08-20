import Link from "next/link";
import { BUSINESS_NAME, LOCALITY, PHONE_DISPLAY, PHONE_HREF, REVIEW_LINKS } from "@/lib/site";
import { badgeClass, bodyClass, eyebrowClass, subHeadingClass } from "@/lib/public-ui";

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
export function TrustSignals() {
  const links = [
    { key: "google", label: "Google", href: REVIEW_LINKS.google },
    { key: "facebook", label: "Facebook", href: REVIEW_LINKS.facebook },
    { key: "yelp", label: "Yelp", href: REVIEW_LINKS.yelp },
    { key: "ebay", label: "eBay store", href: REVIEW_LINKS.ebay },
  ].filter((l) => Boolean(l.href));

  return (
    <section className="flex flex-col gap-5 border-t border-white/8 px-4 py-12 lg:px-14 lg:py-16">
      <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className={eyebrowClass}>Why you can buy with confidence</span>
          <h2 className={subHeadingClass}>What CAPA certified actually means</h2>
          {/* The shop's main quality claim, in plain language. "CAPA
              certified" is meaningless to someone who hasn't heard of it. */}
          <p className={bodyClass}>
            CAPA is an independent body that tests aftermarket body parts against the original
            manufacturer&apos;s part — panel thickness, weld quality, corrosion protection, and how
            precisely it lines up on the car. A CAPA-marked part has been through that testing and
            carries a numbered seal. It is not a salvage-yard part and it is not a copy that
            &quot;looks about right&quot;. If a part on this site is marked CAPA, it passed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-[#E31E24] text-[#E31E24]`}>
              New parts only
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              Never used salvage. Every panel ships new.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-white/25 text-white`}>
              Real warehouse
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              {BUSINESS_NAME} stocks and ships from its own warehouse in {LOCALITY} — collect in
              person if you&apos;d rather.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 border border-white/10 bg-[#111] p-4">
            <span className={`${badgeClass} self-start border-white/25 text-white`}>
              Talk to a person
            </span>
            <p className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
              <a href={`tel:${PHONE_HREF}`} className="text-white underline">
                {PHONE_DISPLAY}
              </a>{" "}
              — answered 24/7, by someone who knows the parts.
            </p>
          </div>
        </div>

        {links.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={eyebrowClass}>Find us on</span>
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
          Questions about fit, freight damage or returns?{" "}
          <Link href="/returns" className="text-white underline">
            Read the returns &amp; warranty policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
