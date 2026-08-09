import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { ProductForm } from "@/components/product-form";
import { linkMutedClass, mutedClass, pageHeadingClass } from "@/lib/admin-ui";

export default async function NewProductPage() {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) notFound();

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-3">
      <Link href="/products" className={`${linkMutedClass} text-xs font-semibold tracking-[0.08em]`}>
        ← PRODUCTS
      </Link>
      <div className="flex items-baseline justify-between">
        <h1 className={pageHeadingClass}>New Product</h1>
        <p className={mutedClass}>Code auto-generates as you fill in the fields</p>
      </div>
      <ProductForm organizationId={organization.id} suppliers={suppliers} />
    </div>
  );
}
