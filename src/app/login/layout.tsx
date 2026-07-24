import type { Metadata } from "next";
import { Oswald, Barlow, Barlow_Condensed } from "next/font/google";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-barlow-condensed",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${oswald.variable} ${barlow.variable} ${barlowCondensed.variable} motion-scope relative min-h-screen overflow-hidden bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white`}
    >
      {children}
    </div>
  );
}
