import Link from "next/link";
import { LOCALE_LABEL, LOCALES, localePath, type Locale } from "@/lib/i18n";

// Switches language while STAYING on the same page — the common mistake is
// sending everyone back to the home page, which loses the search a customer
// just did.
export function LanguageToggle({ locale, path }: { locale: Locale; path: string }) {
  const other = LOCALES.find((l) => l !== locale) ?? "en";

  return (
    <Link
      href={localePath(other, path)}
      hrefLang={other}
      className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4] transition-colors hover:text-white"
    >
      {LOCALE_LABEL[other]}
    </Link>
  );
}
