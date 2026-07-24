"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateSkuBase } from "@/lib/sku";
import { formatPartType, formatPosition } from "@/lib/format";
import { PartType, PartPosition, PartCondition } from "@/generated/prisma/enums";
import { saveProduct, type ProductFormState } from "@/app/(admin)/products/actions";
import { buttonPrimaryClass, cardClass, inputClass, labelClass, linkMutedClass, sectionLabelClass } from "@/lib/admin-ui";

const PART_TYPES = Object.values(PartType);
const POSITIONS = Object.values(PartPosition);
const CONDITIONS = Object.values(PartCondition);

export type ProductFormValues = {
  id: string;
  sku: string;
  partType: PartType;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  position: PartPosition | null;
  color: string;
  paintCode: string;
  binLocation: string;
  condition: PartCondition;
  conditionNotes: string;
  capaCertified: boolean;
  quantity: number;
  reorderPoint: number;
  cost: string;
  price: string;
  photos: string[];
  isPublic: boolean;
  supplierId: string;
};

const EMPTY_VALUES: ProductFormValues = {
  id: "",
  sku: "",
  partType: "DOOR",
  make: "",
  model: "",
  yearStart: new Date().getFullYear(),
  yearEnd: new Date().getFullYear(),
  position: null,
  color: "",
  paintCode: "",
  binLocation: "",
  condition: "A",
  conditionNotes: "",
  capaCertified: false,
  quantity: 0,
  reorderPoint: 2,
  cost: "0",
  price: "0",
  photos: [],
  isPublic: true,
  supplierId: "",
};

