import Link from "next/link";
import { buttonPrimaryClass, pageHeadingClass } from "@/lib/admin-ui";

// Rendered when notFound() is called under (admin). Two distinct causes:
// a record that no longer exists, and a permission check — pages like
// products/new and products/[id]/edit call notFound() rather than showing a
// "forbidden" screen, so a staff-role user who types the URL directly lands
// here. The copy has to make sense for both.
export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className={pageHeadingClass}>Not available</h1>
      <p className="max-w-[52ch] font-[family-name:var(--font-barlow)] text-sm text-[#555]">
        That page doesn&apos;t exist, the record was deleted, or your role doesn&apos;t have access
        to it. If you think you should be able to see it, ask the owner to check your role.
      </p>
      <Link href="/dashboard" className={buttonPrimaryClass}>
        BACK TO DASHBOARD
      </Link>
    </div>
  );
}
