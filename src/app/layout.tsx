import type { Metadata } from "next";
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
