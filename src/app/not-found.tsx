import Link from "next/link";

// Catches URLs that match no route at all. Segment-level not-found files
// ((public) and (admin)) handle notFound() calls inside a known route; this
// one is the fallback for everything else, so it renders inside the root
// layout without the public site's font variables and styles itself plainly.
//
// Note: a signed-out visitor who mistypes a URL never reaches this page —
// src/lib/supabase/middleware.ts is a deliberate fail-closed allowlist, so an
// unrecognized path redirects to /login before routing happens. That trade is
// intentional (private by default), and this page is what a signed-in user
// sees instead.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-6 py-16 text-center text-white">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
        404
      </p>
      <h1 className="text-[32px] font-semibold leading-tight">Page not found</h1>
      <p className="max-w-[46ch] text-[15px] leading-[1.55] text-[#B4B4B4]">
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 flex min-h-[48px] items-center justify-center bg-[#E31E24] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#ff3a40]"
      >
        Back to home
      </Link>
    </main>
  );
}
