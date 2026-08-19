import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { BUSINESS_NAME, LOCALITY, SITE_URL } from "@/lib/site";
import { VinView } from "./vin-view";

export const metadata: Metadata = {
  title: "Find parts by VIN",
  description: `Enter your VIN and see exactly which body panels fit your vehicle. ${BUSINESS_NAME}, ${LOCALITY}.`,
  alternates: alternatesFor("en", "/vin"),
  openGraph: { url: `${SITE_URL}/vin`, title: "Find parts by VIN" },
};

export default function VinPage() {
  return <VinView locale="en" />;
}
