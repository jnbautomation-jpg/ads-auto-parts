// Shared estimate-upload view, rendered by /estimate and /es/estimate.

import Link from "next/link";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { bodyClass, h1Class } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { EstimateForm } from "./estimate-form";

export function EstimateView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)] font-[family-name:var(--font-barlow)] text-[var(--ink)]">
      <CatalogHeader locale={locale} path="/estimate" />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-10 lg:py-14">
        <div className="flex flex-col gap-2.5">
          <h1 className={h1Class}>{dict.estimate.title}</h1>
          <p className={bodyClass}>{dict.estimate.intro}</p>
        </div>

        <EstimateForm locale={locale} />

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