export function ProductForm({
  organizationId,
  suppliers,
  initialValues,
}: {
  organizationId: string;
  suppliers: { id: string; name: string }[];
  initialValues?: ProductFormValues;
}) {
  const isEdit = Boolean(initialValues?.id);
  const values = initialValues ?? EMPTY_VALUES;

  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});

  const [partType, setPartType] = useState<PartType>(values.partType);
  const [position, setPosition] = useState<PartPosition | "">(values.position ?? "");
  const [make, setMake] = useState(values.make);
  const [model, setModel] = useState(values.model);
  const [yearStart, setYearStart] = useState(values.yearStart);
  const [yearEnd, setYearEnd] = useState(values.yearEnd);

  const [photos, setPhotos] = useState<string[]>(values.photos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // `sku` is derived, not stored: it tracks the auto-generated value as make/model/
  // years/part-type change, until the user types in the field directly (skuOverride)
  // or hits Regenerate (which clears the override and resumes tracking).
  const autoSku = generateSkuBase({ model, yearStart, yearEnd, partType, position: position || null });
  const [skuOverride, setSkuOverride] = useState<string | null>(values.sku || null);
  const sku = skuOverride ?? autoSku;

  function regenerateSku() {
    setSkuOverride(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const path = `${organizationId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("product-photos").upload(path, file);
      if (error) {
        setUploadError(error.message);
        continue;
      }
      const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  return (
    <form action={formAction} className="flex max-w-[880px] flex-col gap-3">
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      {state.error ? (
        <p className="border border-[#E31E24]/30 bg-[#E31E24]/[0.06] px-3 py-2 font-[family-name:var(--font-barlow)] text-sm text-[#B4231F]">
          {state.error}
        </p>
      ) : null}

      <section className={`${cardClass} flex flex-col gap-2.5 px-4 py-3.5`}>
        <div className={sectionLabelClass}>VEHICLE FIT</div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_1fr_120px_120px]">
          <label className={labelClass}>
            MAKE
            <input
              type="text"
              name="make"
              required
              placeholder="Kia"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            MODEL
            <input
              type="text"
              name="model"
              required
              placeholder="K5"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            YEAR START
            <input
              type="number"
              name="yearStart"
              required
              value={yearStart}
              onChange={(e) => setYearStart(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            YEAR END
            <input
              type="number"
              name="yearEnd"
              required
              value={yearEnd}
              onChange={(e) => setYearEnd(Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className={`${cardClass} flex flex-col gap-2.5 px-4 py-3.5`}>
        <div className={sectionLabelClass}>IDENTITY</div>
        <div className="grid grid-cols-1 items-end gap-2.5 lg:grid-cols-[1fr_1fr_1.4fr]">
          <label className={labelClass}>
            PART TYPE
            <select
              name="partType"
              value={partType}
              onChange={(e) => setPartType(e.target.value as PartType)}
              className={inputClass}
            >
              {PART_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {formatPartType(pt)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            POSITION
            <select
              name="position"
              value={position}
              onChange={(e) => setPosition(e.target.value as PartPosition | "")}
              className={inputClass}
            >
              <option value="">None</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {formatPosition(p)}
                </option>
              ))}
            </select>
          </label>
          <div className={labelClass}>
            CODE — LIVE PREVIEW
            <div className="flex h-[34px] items-center gap-2 bg-black pl-2.5 pr-1.5">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSkuOverride(e.target.value)}
                placeholder="Auto-generated"
                className="min-w-0 flex-1 bg-transparent font-mono text-[14px] font-semibold tracking-[0.06em] text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={regenerateSku}
                className="shrink-0 font-[family-name:var(--font-barlow)] text-[10px] font-semibold tracking-[0.08em] text-white/50 hover:text-white"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClass} flex flex-col gap-2.5 px-4 py-3.5`}>
        <div className={sectionLabelClass}>CONDITION</div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <label className={labelClass}>
            GRADE
            <select name="condition" defaultValue={values.condition} className={inputClass}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            COLOR
            <input type="text" name="color" defaultValue={values.color} className={inputClass} />
          </label>
          <label className={labelClass}>
            PAINT CODE
            <input type="text" name="paintCode" defaultValue={values.paintCode} className={inputClass} />
          </label>
          <label className={`${labelClass} col-span-2 lg:col-span-1`}>
            NOTES
            <input type="text" name="conditionNotes" defaultValue={values.conditionNotes} className={inputClass} />
          </label>
        </div>
      </section>

      <section className={`${cardClass} flex flex-col gap-2.5 px-4 py-3.5`}>
        <div className={sectionLabelClass}>INVENTORY &amp; PRICING</div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <label className={labelClass}>
            QUANTITY
            <input
              type="number"
              name="quantity"
              min={0}
              defaultValue={values.quantity}
              disabled={isEdit}
              className={`${inputClass} ${isEdit ? "bg-black/5 text-[#999]" : ""}`}
            />
          </label>
          <label className={labelClass}>
            REORDER POINT
            <input type="number" name="reorderPoint" min={0} defaultValue={values.reorderPoint} className={inputClass} />
          </label>
          <label className={labelClass}>
            COST ($)
            <input type="number" name="cost" min={0} step="0.01" defaultValue={values.cost} className={inputClass} />
          </label>
          <label className={labelClass}>
            PRICE ($)
            <input type="number" name="price" min={0} step="0.01" defaultValue={values.price} className={inputClass} />
          </label>
          <label className={labelClass}>
            BIN LOCATION
            <input
              type="text"
              name="binLocation"
              placeholder="H16"
              defaultValue={values.binLocation}
              className={inputClass}
            />
          </label>
        </div>
        {isEdit ? <p className="text-xs text-[#999]">Use Stock In / Stock Out on the detail page to change quantity.</p> : null}
        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className={`${labelClass} w-[220px]`}>
            SUPPLIER
            <select name="supplierId" defaultValue={values.supplierId} className={inputClass}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#333]">
            <input type="checkbox" name="capaCertified" defaultChecked={values.capaCertified} className="accent-[#E31E24]" />
            CAPA certified
          </label>
          <label className="flex items-center gap-1.5 font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#333]">
            <input type="checkbox" name="isPublic" defaultChecked={values.isPublic} className="accent-[#E31E24]" />
            Show on public catalog
          </label>
        </div>
      </section>

      <section className={`${cardClass} flex flex-col gap-2.5 px-4 py-3.5`}>
        <div className={sectionLabelClass}>PHOTOS</div>
        <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={uploading} className="text-sm" />
        {uploading ? <p className="text-xs text-[#8a8a8a]">Uploading…</p> : null}
        {uploadError ? <p className="text-xs text-[#E31E24]">{uploadError}</p> : null}
        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {photos.map((url) => (
              <div key={url} className="relative h-[90px] w-[130px] overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute right-0 top-0 bg-black/60 px-1.5 text-xs text-white hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="flex items-center gap-4 pt-1">
        <button type="submit" disabled={pending || uploading} className={buttonPrimaryClass}>
          {pending ? "SAVING…" : isEdit ? "SAVE CHANGES" : "CREATE PRODUCT"}
        </button>
        <Link href={isEdit ? `/products/${values.id}` : "/products"} className={linkMutedClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
