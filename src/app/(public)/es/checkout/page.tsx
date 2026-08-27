import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { publishableKey } from "@/lib/stripe";
import { CheckoutView } from "../../checkout/checkout-view";

export const metadata: Metadata = pageMetadata("es", "/checkout", {
  title: "Finalizar su compra",
  description: "Pague sus piezas en línea y se las dejamos listas.",
  robots: { index: false, follow: true },
});

export default function CheckoutPageEs() {
  return (
    <>
      <CatalogHeader locale="es" path="/checkout" />
      <CheckoutView locale="es" publishableKey={publishableKey()} />
      <SiteFooter locale="es" />
    </>
  );
}
