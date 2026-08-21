import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ReturnsView } from "../../returns/returns-view";

export const metadata: Metadata = pageMetadata("es", "/returns", {
  title: "Devoluciones y garantía",
  description:
    "Cómo funcionan las devoluciones, el daño en el transporte y los reclamos de garantía en las piezas de carrocería de ADS Auto Door Store, Orlando.",
});

export default function ReturnsPageEs() {
  return <ReturnsView locale="es" />;
}
