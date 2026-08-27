import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { CartView } from "./cart-view";

export const metadata: Metadata = pageMetadata("en", "/cart", {
  title: "Your cart",
  description: "The parts you've picked out, ready to check out.",
  // A cart is per-visitor and has nothing to index.
  robots: { index: false, follow: true },
});

export default function CartPage() {
  return (
    <>
      <CatalogHeader locale="en" path="/cart" />
      <CartView locale="en" />
      <SiteFooter locale="en" />
    </>
  );
}
