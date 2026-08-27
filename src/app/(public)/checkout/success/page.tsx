import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutSuccessView } from "./success-view";
import { readPaymentIntent } from "./read-payment-intent";

export const metadata: Metadata = pageMetadata("en", "/checkout/success", {
  title: "Order confirmed",
  description: "Your order is confirmed.",
  robots: { index: false, follow: false },
});

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <CatalogHeader locale="en" path="/checkout/success" />
      <CheckoutSuccessView locale="en" paymentIntentId={readPaymentIntent(await searchParams)} />
      <SiteFooter locale="en" />
    </>
  );
}
