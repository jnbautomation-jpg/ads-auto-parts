import Link from "next/link";
import { headers } from "next/headers";
import { bodyClass, h1Class, primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { PATHNAME_HEADER, localePath, stripLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// Rendered when notFound() is called under (public) — most often a product
// detail URL for a part that has been sold, deleted, or unpublished. That is
// a normal thing for a customer to hit from a stale link or a search result,
// so it steers them back to the catalog rather than treating it as a dead end.
export default async function PublicNotFound() {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/";
  const { locale } = stripLocale(pathname);
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-5 px-5 py-16">
      <h1 className={h1Class}>{dict.product.notFoundTitle}</h1>
      <p className={bodyClass}>{dict.product.notFoundBody}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={localePath(locale, "/catalog")} className={primaryButtonClass}>
          {dict.product.browseCatalog}
        </Link>
        <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
          {dict.catalog.callUs} {PHONE_DISPLAY}
        </a>
      </div>
    </main>
  );
}
