// Shared landing implementation, rendered by / and /es.

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { buildLocalBusinessSchema, jsonLdScript } from "@/lib/structured-data";
import { TrustSignals } from "@/components/trust-signals";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { PART_SLUG_TO_TYPES } from "@/lib/format";
// Shop details come from the shared source of truth — they used to be
// re-declared here, which is how the site ended up advertising a stale
// contact address. Only the *styling* on this page is deliberately local.
import {
  ADDRESS,
  EMAIL,
  HOURS_DISPLAY_IN,
  MAPS_URL,
  ORG_SLUG,
  PHONE_DISPLAY,
  PHONE_HREF,
  PHONE_NOTE_IN,
} from "@/lib/site";
import { QuoteForm } from "./quote-form";
import { SiteHeader } from "./site-header";

// Search options come from the catalog itself. The hardcoded lists this
// replaced offered six makes with no stock (RAM, Subaru, BMW, Mercedes-Benz,
// Lexus, Acura) while omitting VW, Tesla and Chrysler, which do have stock —
// so the primary CTA could route a shopper straight into an empty result.
type SearchData = {
  makes: string[];
  models: string[];
  years: number[];
  countBySlug: Record<string, number>;
};

const EMPTY_SEARCH_DATA: SearchData = { makes: [], models: [], years: [], countBySlug: {} };

async function getSearchData(): Promise<SearchData> {
  // Prisma reads would otherwise resolve during prerendering and freeze these
  // lists at build time; stock changes through the admin UI, not a deploy.
  await connection();

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) return EMPTY_SEARCH_DATA;

  const fitWhere = { organizationId: organization.id, product: { isPublic: true } };
  const [makeRows, modelRows, yearBounds, partTypeCounts] = await Promise.all([
    prisma.vehicleFit.groupBy({ by: ["make"], where: fitWhere, orderBy: { make: "asc" } }),
    prisma.vehicleFit.findMany({
      where: fitWhere,
      distinct: ["model"],
      select: { model: true },
      orderBy: { model: "asc" },
    }),
    prisma.vehicleFit.aggregate({
      where: fitWhere,
      _min: { yearStart: true },
      _max: { yearEnd: true },
    }),
    prisma.product.groupBy({
      by: ["partType"],
      where: { organizationId: organization.id, isPublic: true },
      _count: { _all: true },
    }),
  ]);

  const countByType = new Map(partTypeCounts.map((r) => [String(r.partType), r._count._all]));
  const minYear = yearBounds._min.yearStart;
  const maxYear = yearBounds._max.yearEnd;

  return {
    makes: makeRows.map((r) => r.make),
    models: modelRows.map((r) => r.model),
    years:
      minYear != null && maxYear != null
        ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
        : [],
    // A tile spanning two enum values (Tailgates & Trunks) sums both.
    countBySlug: Object.fromEntries(
      Object.entries(PART_SLUG_TO_TYPES).map(([slug, types]) => [
        slug,
        types.reduce((sum, t) => sum + (countByType.get(t) ?? 0), 0),
      ]),
    ),
  };
}

const PARTS = [
  "Doors",
  "Hoods",
  "Fenders",
  "Bumpers",
  "Tailgates & Trunks",
  "Liftgates",
  "Quarter Panels",
  "Rear Body Panels",
  "Grilles",
  "Hinges",
  "Radiator Supports",
  "Reinforcement Bars",
];

// img is a direct /public/part-images path, not derived from PART_TYPE_IMAGES
// (src/lib/part-images.ts) — that map is keyed one-per-PartType, but the
// "Tailgates & Trunks" tile deliberately spans two enum values (TAILGATE +
// TRUNK), so each tile names its image explicitly instead.
// The hero's marketing labels map to tile slugs. Previously this was a
// lookup by tile NAME, which broke the moment names became translatable.
const PART_LABEL_TO_SLUG: Record<string, string> = {
  Doors: "doors",
  Hoods: "hoods",
  Fenders: "fenders",
  Bumpers: "bumpers",
  "Tailgates & Trunks": "tailgates-trunks",
  Liftgates: "liftgates",
  "Quarter Panels": "quarter-panels",
  "Rear Body Panels": "rear-body-panels",
  Grilles: "grilles",
  Hinges: "hinges",
  "Radiator Supports": "radiator-support",
  "Reinforcement Bars": "reinforcement-bars",
};

