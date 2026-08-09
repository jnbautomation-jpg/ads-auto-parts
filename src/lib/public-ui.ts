// Shared type scale and control styles for the public site (landing, catalog,
// product detail). Mirrors src/lib/admin-ui.ts, which does the same job for the
// staff screens.
//
// The rules, in one place so the three pages can't drift apart again:
//
//   * Oswald carries structure at three sizes; everything else is Barlow.
//   * Headings are sentence case. Uppercase is reserved for labels that name a
//     control or a data field, plus genuine acronyms (CAPA).
//   * Letter-spacing is capped at 0.14em and only appears on those labels. The
//     previous scale ran 0.22em–0.36em on 9–13px uppercase text, which was the
//     single loudest "template" tell on the site.
//   * Red (#E31E24) is reserved for the primary action and the CAPA mark, so it
//     still means something when it appears.
//   * Secondary text bottoms out at #B4B4B4 and micro-labels at #8A8A8A — the
//     old #555/#666/#6B6B6B/#777 all failed WCAG AA on this dark ground.

export const h1Class =
  "font-[family-name:var(--font-oswald)] text-[36px] font-semibold leading-[1.06] tracking-[-0.01em] lg:text-[56px]";

// Product detail titles: the same role as an H2, but they head a page.
export const pageTitleClass =
  "font-[family-name:var(--font-oswald)] text-[24px] font-semibold leading-[1.15] lg:text-[30px]";

export const sectionHeadingClass =
  "font-[family-name:var(--font-oswald)] text-[22px] font-medium leading-[1.15] lg:text-[30px]";

export const subHeadingClass =
  "font-[family-name:var(--font-oswald)] text-[15px] font-medium lg:text-[17px]";

// The only place uppercase and letter-spacing survive.
export const eyebrowClass =
  "font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]";

export const bodyClass =
  "font-[family-name:var(--font-barlow)] text-[15px] leading-[1.55] text-[#B4B4B4] lg:text-[16px]";

export const mutedClass = "font-[family-name:var(--font-barlow)] text-[14px] text-[#8A8A8A]";

// Keyboard focus has to be visible on a dark ground — the previous rule removed
// the outline entirely and replaced it with a 1px border tint.
export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31E24]";

export const primaryButtonClass = `flex min-h-[48px] items-center justify-center bg-[#E31E24] px-5 font-[family-name:var(--font-barlow)] text-[15px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#ff3a40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`;

export const secondaryButtonClass = `flex min-h-[48px] items-center justify-center border border-white/20 px-5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white transition-colors hover:border-[#E31E24] ${focusRingClass}`;

// Small uppercase status/certification marks (CAPA, IN STOCK). Acronyms and
// stock states read as labels, so they keep the label treatment.
export const badgeClass =
  "border px-2.5 py-1 font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold uppercase tracking-[0.14em]";
