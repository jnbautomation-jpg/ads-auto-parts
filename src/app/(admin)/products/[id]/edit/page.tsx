import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { linkMutedClass, pageHeadingClass } from "@/lib/admin-ui";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) notFound();

  const [product, suppliers] = await Promise.all([
    prisma.product.findFirst({ where: { id, organizationId: organization.id } }),
    prisma.supplier.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  const initialValues: ProductFormValues = {
    id: product.id,
    sku: product.sku,
    partType: product.partType,
    make: product.make,
    model: product.model,
    yearStart: product.yearStart,
    yearEnd: product.yearEnd,
    position: product.position,
    color: product.color ?? "",
    paintCode: product.paintCode ?? "",
    binLocation: product.binLocation ?? "",
    condition: product.condition,
    conditionNotes: product.conditionNotes ?? "",
    capaCertified: product.capaCertified,
    quantity: product.quantity,
    reorderPoint: product.reorderPoint,
    cost: product.cost.toString(),
    price: product.price.toString(),
    photos: product.photos,
    isPublic: product.isPublic,
    supplierId: product.supplierId ?? "",
  };

  return (
    <div className="flex flex-col gap-3">
      <Link href="/products" className={`${linkMutedClass} text-xs font-semibold tracking-[0.08em]`}>
        ← PRODUCTS
      </Link>
      <h1 className={pageHeadingClass}>Edit {product.sku}</h1>
      <ProductForm organizationId={organization.id} suppliers={suppliers} initialValues={initialValues} />
    </div>
  );
}
