import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BUSINESS_NAME, LOCALITY } from "@/lib/site";
import { VinView } from "./vin-view";

export const metadata: Metadata = pageMetadata("en", "/vin", {
  title: "Find parts by VIN",
  description: `Enter your VIN and see exactly which body panels fit your vehicle. ${BUSINESS_NAME}, ${LOCALITY}.`,
});

export default function VinPage() {
  return <VinView locale="en" />;
}
