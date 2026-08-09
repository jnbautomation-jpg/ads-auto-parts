// Shared style tokens for the admin UI (dense, light, industrial —
// Oswald for labels/headings, Barlow for body, red accent, amber for
// low-stock flags). Centralized because the same table/card/button
// treatment repeats across every admin screen.

export const cardClass = "bg-white border border-black/10";

export const sectionLabelClass =
  "font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em] text-black";

export const pageHeadingClass =
  "font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-[0.12em] text-black";

export const mutedClass = "font-[family-name:var(--font-barlow)] text-xs text-[#8a8a8a]";

export const tableHeaderRowClass =
  "grid items-center border-b border-black/10 px-3.5 h-[30px] font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.16em] text-[#8a8a8a] sticky top-0 bg-white";

export const tableRowClass =
  "grid items-center border-b border-black/5 px-3.5 h-[33px] font-[family-name:var(--font-barlow)] text-[13px] font-medium text-black transition-colors";

export const codeClass = "font-mono text-[12.5px] font-semibold tracking-[0.02em]";

export const inputClass =
  "h-11 md:h-[34px] w-full border border-black/12 bg-[#FAFAFA] px-2.5 font-[family-name:var(--font-barlow)] text-[13px] font-medium text-black focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.1)] focus:outline-none";

export const labelClass =
  "flex flex-col gap-1 font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]";

export const buttonPrimaryClass =
  "inline-flex h-11 md:h-[34px] shrink-0 items-center justify-center px-4 bg-[#E31E24] font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-white transition-colors hover:bg-[#c9181e] active:scale-[0.98] disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex h-11 md:h-[34px] shrink-0 items-center justify-center px-4 bg-white border border-black/20 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-black transition-colors hover:bg-[#f2f2f2] disabled:opacity-50";

export const linkMutedClass = "font-[family-name:var(--font-barlow)] text-sm text-[#8a8a8a] transition-colors hover:text-black";

export const SUPPLIER_COLS = "grid-cols-[1.2fr_1fr_130px_1.3fr_1fr_110px]";

export const STAFF_COLS = "grid-cols-[1.6fr_150px_160px]";

export const capaBadgeClass = (capa: boolean) =>
  `inline-block border px-[5px] py-[2px] font-[family-name:var(--font-oswald)] text-[9.5px] font-semibold tracking-[0.12em] ${
    capa ? "border-black/35 text-black" : "border-transparent text-[#bbb]"
  }`;
