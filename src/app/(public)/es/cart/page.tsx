import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogHeader } from "../../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { CartView } from "../../cart/cart-view";

export const metadata: Metadata = pageMetadata("es", "/cart", {
  title: "Su carrito",
  description: "Las piezas que eligió, listas para pagar.",
  robots: { index: false, follow: true },
});

export default function CartPageEs() {
  return (
    <>
      <CatalogHeader locale="es" path="/cart" />
      <CartView locale="es" />
      <SiteFooter locale="es" />
    </>
  );
}
