import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PartType } from "@/generated/prisma/enums";
import { requireAuthContext } from "@/lib/auth";
import { canBulkDelete, canEditCatalog } from "@/lib/permissions";
import { formatPartType } from "@/lib/format";
import { buttonPrimaryClass, pageHeadingClass } from "@/lib/admin-ui";
import { ProductFilters } from "@/components/product-filters";
import { ProductList, type ProductRow } from "@/components/product-list";

const PART_TYPES = Object.values(PartType);

type SearchParams = {
  q?: string;
  partType?: string;
  lowOnly?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organization, user } = await requireAuthContext();
  const params = await searchParams;
  const canEdit = canEditCatalog(user.role);
  const canDelete = canBulkDelete(user.role);

  const q = params.q?.trim() || undefined;
  const partType = params.partType && PART_TYPES.includes(params.partType as PartType) ? (params.partType as PartType) : undefined;
  const lowOnly = params.lowOnly === "on";

  const where: Prisma.ProductWhereInput = {
    organizationId: organization.id,
    ...(partType ? { partType } : {}),
    ...(q
      ? {
          OR: [
            { make: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            {
              vehicleFits: {
                some: {
                  OR: [
                    { make: { contains: q, mode: "insensitive" as const } },
                    { model: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const allMatching = await prisma.product.findMany({ where, orderBy: { quantity: "asc" } });
  const totalCount = await prisma.product.count({ where: { organizationId: organization.id } });
  const products = lowOnly ? allMatching.filter((p) => p.quantity <= p.reorderPoint) : allMatching;

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    partType: p.partType,
    make: p.make,
    model: p.model,
    yearStart: p.yearStart,
    yearEnd: p.yearEnd,
    position: p.position,
    binLocation: p.binLocation,
    capaCertified: p.capaCertified,
    quantity: p.quantity,
    reorderPoint: p.reorderPoint,
    price: p.price.toString(),
    isPublic: p.isPublic,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className={pageHeadingClass}>Products</h1>
        {canEdit ? (
          <Link href="/products/new" className={buttonPrimaryClass}>
            + NEW PRODUCT
          </Link>
        ) : null}
      </div>

      <ProductFilters
        q={q}
        partType={partType}
        lowOnly={lowOnly}
        partTypes={PART_TYPES.map((pt) => ({ value: pt, label: formatPartType(pt) }))}
        resultSummary={`${products.length} of ${totalCount} products`}
      />

      <ProductList products={rows} canEdit={canEdit} canBulkDelete={canDelete} />
    </div>
  );
}
