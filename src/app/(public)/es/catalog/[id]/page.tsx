import type { Metadata } from "next";
import { ProductView, buildProductMetadata } from "../../../catalog/[id]/product-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return buildProductMetadata(params, "es");
}

export default async function PartDetailPageEs({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductView params={params} locale="es" />;
}
