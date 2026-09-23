// DEVELOPMENT-ONLY layout data for the reviews carousel. Loaded solely by
// getReviews() in reviews.ts, under NODE_ENV === "development".
//
// Deliberately not written to read like testimonials: every entry says it is a
// sample, so if one were ever seen outside a dev server nobody could mistake
// it for a customer's words. The lengths vary so the carousel's height and
// wrapping can be checked; one is marked Spanish to exercise the lang attribute.

import type { Review } from "./reviews";

if (process.env.NODE_ENV !== "development") {
  throw new Error(
    "reviews.sample.ts was loaded outside development. Sample reviews must never reach a production build — use getReviews() from reviews.ts.",
  );
}

export const SAMPLE_REVIEWS: readonly Review[] = [
  {
    author: "Sample A.",
    rating: 5,
    text: "Sample review text for layout testing. Not a real customer.",
    source: "Google",
    date: "2026-08-02",
    sourceUrl: "https://example.com/sample-review-1",
  },
  {
    author: "Sample B.",
    rating: 4,
    text: "Sample review text for layout testing — this one is long enough to wrap across several lines on a phone, so the carousel's reserved height and line length can be checked against the longest entry. Not a real customer.",
    source: "Facebook",
    date: "2026-07-19",
  },
  {
    author: "Muestra C.",
    rating: 5,
    text: "Texto de reseña de muestra para probar el diseño. No es un cliente real.",
    source: "Yelp",
    date: "2026-06-30",
    sourceUrl: "https://example.com/sample-review-3",
    lang: "es",
  },
];
