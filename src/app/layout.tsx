import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { HREFLANG, PATHNAME_HEADER, stripLocale } from "@/lib/i18n";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ADS Auto Parts — Inventory",
  description: "Internal inventory dashboard for ADS Auto Parts.",
};

/**
 * Declares the site light, to the browser rather than only to itself.
 *
 * globals.css has always said this is a designed light theme rather than a
 * system-following one, but it never told the browser — and a page that
 * declares no color-scheme is exactly what Android Chrome's "Auto dark
 * theme" is allowed to invert on the user's behalf. It rewrites backgrounds
 * to dark while leaving colours it reads as intentional, which on a site
 * whose text colour is a near-black token produces dark text on a darkened
 * ground: a page that looks black and empty, on some phones and not others,
 * with nothing wrong on the server.
 *
 * `colorScheme` is the documented opt-out. It also stops mobile browsers
 * rendering native form controls and scrollbars from the OS's dark palette,
 * which is what put dark dropdowns in the middle of white cards.
 *
 * themeColor matches --surface-band, the graphite the header sits on, so the
 * browser's own chrome continues the header rather than cutting a light strip
 * above it.
 */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#17191C",
};

// The only place <html lang> can be set. It was hard-coded "en", so every
// Spanish page told screen readers to read Spanish text with an English
// voice, and gave Google a language signal contradicting its own hreflang.
// The path comes from the proxy (see PATHNAME_HEADER) because a layout cannot
// see the URL.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/";
  const { locale } = stripLocale(pathname);

  return (
    <html
      lang={HREFLANG[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
