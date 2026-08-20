import { ReorderView } from "../../../../account/orders/[id]/reorder-view";

export default async function ReorderPageEs({ params }: { params: Promise<{ id: string }> }) {
  return <ReorderView params={params} locale="es" />;
}
