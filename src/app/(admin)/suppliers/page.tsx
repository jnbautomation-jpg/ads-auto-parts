import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { SupplierRow } from "@/components/supplier-row";
import {
  buttonPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  pageHeadingClass,
  SUPPLIER_COLS,
  tableHeaderRowClass,
} from "@/lib/admin-ui";
import { createSupplier } from "./actions";

export default async function SuppliersPage() {
  const { organization } = await requireAuthContext();

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-3">
      <h1 className={pageHeadingClass}>Suppliers</h1>

      <form action={createSupplier} className={`${cardClass} flex flex-wrap items-end gap-2 p-3.5`}>
        <label className={`${labelClass} w-full md:w-auto`}>
          NAME
          <input name="name" required className={inputClass} />
        </label>
        <label className={`${labelClass} w-full md:w-auto`}>
          CONTACT
          <input name="contact" className={inputClass} />
        </label>
        <label className={`${labelClass} w-full md:w-auto`}>
          PHONE
          <input name="phone" className={inputClass} />
        </label>
        <label className={`${labelClass} w-full md:w-auto`}>
          EMAIL
          <input name="email" type="email" className={inputClass} />
        </label>
        <label className={`${labelClass} min-w-[160px] w-full flex-1 md:w-auto`}>
          NOTES
          <input name="notes" className={inputClass} />
        </label>
        <button type="submit" className={`${buttonPrimaryClass} w-full md:w-auto`}>
          + ADD SUPPLIER
        </button>
      </form>

      <div className={cardClass}>
        <div className="hidden md:block">
          <div className={`${tableHeaderRowClass} ${SUPPLIER_COLS}`}>
            <div>NAME</div>
            <div>CONTACT</div>
            <div>PHONE</div>
            <div>EMAIL</div>
            <div>NOTES</div>
            <div />
          </div>
          {suppliers.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">No suppliers yet.</p>
          ) : (
            suppliers.map((supplier) => <SupplierRow key={supplier.id} supplier={supplier} />)
          )}
        </div>
        <div className="flex flex-col md:hidden">
          {suppliers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#8a8a8a]">No suppliers yet.</p>
          ) : (
            suppliers.map((supplier) => <SupplierRow key={supplier.id} supplier={supplier} mobile />)
          )}
        </div>
      </div>
    </div>
  );
}
