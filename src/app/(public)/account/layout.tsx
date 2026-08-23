import type { Metadata } from "next";

// Account pages must never be indexed — they're per-customer and several
// show trade pricing. robots.ts also disallows /account; this is the
// belt-and-braces page-level signal.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--surface-page)] text-white">{children}</div>;
}
