import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { LandingView } from "../landing-view";

export const metadata: Metadata = {
  title: "ADS Auto Door Store — Piezas de carrocería nuevas | Orlando, FL",
  description:
    "Puertas, cofres, salpicaderas, defensas y más — piezas de carrocería nuevas, aftermarket y certificadas CAPA, con entrega el mismo día en Florida Central.",
  alternates: alternatesFor("es", "/"),
};

export default async function LandingPageEs() {
  return <LandingView locale="es" />;
}