// Names and notes come from the dictionary — only structure lives here.
const TILES = [
  { slug: "doors", img: "/part-images/door.webp", alt: "Door" },
  { slug: "hoods", img: "/part-images/hood.webp", alt: "Hood" },
  { slug: "fenders", img: "/part-images/fender.webp", alt: "Fender" },
  { slug: "bumpers", img: "/part-images/bumper.webp", alt: "Bumper" },
  { slug: "tailgates-trunks", img: "/part-images/tailgate.webp", alt: "Tailgate" },
  // No liftgate.png — a liftgate is a rear hatch and reads the same as a
  // tailgate, same deliberate reuse as PART_TYPE_IMAGES.LIFTGATE.
  { slug: "liftgates", img: "/part-images/tailgate.webp", alt: "Liftgate" },
  { slug: "quarter-panels", img: "/part-images/quarter-panel.webp", alt: "Quarter panel" },
  { slug: "rear-body-panels", img: "/part-images/rear-body-panel.webp", alt: "Rear body panel" },
  { slug: "grilles", img: "/part-images/grille.webp", alt: "Grille" },
  { slug: "hinges", img: "/part-images/hinge.webp", alt: "Hinge" },
  { slug: "radiator-support", img: "/part-images/radiator-support.webp", alt: "Radiator support" },
  { slug: "reinforcement-bars", img: "/part-images/reinforcement-bar.webp", alt: "Reinforcement bar" },
];

function whyFor(dict: Dictionary) {
  return [
    { title: dict.landing.why.capaTitle, body: dict.landing.why.capaBody },
    { title: dict.landing.why.sameDayTitle, body: dict.landing.why.sameDayBody },
    { title: dict.landing.why.dispatchTitle, body: dict.landing.why.dispatchBody },
    { title: dict.landing.why.freeTitle, body: dict.landing.why.freeBody },
  ];
}

// PART CATEGORIES was hardcoded to 8 while the browse tiles below are
// filtered to categories that actually have stock — so the homepage could
// advertise a number the page itself contradicted. Derived from the same
// data now, per the spec's "generate from the database, never hardcode".
function statsFor(categoryCount: number, dict: Dictionary) {
  return [
    { target: 24, suffix: " HR", label: dict.landing.stats.dispatch },
    { target: 12, suffix: " PM", label: dict.landing.stats.cutoff },
    { target: 100, suffix: "%", label: dict.landing.stats.newParts },
    { target: categoryCount, suffix: "", label: dict.landing.stats.categories },
  ];
}

function stepsFor(dict: Dictionary) {
  return [
    { title: dict.landing.steps.orderTitle, body: dict.landing.steps.orderBody },
    { title: dict.landing.steps.dispatchTitle, body: dict.landing.steps.dispatchBody },
    { title: dict.landing.steps.deliverTitle, body: dict.landing.steps.deliverBody },
  ];
}


const selectClass =
  "h-[52px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[16px] font-medium text-white focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none lg:h-[56px]";

const badgeClass =
  "flex items-center gap-1.5 border border-[var(--line-on-band)] px-3 py-[7px] font-[family-name:var(--font-barlow)] text-[10.5px] font-semibold tracking-[0.1em] text-[var(--ink-on-band-muted)] lg:gap-2 lg:px-4 lg:py-[9px] lg:text-[12px]";

const contactRowClass =
  "flex items-center justify-between border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-[15px] text-[var(--ink)] transition-colors hover:border-[var(--accent)]/60 lg:px-[18px] lg:py-[17px]";
const contactLabelClass =
  "font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-faint)] lg:text-[12px] lg:tracking-[0.24em]";

const sectionHeadingClass =
  "font-[family-name:var(--font-oswald)] text-[24px] font-semibold uppercase tracking-[0.14em] lg:text-[36px]";

