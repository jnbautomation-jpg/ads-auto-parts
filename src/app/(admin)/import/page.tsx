import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { cardClass, pageHeadingClass } from "@/lib/admin-ui";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const { user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) notFound();

  return (
    <div className="flex max-w-[880px] flex-col gap-3">
      <h1 className={pageHeadingClass}>Import</h1>
      <div className={`${cardClass} flex flex-col gap-3 p-4`}>
        <p className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
          Upload one tab of the shop&apos;s inventory workbook (.xlsx/.xls/.csv) and choose which part type it
          covers. Row 1 should be a title, row 2 the header (Location, MODEL, SIDE, QTY, COST, SHOP), and makes
          should appear as their own section rows above the models they apply to. Review the parsed preview
          before confirming — rows that fail to parse or cover two vehicles at once are flagged for manual
          review instead of being guessed at.
        </p>
        <ImportForm />
      </div>
    </div>
  );
}
