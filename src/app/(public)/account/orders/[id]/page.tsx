import { ReorderView } from "./reorder-view";

export default async function ReorderPage({ params }: { params: Promise<{ id: string }> }) {
  return <ReorderView params={params} locale="en" />;
}
