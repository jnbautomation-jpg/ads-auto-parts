"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import Link from "next/link";
import { buttonPrimaryClass, buttonSecondaryClass, mutedClass, pageHeadingClass } from "@/lib/admin-ui";

// Catches uncaught exceptions in admin pages. Note this does NOT cover
// (admin)/layout.tsx itself — error.tsx never wraps the layout in its own
// segment — so a failure in requireAuthContext() bubbles to global-error.tsx.
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className={pageHeadingClass}>Something went wrong</h1>
      <p className="max-w-[52ch] font-[family-name:var(--font-barlow)] text-sm text-[#555]">
        This screen failed to load. Your inventory data is unaffected — nothing was saved or
        changed by this error.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => unstable_retry()} className={buttonPrimaryClass}>
          TRY AGAIN
        </button>
        <Link href="/dashboard" className={buttonSecondaryClass}>
          DASHBOARD
        </Link>
      </div>

      {error.digest ? <p className={mutedClass}>Reference: {error.digest}</p> : null}
    </div>
  );
}
