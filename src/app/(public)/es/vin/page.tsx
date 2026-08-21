import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BUSINESS_NAME, LOCALITY } from "@/lib/site";
import { VinView } from "../../vin/vin-view";

export const metadata: Metadata = pageMetadata("es", "/vin", {
  title: "Busque piezas por VIN",
  description: `Escriba su VIN y vea exactamente qué piezas de carrocería quedan en su vehículo. ${BUSINESS_NAME}, ${LOCALITY}.`,
});

export default function VinPageEs() {
  return <VinView locale="es" />;
}
