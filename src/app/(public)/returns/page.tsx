import type { Metadata } from "next";
import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, eyebrowClass, h1Class, subHeadingClass } from "@/lib/public-ui";
import { EMAIL, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { alternatesFor } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Returns & warranty",
  description:
    "How returns, freight damage and warranty claims work on aftermarket body parts from ADS Auto Door Store, Orlando.",
  alternates: alternatesFor("en", "/returns"),
};

// Section 4 of the spec: "shops won't buy a $500 door without knowing the
// policy on freight damage."
//
// ⚠️ THE TERMS BELOW ARE A DRAFT AND NEED MATTHEW'S SIGN-OFF. Return windows,
// restocking fees and who pays return freight are commercial decisions, not
// something to infer. The page is written so each number is easy to change,
// and it says plainly that customers should call — which is true regardless
// of what the final policy says.
export default function ReturnsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader path="/returns" />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-7 px-4 py-10 lg:py-16">
        <div className="flex flex-col gap-2.5">
          <span className={eyebrowClass}>Returns &amp; warranty</span>
          <h1 className={h1Class}>If something isn&apos;t right</h1>
          <p className={bodyClass}>
            Body panels are big, heavy and easy to damage in transit. Here&apos;s how we handle it
            when a part arrives damaged, doesn&apos;t fit, or isn&apos;t what you needed.
          </p>
        </div>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>Freight damage</h2>
          <p className={bodyClass}>
            Inspect the part before you sign for it. If the packaging is torn, crushed or the panel
            is visibly dented, note it on the delivery paperwork and photograph it before the driver
            leaves — that record is what lets us replace it quickly. Then call us the same day and
            we&apos;ll get a replacement moving.
          </p>
          <p className={bodyClass}>
            If you find damage after the driver has gone, call us anyway. Photograph the packaging
            as well as the part.
          </p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>Wrong part or doesn&apos;t fit</h2>
          <p className={bodyClass}>
            Parts differ by trim, and a VIN is the surest way to get it right — you can{" "}
            <Link href="/vin" className="text-white underline">
              check your VIN here
            </Link>{" "}
            before ordering. If a part still doesn&apos;t fit, call us before attempting any
            modification or paint prep: once a panel has been drilled, cut or painted it can no
            longer be returned.
          </p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>CAPA certified parts</h2>
          <p className={bodyClass}>
            Parts marked CAPA have been independently tested against the manufacturer&apos;s original
            for fit, thickness and corrosion protection, and carry a numbered seal. Leave the seal on
            until the part is fitted — it&apos;s the evidence behind any claim.
          </p>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-white/10 pt-6">
          <h2 className={subHeadingClass}>Talk to us first</h2>
          <p className={bodyClass}>
            Every claim is handled by a person, not a form. Call{" "}
            <a href={`tel:${PHONE_HREF}`} className="text-white underline">
              {PHONE_DISPLAY}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${EMAIL}`} className="text-white underline">
              {EMAIL}
            </a>{" "}
            with your order number and a photo, and we&apos;ll tell you what happens next.
          </p>
        </section>

        <Link
          href="/catalog"
          className="mt-2 font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
        >
          ← BACK TO CATALOG
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
