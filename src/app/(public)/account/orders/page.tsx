import { CustomerOrdersView } from "./orders-view";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  return <CustomerOrdersView searchParams={searchParams} locale="en" />;
}
