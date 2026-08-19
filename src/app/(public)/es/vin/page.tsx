import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { BUSINESS_NAME, LOCALITY, SITE_URL } from "@/lib/site";
import { VinView } from "../../vin/vin-view";

export const metadata: Metadata = {
  title: "Busque piezas por VIN",
  description: `Escriba su VIN y vea exactamente qué piezas de carrocería quedan en su vehículo. ${BUSINESS_NAME}, ${LOCALITY}.`,
  alternates: alternatesFor("es", "/vin"),
  openGraph: { url: `${SITE_URL}/es/vin`, title: "Busque piezas por VIN" },
};

export default function VinPageEs() {
  return <VinView locale="es" />;
}