// Offsets the browser's built-in anchor scroll (native jump on click and on
// initial load with a #hash) so a section's top lands below the sticky
// header instead of underneath it. Values match the header's rendered
// height per breakpoint plus a little breathing room.
const sectionScrollMtClass = "scroll-mt-[72px] lg:scroll-mt-[92px]";

function TopBar({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div className="bg-[var(--accent)] px-3 py-2.5 text-center font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.12em] text-white lg:text-[12px] lg:tracking-[0.16em]">
      {dict.landing.ticker}
      <span className="hidden lg:inline">{dict.landing.tickerTail}</span>
    </div>
  );
}

function Hero({ data, locale }: { data: SearchData; locale: Locale }) {
  const dict = getDictionary(locale);
  // Same marketing labels, minus any category with nothing behind it. The
  // hero form still submits ENGLISH labels — the catalog resolves those to
  // part types server-side, so translating them here would break search.
  const parts = PARTS.filter((label) => {
    const slug = PART_LABEL_TO_SLUG[label];
    return slug ? (data.countBySlug[slug] ?? 0) > 0 : true;
  });

  // Split for the per-word reveal animation. Spanish word counts differ, so
  // this splits the translated string rather than hardcoding three words.
  const words1 = dict.landing.hero.line1.split(" ");
  const words2 = dict.landing.hero.line2.split(" ");

  return (
    <div
      id="hero"
      className="relative -mt-14 flex min-h-[730px] flex-col justify-center overflow-hidden bg-[#0A0A0A] text-[var(--ink-on-band)] px-4 pb-14 pt-[110px] lg:-mt-[72px] lg:min-h-[880px] lg:px-14 lg:pb-20 lg:pt-[180px]"
    >
      {/* Carbon-fiber texture, slowly drifting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "conic-gradient(from 45deg, #111 25%, #0c0c0c 0 50%, #111 0 75%, #0c0c0c 0)",
          backgroundSize: "12px 12px",
          animation: "drift 60s linear infinite alternate",
        }}
      />
      {/* Radial vignette so content stays legible */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, transparent 40%, #0A0A0A 90%)" }}
      />
      {/* Fine grain noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Light sweep */}
      <div
        className="pointer-events-none absolute inset-y-0 w-[36%] lg:w-[26%]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(227,30,36,0.07), transparent)",
          animation: "sweep 9s linear infinite",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1060px] flex-col gap-[18px] lg:gap-[26px]">
        <div className="flex items-center gap-2 lg:gap-2.5" style={{ animation: "rise 0.5s 0.05s both" }}>
          <div className="h-0.5 w-[24px] bg-[var(--accent)] lg:w-[34px]" />
          <div className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[var(--accent)] lg:text-[13px] lg:tracking-[0.32em]">
            {dict.landing.hero.eyebrow}
          </div>
        </div>

        <h1 className="font-[family-name:var(--font-oswald)] text-[38px] font-bold uppercase leading-[1.1] tracking-[0.05em] lg:max-w-[900px] lg:text-[72px] lg:leading-[1.06]">
          {words1.map((w, i) => (
            <span key={w} className="inline-block" style={{ animation: `rise 0.6s ${i * 0.04}s both` }}>
              {w}
              {i < words1.length - 1 ? " " : ""}
            </span>
          ))}
          <br />
          {words2.map((w, i) => (
            <span
              key={w}
              className="inline-block text-[var(--accent)]"
              style={{ animation: `rise 0.6s ${0.12 + i * 0.04}s both` }}
            >
              {w}
              {i < words2.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        <p
          className="font-[family-name:var(--font-barlow)] text-[15px] leading-[1.55] text-[#a8a8a8] lg:max-w-[620px] lg:text-[18px]"
          style={{ animation: "rise 0.6s 0.3s both" }}
        >
{dict.landing.hero.sub}
        </p>

        <form
          action={localePath(locale, "/catalog")}
          method="GET"
          className="flex flex-col gap-2.5 border border-white/8 border-t-2 border-t-[var(--accent)] bg-[#1A1A1A] p-4 lg:gap-3 lg:p-[22px]"
          style={{ animation: "rise 0.7s 0.45s both, glow 2.4s ease-out 0.9s both" }}
        >
          <div className="font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.26em] text-[#888] lg:text-[13px] lg:tracking-[0.28em]">
            {dict.landing.hero.searchByVehicle}
          </div>
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_230px] lg:gap-2.5">
            <select name="year" defaultValue="" className={selectClass}>
              <option value="" disabled>
                {dict.catalog.year}
              </option>
              {data.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select name="make" defaultValue="" className={selectClass}>
              <option value="" disabled>
                {dict.catalog.make}
              </option>
              {data.makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select name="model" defaultValue="" className={selectClass}>
              <option value="" disabled>
                {dict.catalog.model}
              </option>
              <option value="">{dict.landing.allModels}</option>
              {data.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select name="partType" defaultValue="" className={selectClass}>
              <option value="" disabled>
                {dict.catalog.partType}
              </option>
              {parts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-[56px] bg-[var(--accent)] font-[family-name:var(--font-oswald)] text-[16px] font-bold tracking-[0.2em] text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.97]"
            >
              {dict.landing.hero.searchParts}
            </button>
          </div>

          {/* The landing page never mentioned the VIN lookup — it was reachable
              only from the catalog header, where it is hidden below 640px. This
              sits inside the search card because that is where someone who has
              come to find a part is already looking, and a VIN is the surest
              way to get the right panel. */}
          <Link
            href={localePath(locale, "/vin")}
            className="group inline-flex items-center gap-2 self-start pt-0.5 font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#9A9A9A] transition-colors hover:text-white lg:text-[13.5px]"
          >
            {dict.landing.hero.vinPrompt}
            <span
              aria-hidden="true"
              className="text-[var(--accent)] transition-transform group-hover:translate-x-0.5"
            >
              &rarr;
            </span>
          </Link>
        </form>

        <div className="flex flex-wrap gap-2" style={{ animation: "rise 0.6s 0.7s both" }}>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[var(--accent)] lg:h-1.5 lg:w-1.5" />
            {dict.landing.heroBadges.capa}
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[var(--accent)] lg:h-1.5 lg:w-1.5" />
            {/* One string, with the desktop-only tail as a suffix — rendering
                both variants put "SAME-DAY CENTRAL FLSAME-DAY CENTRAL FL
                DELIVERY" in the markup (spec 1.12). */}
            {dict.landing.heroBadges.sameDay}
            <span className="hidden lg:inline">{dict.landing.heroBadges.sameDayTail}</span>
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[var(--accent)] lg:h-1.5 lg:w-1.5" />
            {dict.landing.heroBadges.dispatch}
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[var(--accent)] lg:h-1.5 lg:w-1.5" />
            {/* The two variants said the same thing in a different word
                order, so there is nothing to preserve — kept the shorter
                phrasing, which is the one that has to fit on mobile. */}
            {dict.landing.heroBadges.freeDelivery}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3.5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 lg:bottom-[18px]">
        <div className="font-[family-name:var(--font-barlow-condensed)] text-[9px] font-semibold tracking-[0.32em] text-[var(--ink-on-band-muted)] lg:text-[10px] lg:tracking-[0.36em]">
          SCROLL
        </div>
        <div className="h-[22px] w-px overflow-hidden bg-white/15 lg:h-[26px]">
          <div className="h-2 w-px bg-[var(--accent)]" style={{ animation: "cue 1.8s ease-in infinite" }} />
        </div>
      </div>
    </div>
  );
}

function BrowseByPart({
  countBySlug,
  locale,
}: {
  countBySlug: Record<string, number>;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  // Hinges, Radiator Supports and Reinforcement Bars have no stock — those
  // workbook tabs were never imported, so the tiles were dead ends.
  const tiles = TILES.filter((t) => (countBySlug[t.slug] ?? 0) > 0);

  return (
    <div id="parts" className={`px-4 py-14 lg:px-14 lg:py-[110px] ${sectionScrollMtClass}`}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-4 lg:gap-8">
        <Reveal>
          <div className="flex items-baseline justify-between">
            <h2 className={sectionHeadingClass}>{dict.landing.browseByPart}</h2>
            <div className="hidden font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.3em] text-[var(--accent-hover)] lg:block">
              {tiles.length} CATEGORIES · ALL NEW · NO SALVAGE
            </div>
          </div>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, var(--accent) 0 56px, var(--line) 56px)" }}
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {tiles.map((t, i) => (
            <Reveal key={t.slug} delay={i * 80}>
              <Link
                href={localePath(locale, `/catalog?part=${t.slug}`)}
                className="group block overflow-hidden border border-[var(--line)] bg-[var(--surface-raised)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/60 hover:shadow-[0_18px_44px_-14px_rgba(21,23,26,0.14)]"
              >
                <div className="h-[104px] overflow-hidden bg-[var(--surface-sunken)] lg:h-[150px]">
                  <div className="flex h-full w-full items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.img} alt={t.alt} className="h-[70%] w-[70%] object-contain opacity-90" />
                  </div>
                </div>
                <div className="h-0.5 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-[350ms] ease-out group-hover:scale-x-100" />
                <div className="flex items-center justify-between gap-1.5 px-3 py-2.5 lg:px-4 lg:py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="font-[family-name:var(--font-oswald)] text-[12.5px] font-semibold uppercase tracking-[0.1em] lg:text-[15px]">
                      {dict.landing.tiles[t.slug as keyof typeof dict.landing.tiles].name}
                    </div>
                    <div className="font-[family-name:var(--font-barlow)] text-[10.5px] text-[var(--ink-faint)] lg:text-[12px]">
                      {dict.landing.tiles[t.slug as keyof typeof dict.landing.tiles].note}
                    </div>
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[var(--accent)] lg:text-[16px]">
                    →
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhyADS({ categoryCount, locale }: { categoryCount: number; locale: Locale }) {
  const dict = getDictionary(locale);
  const stats = statsFor(categoryCount, dict);
  const why = whyFor(dict);
  return (
    <div
      id="why"
      className={`relative border-t border-[var(--line)] bg-[var(--surface-page)] px-4 py-14 lg:px-14 lg:py-[110px] ${sectionScrollMtClass}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto flex max-w-[1060px] flex-col gap-4 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>{dict.landing.whyHeading}</h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, var(--accent) 0 72px, var(--line) 72px)" }}
          />
        </Reveal>

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-4 lg:gap-3.5">
          {why.map((w, i) => (
            <Reveal key={w.title} delay={i * 80}>
              <div className="flex h-full gap-3.5 border border-[var(--line)] bg-[var(--surface-raised)] p-[18px] lg:flex-col lg:gap-3.5 lg:p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--accent)]/50 lg:h-10 lg:w-10">
                  <span className="h-2.5 w-2.5 rotate-45 bg-[var(--accent)] lg:h-3 lg:w-3" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold uppercase tracking-[0.14em] lg:text-[16px]">
                    {w.title}
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.5] text-[var(--ink-muted)] lg:text-[13.5px] lg:leading-[1.55]">
                    {w.body}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="grid grid-cols-2 gap-px border border-[var(--line)] bg-white/8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5 bg-[var(--surface-page)] p-[18px] lg:gap-2 lg:p-7">
                <div className="font-[family-name:var(--font-oswald)] text-[30px] font-bold tracking-[0.04em] text-[var(--ink)] lg:text-[44px]">
                  <CountUp target={s.target} />
                  <span className="text-[18px] text-[var(--accent)] lg:text-[24px]">{s.suffix}</span>
                </div>
                <div className="font-[family-name:var(--font-barlow-condensed)] text-[10px] font-semibold tracking-[0.24em] text-[var(--ink-faint)] lg:text-[11px] lg:tracking-[0.28em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function DeliverySection({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const steps = stepsFor(dict);
  return (
    <div id="delivery" className={`border-t border-[var(--line)] px-4 py-14 lg:px-14 lg:py-[110px] ${sectionScrollMtClass}`}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>{dict.landing.deliveryHeading}</h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, var(--accent) 0 72px, var(--line) 72px)" }}
          />
        </Reveal>

        <Reveal>
          <div className="inline-flex items-center gap-2 self-start border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2 font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.16em] text-[var(--accent)] lg:text-[13px]">
            <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--accent)]" />
            FREE DELIVERY IN ORLANDO
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-10">
          <div className="flex flex-col">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <div className="flex gap-[18px] pb-[22px] last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-[var(--accent)] lg:h-3 lg:w-3" />
                    {i < steps.length - 1 ? (
                      <div className="mt-2 w-px flex-1 bg-white/12" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold uppercase tracking-[0.12em] lg:text-[17px]">
                      {step.title}
                    </div>
                    <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.5] text-[var(--ink-muted)] lg:text-[14px] lg:leading-[1.55]">
                      {step.body}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="relative h-[220px] overflow-hidden border border-[var(--line)] bg-[var(--surface-raised)] lg:h-[340px]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(21,23,26,0.07) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(21,23,26,0.07) 0 1px, transparent 1px 34px)",
                }}
              />
              <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
                <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--accent)]" style={{ animation: "pulse-ring 2.2s ease-out infinite" }} />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              </div>
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2.5 bg-[var(--surface-band)]/92 text-[var(--ink-on-band)] px-3.5 py-3 lg:inset-x-4 lg:bottom-4 lg:px-[18px] lg:py-4">
                <div className="flex flex-col gap-0.5">
                  <div className="font-[family-name:var(--font-oswald)] text-[12px] font-semibold tracking-[0.12em] lg:text-[14px] lg:tracking-[0.14em]">
                    {dict.landing.warehouse}
                    <span className="hidden lg:inline">{dict.landing.warehouseTail}</span>
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[11.5px] text-[var(--ink-on-band-muted)] lg:text-[13px]">
                    {ADDRESS}
                  </div>
                </div>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.18em] text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] lg:text-[12px] lg:tracking-[0.2em]"
                >
                  <span className="hidden lg:inline">{dict.landing.openInMaps}</span>
                  {dict.landing.maps}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function ContactSection({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div
      id="contact"
      className={`border-t border-[var(--line)] bg-[var(--surface-page)] px-4 py-14 lg:px-14 lg:py-[110px] ${sectionScrollMtClass}`}
    >
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>
            {/* A heading carries SEO weight, and rendering both variants
                made the h2 read "Get a quoteTalk to a parts specialist".
                The two are different sentences, so one had to win. */}
            {dict.landing.contactHeading}
          </h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, var(--accent) 0 72px, var(--line) 72px)" }}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-10">
          <Reveal>
            <div className="flex flex-col gap-2">
              <a href={`tel:${PHONE_HREF}`} className={contactRowClass}>
                <span className={contactLabelClass}>{dict.landing.contact.call}</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`sms:${PHONE_HREF}`} className={contactRowClass}>
                <span className={contactLabelClass}>{dict.landing.contact.text}</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`mailto:${EMAIL}`} className={contactRowClass}>
                <span className={contactLabelClass}>{dict.landing.contact.email}</span>
                <span className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold lg:text-[14px]">
                  {EMAIL}
                </span>
              </a>
              <div className={`hidden lg:flex ${contactRowClass}`}>
                <span className={contactLabelClass}>{dict.landing.contact.visit}</span>
                <span className="font-[family-name:var(--font-barlow)] text-[14px] font-medium">{ADDRESS}</span>
              </div>
              <div className={`hidden lg:flex ${contactRowClass}`}>
                <span className={contactLabelClass}>{dict.landing.contact.hours}</span>
                <span className="flex flex-col items-end gap-1 text-right">
                  {/* Third hard-coded copy of the hours; site.ts owns them. */}
                  <span className="font-[family-name:var(--font-barlow)] text-[14px] font-medium">
                    {HOURS_DISPLAY_IN[locale]}
                  </span>
                  <span className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold tracking-[0.02em] text-[var(--accent)]">
                    {PHONE_NOTE_IN[locale]}
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <QuoteForm locale={locale} />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div className="border-t border-[var(--line-on-band)] bg-[var(--surface-band)] text-[var(--ink-on-band)] px-4 pt-10 lg:px-14 lg:pt-16">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-5 lg:gap-10">
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-3.5">
            <BrandLogo size="sm" />
            <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.6] text-[var(--ink-faint)] lg:max-w-[320px]">
              {dict.landing.footer.tagline}
            </div>
          </div>

          <div className="hidden flex-col gap-2 font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.1em] lg:flex">
            <div className="mb-1 font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[var(--ink-faint)]">
              {dict.landing.footer.site}
            </div>
            <a href="#parts" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              {dict.landing.nav.parts}
            </a>
            <a href="#why" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              {dict.landing.nav.why}
            </a>
            <a href="#delivery" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              {dict.landing.nav.delivery}
            </a>
            <a href="#contact" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              {dict.landing.nav.contact}
            </a>
          </div>

          <div className="flex flex-col gap-2 font-[family-name:var(--font-barlow)] text-[12px] leading-[1.8] text-[var(--ink-faint)] lg:text-[13px] lg:leading-[1.6] lg:text-[var(--ink-muted)]">
            <div className="hidden font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[var(--ink-faint)] lg:mb-1 lg:block">
              {dict.landing.nav.contact}
            </div>
            <div>{ADDRESS}</div>
            <a href={`tel:${PHONE_HREF}`} className="hover:text-[var(--ink)]">
              {PHONE_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-[var(--ink)]">
              {EMAIL}
            </a>
            {/* Was a second hard-coded copy of the hours and the phone note.
                site.ts is the single source for both — a hours change that
                edited site.ts and missed this line would have left the landing
                page advertising the old ones. */}
            <div className="text-[var(--ink-faint)] lg:text-[var(--ink-faint)]">{HOURS_DISPLAY_IN[locale]}</div>
            <div className="font-semibold text-[var(--accent)]">{PHONE_NOTE_IN[locale]}</div>
          </div>
        </div>

        {/* Mobile-only flat section nav (desktop uses the SITE column above) */}
        <div className="flex flex-wrap gap-5 font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.12em] lg:hidden">
          <a href="#parts" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
            {dict.landing.nav.parts}
          </a>
          <a href="#why" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
            {dict.landing.nav.why}
          </a>
          <a href="#delivery" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
            {dict.landing.nav.delivery}
          </a>
          <a href="#contact" className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
            {dict.landing.nav.contact}
          </a>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] py-3.5 font-[family-name:var(--font-barlow)] text-[11px] tracking-[0.06em] text-[var(--ink-faint)] lg:py-4">
          {/* The year was hard-coded, so the notice would have read 2026 for
              as long as the site was up. */}
          <div>© {new Date().getFullYear()} AUTO DOOR STORE · ORLANDO, FL</div>
          <div className="flex items-center gap-[18px]">
            <div className="hidden lg:block">{dict.landing.footer.strip}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function LandingView({ locale }: { locale: Locale }) {
  const data = await getSearchData();
  // Same predicate BrowseByPart uses to filter its tiles, so the headline
  // number and the tiles can never disagree.
  const stockedCategoryCount = TILES.filter((t) => (data.countBySlug[t.slug] ?? 0) > 0).length;

  return (
    <main>
      {/* LocalBusiness markup (spec 1.13) — address, phone and hours for the
          Google business panel. Structured data only; no visual change. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildLocalBusinessSchema()) }}
      />
      <TopBar locale={locale} />
      <SiteHeader heroId="hero" locale={locale} />
      <Hero data={data} locale={locale} />
      <BrowseByPart countBySlug={data.countBySlug} locale={locale} />
      <WhyADS categoryCount={stockedCategoryCount} locale={locale} />
      <DeliverySection locale={locale} />
      <TrustSignals locale={locale} />
      <ContactSection locale={locale} />
      <SiteFooter locale={locale} />
    </main>
  );
}
