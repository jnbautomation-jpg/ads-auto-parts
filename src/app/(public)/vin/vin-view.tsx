// Shared VIN lookup view, rendered by /vin and /es/vin.

import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, h1Class } from "@/lib/public-ui";
import { VinForm } from "./vin-form";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";


export function VinView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)] font-[family-name:var(--font-barlow)] text-[var(--ink)]">
      <CatalogHeader locale={locale} path="/vin" />

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-10 lg:py-16">
        <div className="flex flex-col gap-2.5">
          <h1 className={h1Class}>{dict.vin.title}</h1>
          <p className={bodyClass}>{dict.vin.intro}</p>
        </div>

        <VinForm locale={locale} />

        <Link
          href={localePath(locale, "/catalog")}
          className="mt-2 font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-muted)]"
        >
          {dict.nav.backToCatalog.toUpperCase()}
        </Link>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
