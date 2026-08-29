import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { publishableKey } from "@/lib/stripe";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = pageMetadata("en", "/checkout", {
  title: "Checkout",
  description: "Pay for your parts online and we'll have them ready.",
  robots: { index: false, follow: true },
});

export default function CheckoutPage() {
  // Read on the server and passed down. It is a public identifier by design —
  // this is only reading it in one place rather than reaching for
  // process.env from a client component.
  return (
    <>
      <CatalogHeader locale="en" path="/checkout" />
      <CheckoutView locale="en" publishableKey={publishableKey()} />
      <SiteFooter locale="en" />
    </>
  );
}
