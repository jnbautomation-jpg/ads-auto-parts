import type { Metadata } from "next";
import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, h1Class } from "@/lib/public-ui";
import { BUSINESS_NAME, LOCALITY, SITE_URL } from "@/lib/site";
import { VinForm } from "./vin-form";

export const metadata: Metadata = {
  title: "Find parts by VIN",
  description: `Enter your VIN and see exactly which body panels fit your vehicle. ${BUSINESS_NAME}, ${LOCALITY}.`,
  alternates: { canonical: "/vin" },
  openGraph: { url: `${SITE_URL}/vin`, title: "Find parts by VIN" },
};

export default function VinPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader />

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-10 lg:py-16">
        <div className="flex flex-col gap-2.5">
          <h1 className={h1Class}>Find parts by VIN</h1>
          <p className={bodyClass}>
            Your VIN identifies the exact year, make, model and trim of your vehicle — so you order
            the panel that actually fits, first time.
          </p>
        </div>

        <VinForm />

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
