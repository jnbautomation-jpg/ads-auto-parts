import Link from "next/link";
import { bodyClass, h1Class, primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

// Rendered when notFound() is called under (public) — most often a product
// detail URL for a part that has been sold, deleted, or unpublished. That is
// a normal thing for a customer to hit from a stale link or a search result,
// so it steers them back to the catalog rather than treating it as a dead end.
export default function PublicNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-5 px-5 py-16">
      <h1 className={h1Class}>We can&apos;t find that part</h1>
      <p className={bodyClass}>
        It may have sold, or the link may be out of date. We stock far more than we list online —
        browse the catalog or call and we&apos;ll check the shelf for you.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/catalog" className={primaryButtonClass}>
          Browse the catalog
        </Link>
        <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
          Call {PHONE_DISPLAY}
        </a>
      </div>
    </main>
  );
}
