import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { EstimateView } from "../../estimate/estimate-view";

export const metadata: Metadata = {
  title: "Suba un presupuesto del seguro",
  description:
    "Suba un presupuesto de CCC, Mitchell o Audatex y vea qué paneles de carrocería tenemos en existencia para ese vehículo.",
  alternates: alternatesFor("es", "/estimate"),
  openGraph: { url: `${SITE_URL}/es/estimate`, title: "Suba un presupuesto del seguro" },
};

export default function EstimatePageEs() {
  return <EstimateView locale="es" />;
}
