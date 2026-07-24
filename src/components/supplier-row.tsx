"use client";

import { useState } from "react";
import { updateSupplier, deleteSupplier } from "@/app/(admin)/suppliers/actions";
import { buttonPrimaryClass, inputClass, labelClass, linkMutedClass, SUPPLIER_COLS, tableRowClass } from "@/lib/admin-ui";

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export function SupplierRow({ supplier, mobile }: { supplier: Supplier; mobile?: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-black/5 bg-[#FAFAFA] px-3.5 py-3 last:border-b-0">
        <form
          action={async (formData) => {
            await updateSupplier(formData);
            setEditing(false);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={supplier.id} />
          <label className={`${labelClass} w-full md:w-auto`}>
            NAME
            <input name="name" defaultValue={supplier.name} required className={inputClass} />
          </label>
          <label className={`${labelClass} w-full md:w-auto`}>
            CONTACT
            <input name="contact" defaultValue={supplier.contact ?? ""} className={inputClass} />
          </label>
          <label className={`${labelClass} w-full md:w-auto`}>
            PHONE
            <input name="phone" defaultValue={supplier.phone ?? ""} className={inputClass} />
          </label>
          <label className={`${labelClass} w-full md:w-auto`}>
            EMAIL
            <input name="email" type="email" defaultValue={supplier.email ?? ""} className={inputClass} />
          </label>
          <label className={`${labelClass} min-w-[160px] w-full flex-1 md:w-auto`}>
            NOTES
            <input name="notes" defaultValue={supplier.notes ?? ""} className={inputClass} />
          </label>
          <button type="submit" className={`${buttonPrimaryClass} w-full md:w-auto`}>
            SAVE
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={`${linkMutedClass} flex min-h-11 items-center md:min-h-0`}
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  if (mobile) {
    return (
      <div className="flex flex-col gap-1 border-b border-black/5 px-4 py-3 last:border-b-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold">{supplier.name}</div>
          <div className="flex shrink-0 gap-3 font-[family-name:var(--font-barlow)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-11 items-center px-1 text-[#555] hover:text-black"
            >
              Edit
            </button>
            <form
              action={deleteSupplier}
              onSubmit={(e) => {
                if (!confirm(`Delete supplier "${supplier.name}"? Products stay, but lose this supplier link.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={supplier.id} />
              <button type="submit" className="flex min-h-11 items-center px-1 text-[#8a8a8a] hover:text-[#E31E24]">
                Delete
              </button>
            </form>
          </div>
        </div>
        <div className="text-[13px] text-[#555]">{supplier.contact ?? "—"}</div>
        <div className="text-[13px] text-[#555]">{supplier.phone ?? "—"}</div>
        <div className="truncate text-[13px] text-[#555]">{supplier.email ?? "—"}</div>
        {supplier.notes ? <div className="truncate text-[13px] text-[#8a8a8a]">{supplier.notes}</div> : null}
      </div>
    );
  }

  return (
    <div className={`${tableRowClass} ${SUPPLIER_COLS} h-9 last:border-b-0 hover:bg-[#f7f7f7]`}>
      <div className="font-semibold">{supplier.name}</div>
      <div className="text-[#555]">{supplier.contact ?? "—"}</div>
      <div className="text-[#555]">{supplier.phone ?? "—"}</div>
      <div className="truncate text-[#555]">{supplier.email ?? "—"}</div>
      <div className="truncate text-[#8a8a8a]">{supplier.notes ?? "—"}</div>
      <div className="flex justify-end gap-3 font-[family-name:var(--font-barlow)] text-xs font-semibold">
        <button type="button" onClick={() => setEditing(true)} className="text-[#555] hover:text-black">
          Edit
        </button>
        <form
          action={deleteSupplier}
          onSubmit={(e) => {
            if (!confirm(`Delete supplier "${supplier.name}"? Products stay, but lose this supplier link.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={supplier.id} />
          <button type="submit" className="text-[#8a8a8a] hover:text-[#E31E24]">
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
