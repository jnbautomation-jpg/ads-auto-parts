import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { EstimateView } from "./estimate-view";

export const metadata: Metadata = {
  title: "Upload an insurance estimate",
  description:
    "Upload a CCC, Mitchell or Audatex estimate and see which body panels we have in stock for that vehicle.",
  alternates: alternatesFor("en", "/estimate"),
  openGraph: { url: `${SITE_URL}/estimate`, title: "Upload an insurance estimate" },
};

export default function EstimatePage() {
  return <EstimateView locale="en" />;
}
