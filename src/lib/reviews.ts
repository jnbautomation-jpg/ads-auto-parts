// Customer reviews shown on the landing page.
//
// ⚠️ REAL REVIEWS ONLY. Every entry in REVIEWS must be copied word for word
// from a review a real customer left on the shop's public Google, Facebook or
// Yelp profile, with the name shown there and the month it was posted. Never
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

import { REVIEW_LINKS } from "@/lib/site";

export const REVIEW_SOURCES = ["Google", "Facebook", "Yelp"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export type Review = {
  /**
   * As shown on the profile: first name and last initial, e.g. "Maria G.", or
   * a business's name as-is when `business` is set.
   */
  author: string;
  /** The reviewer is a business (e.g. a body shop), not a person. */
  business?: true;
  /** Whole stars, 1–5, as left by the customer. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Verbatim, in the language the customer wrote it. Never translated. */
  text: string;
  source: ReviewSource;
  /**
   * The month the review was posted, as ISO year-month: "2026-08". Never a
   * day — Google shows only relative dates ("a month ago"), so the month is
   * approximate and the page displays month and year only.
   */
  date: string;
  /**
   * Link to where the review can be checked, so a visitor can see it is real.
   * Google gives individual reviews no stable URL, so Google reviews link to
   * the shop's Maps listing (REVIEW_LINKS.google).
   */
  sourceUrl?: string;
  /**
   * Language of `text`, when it differs from the page's — so a screen reader
   * reads a Spanish review in Spanish on the English site, and vice versa.
   */
  lang?: "en" | "es";
};

export const REVIEWS: readonly Review[] = [
  {
    author: "TJ D.",
    rating: 5,
    text: "Couldn't find a hood for my car anywhere online for under $500 shipped. Was referred here by my buddy Angel. Marcus took care of me, found me a hood & got me all squared away in like 10 mins. $352 out the door shipped. Great experience!",
    source: "Google",
    date: "2025-10",
    sourceUrl: REVIEW_LINKS.google,
  },
  {
    author: "Israel G.",
    rating: 5,
    text: "I would like to say thank you very much for the outstanding service I recommend Auto Door store to anyone e looking for body parts the fenders and bumpers came in on time and in excellent condition great work and great delivery service 👍",
    source: "Google",
    date: "2026-08",
    sourceUrl: REVIEW_LINKS.google,
  },
  {
    author: "Michel K.",
    rating: 5,
    text: "Great prices , way cheaper than any where else, awesome customer service, fast response and very fast delivery\nFully recommend\nThank you guys 🙏🙏🙏",
    source: "Google",
    date: "2025-09",
    sourceUrl: REVIEW_LINKS.google,
  },
  {
    author: "Alwayz Ready Auto Collision",
    business: true,
    rating: 5,
    text: "Best PRICES and great quality parts in Orlando hands down!!",
    source: "Google",
    date: "2026-06",
    sourceUrl: REVIEW_LINKS.google,
  },
  {
    author: "MocaCity M.",
    rating: 5,
    text: "Got my part deliver to me today !! Awesome service great flexibility and good delivery services !!!!",
    source: "Google",
    date: "2025-10",
    sourceUrl: REVIEW_LINKS.google,
  },
];

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
