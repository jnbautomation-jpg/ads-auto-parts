// Customer reviews shown on the landing page.
//
// ⚠️ REAL REVIEWS ONLY. Every entry in REVIEWS must be copied word for word
// from a review a real customer left on the shop's public Google, Facebook or
// Yelp profile, with the name shown there and the date it was posted. Never
// write, generate, "tidy up", translate or seed one — not as a placeholder,
// not temporarily. The FTC's rule on fake reviews and testimonials (16 CFR
// Part 465, in force since October 2024) prohibits fabricated or misattributed
// testimonials, with civil penalties per violation. It also prohibits implying
// that a displayed selection represents every review the shop has received, so
// never label this list as "all reviews" and never compute an average rating
// from it — the shop's real rating lives on the profiles, which is what
// sourceUrl links to.
//
// Yelp's terms restrict republishing review text off Yelp. Get the shop's
// sign-off before adding a Yelp review here; linking out to it is always fine.
//
// The array ships empty, and while it is empty the section renders nothing at
// all — same pattern as REVIEW_LINKS in site.ts.
//
// For local layout work there is sample data in reviews.sample.ts. It is only
// ever loaded by getReviews() below under NODE_ENV === "development", refuses
// to load under any other NODE_ENV, and reviews.test.ts fails the build if
// anything else imports it. Never import it directly.

export const REVIEW_SOURCES = ["Google", "Facebook", "Yelp"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export type Review = {
  /** As shown on the profile: first name and last initial, e.g. "Maria G." */
  author: string;
  /** Whole stars, 1–5, as left by the customer. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Verbatim, in the language the customer wrote it. Never translated. */
  text: string;
  source: ReviewSource;
  /** When the review was posted, as an ISO date: "2026-08-14". */
  date: string;
  /** Link to the original review, so a visitor can check it is real. */
  sourceUrl?: string;
  /**
   * Language of `text`, when it differs from the page's — so a screen reader
   * reads a Spanish review in Spanish on the English site, and vice versa.
   */
  lang?: "en" | "es";
};

export const REVIEWS: readonly Review[] = [];

/**
 * The reviews to render. In production and in tests this is always REVIEWS.
 *
 * The sample file sits behind a dynamic import inside a NODE_ENV check. Next
 * inlines NODE_ENV at build time, so in a production build the condition is
 * the constant `"production" === "development"` and the import is dropped as
 * dead code; the sample module also throws if it is ever evaluated outside
 * development, so a bundler that kept it would still fail loudly rather than
 * show sample text to a customer.
 */
export async function getReviews(): Promise<readonly Review[]> {
  if (process.env.NODE_ENV === "development") {
    const { SAMPLE_REVIEWS } = await import("./reviews.sample");
    return SAMPLE_REVIEWS;
  }
  return REVIEWS;
}
