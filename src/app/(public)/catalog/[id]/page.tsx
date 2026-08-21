import type { Metadata } from "next";
import { ProductView, buildProductMetadata } from "./product-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return buildProductMetadata(params, "en");
}

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductView params={params} locale="en" />;
}
