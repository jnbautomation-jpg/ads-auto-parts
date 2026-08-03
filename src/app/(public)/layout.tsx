import type { Metadata } from "next";
import { Oswald, Barlow, Barlow_Condensed } from "next/font/google";

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

export const metadata: Metadata = {
  title: "ADS Auto Door Store — New Aftermarket Body Parts | Orlando, FL",
  description:
    "Doors, hoods, fenders, bumpers and more — new, CAPA certified aftermarket auto body parts, delivered same-day across Central Florida.",
  openGraph: {
    title: "ADS Auto Door Store — New Aftermarket Body Parts | Orlando, FL",
    description:
      "Doors, hoods, fenders, bumpers and more — new, CAPA certified aftermarket auto body parts, delivered same-day across Central Florida.",
    images: ["/ads-logo.jpg"],
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${oswald.variable} ${barlow.variable} ${barlowCondensed.variable} motion-scope min-h-screen bg-[#050505] font-[family-name:var(--font-barlow)] text-white`}
    >
      {children}
    </div>
  );
}
