import { CustomerOrdersView } from "../../../account/orders/orders-view";

export default async function CustomerOrdersPageEs({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  return <CustomerOrdersView searchParams={searchParams} locale="es" />;
}
