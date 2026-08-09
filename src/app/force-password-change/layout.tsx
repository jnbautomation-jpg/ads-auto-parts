import type { Metadata } from "next";
import { Oswald, Barlow } from "next/font/google";

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

export default function ForcePasswordChangeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${oswald.variable} ${barlow.variable} relative min-h-screen overflow-hidden bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white`}
    >
      {children}
    </div>
  );
}
