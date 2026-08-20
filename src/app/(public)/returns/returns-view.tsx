// Shared returns & warranty view, rendered by /returns and /es/returns.
//
// Section 4 of the spec: "shops won't buy a $500 door without knowing the
// policy on freight damage."
//
// ⚠️ THE TERMS BELOW ARE A DRAFT AND NEED MATTHEW'S SIGN-OFF. Return windows,
// restocking fees and who pays return freight are commercial decisions, not
// something to infer. The wording lives in the dictionaries, so a change has
// to be made in both languages or it is a compile error — the policy cannot
// drift between them.

import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, eyebrowClass, h1Class, subHeadingClass } from "@/lib/public-ui";
import { EMAIL, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export function ReturnsView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader locale={locale} path="/returns" />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-7 px-4 py-10 lg:py-16">
        <div className="flex flex-col gap-2.5">
          <span className={eyebrowClass}>{dict.returns.eyebrow}</span>
          <h1 className={h1Class}>{dict.returns.title}</h1>
          <p className={bodyClass}>{dict.returns.intro}</p>
        </div>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>{dict.returns.freightTitle}</h2>
          <p className={bodyClass}>{dict.returns.freightBody}</p>
          <p className={bodyClass}>{dict.returns.freightAfter}</p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>{dict.returns.fitTitle}</h2>
          <p className={bodyClass}>
            {dict.returns.fitBefore}{" "}
            <Link href={localePath(locale, "/vin")} className="text-white underline">
              {dict.returns.fitLink}
            </Link>{" "}
            {dict.returns.fitAfter}
          </p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>{dict.returns.capaTitle}</h2>
          <p className={bodyClass}>{dict.returns.capaBody}</p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>{dict.returns.talkTitle}</h2>
          <p className={bodyClass}>
            {dict.returns.talkBefore}{" "}
            <a href={`tel:${PHONE_HREF}`} className="text-white underline">
              {PHONE_DISPLAY}
            </a>{" "}
            {dict.returns.talkMiddle}{" "}
            <a href={`mailto:${EMAIL}`} className="text-white underline">
              {EMAIL}
            </a>{" "}
            {dict.returns.talkAfter}
          </p>
        </section>

        <Link
          href={localePath(locale, "/catalog")}
          className="mt-2 font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
        >
          {dict.nav.backToCatalog.toUpperCase()}
        </Link>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
