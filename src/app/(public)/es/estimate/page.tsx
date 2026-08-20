import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { EstimateView } from "../../estimate/estimate-view";

export const metadata: Metadata = pageMetadata("es", "/estimate", {
  title: "Suba un presupuesto del seguro",
  description:
    "Suba un presupuesto de CCC, Mitchell o Audatex y vea qué paneles de carrocería tenemos en existencia para ese vehículo.",
});

export default function EstimatePageEs() {
  return <EstimateView locale="es" />;
}
