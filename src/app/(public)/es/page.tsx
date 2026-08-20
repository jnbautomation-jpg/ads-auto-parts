import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { LandingView } from "../landing-view";

// The English landing page deliberately has no title/description of its own:
// the (public) layout's defaults ARE its metadata. The Spanish one cannot
// inherit them, so it states its own — including the social card, which
// otherwise previews this page in English.
export const metadata: Metadata = pageMetadata("es", "/", {
  title: "ADS Auto Door Store — Piezas de carrocería nuevas | Orlando, FL",
  description:
    "Puertas, cofres, salpicaderas, defensas y más — piezas de carrocería nuevas, aftermarket y certificadas CAPA, con entrega el mismo día en Florida Central.",
});

export default async function LandingPageEs() {
  return <LandingView locale="es" />;
}
