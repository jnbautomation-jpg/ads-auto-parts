import Link from "next/link";
import { headers } from "next/headers";
import { PATHNAME_HEADER, localePath, stripLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// Catches URLs that match no route at all. Segment-level not-found files
// ((public) and (admin)) handle notFound() calls inside a known route; this
// one is the fallback for everything else, so it renders inside the root
// layout without the public site's font variables and styles itself plainly.
//
// This is what an unknown URL reaches. The proxy is a DENYLIST of staff
// routes, so anything it does not recognise falls through to routing and
// lands here — that is spec 1.1, which exists because old ADS URLs are still
// indexed and sending that traffic to a staff sign-in form is a dead end.
// (An earlier version of this comment described the opposite behaviour; the
// allowlist it referred to is gone. See "Decisions not to undo" in
// CHANGELOG.md.)
export default async function NotFound() {
  // A mistyped URL under /es is still a Spanish visitor — answering in
  // English and pointing them at the English homepage loses them twice.
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/";
  const { locale } = stripLocale(pathname);
  const dict = getDictionary(locale);

  // No lang attribute on <main>: the root layout already sets it on <html>
  // from the same header.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-6 py-16 text-center text-white">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
        404
      </p>
      <h1 className="text-[32px] font-semibold leading-tight">{dict.errors.notFoundTitle}</h1>
      <p className="max-w-[46ch] text-[15px] leading-[1.55] text-[#B4B4B4]">
        {dict.errors.notFoundBody}
      </p>
      <Link
        href={localePath(locale, "/")}
        className="mt-2 flex min-h-[48px] items-center justify-center bg-[#E31E24] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#ff3a40]"
      >
        {dict.nav.backToHome}
      </Link>
    </main>
  );
}
