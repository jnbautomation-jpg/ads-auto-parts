import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../../../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutSuccessView } from "../../../checkout/success/success-view";
import { readPaymentIntent } from "../../../checkout/success/read-payment-intent";

export const metadata: Metadata = pageMetadata("es", "/checkout/success", {
  title: "Pedido confirmado",
  description: "Su pedido está confirmado.",
  robots: { index: false, follow: false },
});

export default async function CheckoutSuccessPageEs({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <CatalogHeader locale="es" path="/checkout/success" />
      <CheckoutSuccessView locale="es" paymentIntentId={readPaymentIntent(await searchParams)} />
      <SiteFooter locale="es" />
    </>
  );
}
