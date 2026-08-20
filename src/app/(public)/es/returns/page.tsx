import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { ReturnsView } from "../../returns/returns-view";

export const metadata: Metadata = {
  title: "Devoluciones y garantía",
  description:
    "Cómo funcionan las devoluciones, el daño en el transporte y los reclamos de garantía en las piezas de carrocería de ADS Auto Door Store, Orlando.",
  alternates: alternatesFor("es", "/returns"),
  openGraph: { url: `${SITE_URL}/es/returns`, title: "Devoluciones y garantía" },
};

export default function ReturnsPageEs() {
  return <ReturnsView locale="es" />;
}
