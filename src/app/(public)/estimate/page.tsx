import type { Metadata } from "next";
import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, h1Class } from "@/lib/public-ui";
import { alternatesFor } from "@/lib/i18n";
import { EstimateForm } from "./estimate-form";

export const metadata: Metadata = {
  title: "Upload an insurance estimate",
  description:
    "Upload a CCC, Mitchell or Audatex estimate and see which body panels we have in stock for that vehicle.",
  alternates: alternatesFor("en", "/estimate"),
};

export default function EstimatePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader path="/estimate" />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-10 lg:py-14">
        <div className="flex flex-col gap-2.5">
          <h1 className={h1Class}>Upload an estimate</h1>
          <p className={bodyClass}>
            Drop in a CCC, Mitchell or Audatex estimate and we&apos;ll read the VIN and the panels
            off it, then show you what&apos;s on our shelf for that exact vehicle. Faster than
            typing it all out — and we&apos;ll always show you what we read so you can check it.
          </p>
        </div>

        <EstimateForm />

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
