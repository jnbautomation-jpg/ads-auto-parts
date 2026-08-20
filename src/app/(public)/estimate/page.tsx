import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { EstimateView } from "./estimate-view";

export const metadata: Metadata = pageMetadata("en", "/estimate", {
  title: "Upload an insurance estimate",
  description:
    "Upload a CCC, Mitchell or Audatex estimate and see which body panels we have in stock for that vehicle.",
});

export default function EstimatePage() {
  return <EstimateView locale="en" />;
}
