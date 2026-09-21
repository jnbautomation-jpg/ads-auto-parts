"use client";

import { useEffect, useId, useState, type FocusEvent } from "react";
import type { Review } from "@/lib/reviews";
import { ROTATE_INTERVAL_MS, liveMode, shouldAutoRotate, stepIndex } from "@/lib/review-rotation";
import { bodyClass, focusRingClass, subHeadingClass } from "@/lib/public-ui";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

// Rotating customer reviews, inside TrustSignals. The reviews themselves come
// from src/lib/reviews.ts — read the warning at the top of that file before
// adding one.
//
// Nothing at all renders while there are no reviews: no heading, no empty
// frame, no "coming soon".
export function ReviewCarousel({ reviews, locale }: { reviews: readonly Review[]; locale: Locale }) {
  if (reviews.length === 0) return null;
  return <Carousel reviews={reviews} locale={locale} />;
}

const controlClass = `flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--line-strong)] bg-[var(--surface-raised)] px-3 font-[family-name:var(--font-barlow)] text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)] ${focusRingClass}`;

function Carousel({ reviews, locale }: { reviews: readonly Review[]; locale: Locale }) {
  const t = getDictionary(locale).reviews;
  const headingId = useId();
  const count = reviews.length;

  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  // Treated as reduced until the browser says otherwise, so nothing moves
  // before hydration or for a visitor whose preference we cannot read.
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const rotating = shouldAutoRotate({ count, reducedMotion, hovered, focused, paused });

  // A timeout keyed on the index rather than an interval, so moving by hand
  // restarts the six seconds instead of advancing again a moment later.
  useEffect(() => {
    if (!rotating) return;
    const id = window.setTimeout(() => setIndex((i) => stepIndex(i, 1, count)), ROTATE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [rotating, index, count]);

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <section
      aria-labelledby={headingId}
      aria-roledescription={t.carousel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className="flex flex-col gap-4 border-t border-[var(--line)] pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className={`${subHeadingClass} text-[var(--ink)]`}>
          {t.heading}
        </h2>
        {count > 1 ? (
          <div className="flex items-center gap-2">
            {/* WCAG 2.2.2: anything that moves on its own for more than five
                seconds needs a way to stop it that doesn't depend on hovering. */}
            {!reducedMotion ? (
              <button type="button" onClick={() => setPaused((p) => !p)} className={controlClass}>
                {paused ? t.play : t.pause}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={t.previous}
              onClick={() => setIndex((i) => stepIndex(i, -1, count))}
              className={controlClass}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label={t.next}
              onClick={() => setIndex((i) => stepIndex(i, 1, count))}
              className={controlClass}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Every review is laid into the same grid cell, invisibly, so the box
          is always as tall as the longest one and the page below doesn't jump
          on each change. Only the current review is in the live region, and
          it is re-mounted on change so screen readers announce it. */}
      <div className="grid">
        {reviews.map((r, i) => (
          <div key={i} aria-hidden="true" className="invisible [grid-area:1/1]">
            <ReviewBody review={r} locale={locale} t={t} />
          </div>
        ))}
        <div aria-live={liveMode(rotating)} className="[grid-area:1/1]">
          <div
            key={index}
            role="group"
            aria-roledescription={t.slide}
            aria-label={`${index + 1} ${t.of} ${count}`}
          >
            <ReviewBody review={reviews[index]} locale={locale} t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewBody({ review, locale, t }: { review: Review; locale: Locale; t: Dictionary["reviews"] }) {
  return (
    <div className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--surface-raised)] p-5">
      <p className="flex items-center gap-2">
        <span aria-hidden="true" className="text-[16px] tracking-[0.1em]">
          <span className="text-[var(--ink)]">{"★".repeat(review.rating)}</span>
          <span className="text-[var(--line-strong)]">{"★".repeat(5 - review.rating)}</span>
        </span>
        <span className="sr-only">
          {t.ratedBefore} {review.rating} {t.ratedAfter}
        </span>
      </p>
      {/* The customer's own words, in their own language — never translated. */}
      <blockquote lang={review.lang} className={`${bodyClass} text-[var(--ink)]`}>
        <p>“{review.text}”</p>
      </blockquote>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-barlow)] text-[13.5px] text-[var(--ink-muted)]">
        <span className="font-semibold text-[var(--ink)]">{review.author}</span>
        <span>
          {review.source} · {formatReviewDate(review.date, locale)}
        </span>
        {review.sourceUrl ? (
          <a
            href={review.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold text-[var(--ink-muted)] underline transition-colors hover:text-[var(--ink)] ${focusRingClass}`}
          >
            {t.readOn} {review.source}
          </a>
        ) : null}
      </div>
    </div>
  );
}

// Month and year is as precise as a review date needs to be. Pinned to UTC so
// the server and the browser can't render different months for the same date.
function formatReviewDate(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
