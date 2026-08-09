import Link from "next/link";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { formatPartType, PART_SLUG_LABELS, PART_SLUG_TO_TYPES } from "@/lib/format";
import {
  ADDRESS,
  EMAIL,
  HOURS_DISPLAY,
  MAPS_URL,
  ORG_SLUG,
  PHONE_DISPLAY,
  PHONE_HREF,
  PHONE_NOTE,
} from "@/lib/site";
import {
  bodyClass,
  eyebrowClass,
  focusRingClass,
  h1Class,
  sectionHeadingClass,
  subHeadingClass,
} from "@/lib/public-ui";
import { QuoteForm } from "./quote-form";
import { SiteHeader } from "./site-header";

// Every option in the hero search comes from the catalog itself — never a
// hardcoded list. The list this replaced offered six makes with zero stock
// (RAM, Subaru, BMW, Mercedes-Benz, Lexus, Acura) while omitting VW, Tesla
// and Chrysler, which do have stock, so the site's primary CTA could route a
// shopper straight into an empty result.
type Category = { slug: string; label: string; count: number };

type SearchOptions = {
  makes: string[];
  years: number[];
  partTypes: { value: string; label: string; count: number }[];
  categories: Category[];
  totalParts: number;
};

const EMPTY_OPTIONS: SearchOptions = {
  makes: [],
  years: [],
  partTypes: [],
  categories: [],
  totalParts: 0,
};

async function getSearchOptions(): Promise<SearchOptions> {
  // Prisma queries would otherwise resolve during prerendering and bake these
  // counts in at build time — the owner adds stock through the admin UI, not a
  // deploy, so a statically frozen "330 doors" would go stale immediately.
  // `connection()` is how Next 16 opts a route into request-time rendering now
  // that `export const dynamic` / `revalidate` are gone.
  await connection();

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) return EMPTY_OPTIONS;

  // Makes and years come from VehicleFit (a part can fit several vehicles);
  // part types come from Product. Same split the catalog's own search band
  // uses, so the two forms can't disagree about what's in stock.
  const publicFitWhere = { organizationId: organization.id, product: { isPublic: true } };
  const publicProductWhere = { organizationId: organization.id, isPublic: true };

  const [makeRows, yearBounds, partTypeCounts, totalParts] = await Promise.all([
    prisma.vehicleFit.groupBy({ by: ["make"], where: publicFitWhere, orderBy: { make: "asc" } }),
    prisma.vehicleFit.aggregate({
      where: publicFitWhere,
      _min: { yearStart: true },
      _max: { yearEnd: true },
    }),
    prisma.product.groupBy({
      by: ["partType"],
      where: publicProductWhere,
      _count: { _all: true },
    }),
    prisma.product.count({ where: publicProductWhere }),
  ]);

  const countByType = new Map(partTypeCounts.map((row) => [String(row.partType), row._count._all]));

  const minYear = yearBounds._min.yearStart;
  const maxYear = yearBounds._max.yearEnd;

  return {
    makes: makeRows.map((row) => row.make),
    years:
      minYear != null && maxYear != null
        ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
        : [],
    partTypes: partTypeCounts
      .map((row) => ({
        value: String(row.partType),
        label: formatPartType(String(row.partType)),
        count: row._count._all,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    // Ordered by real stock depth, so the tile grid below can lead with what
    // the shop actually has rather than giving 330 doors and 1 grille the same
    // weight. Categories with no stock never render — three of them (Hinges,
    // Radiator Supports, Reinforcement Bars) were linking to guaranteed-empty
    // results because those workbook tabs have never been imported.
    categories: Object.entries(PART_SLUG_TO_TYPES)
      .map(([slug, types]) => ({
        slug,
        label: PART_SLUG_LABELS[slug] ?? slug,
        count: types.reduce((sum, type) => sum + (countByType.get(type) ?? 0), 0),
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
    totalParts,
  };
}

// One image per tile slug — not derived from PART_TYPE_IMAGES, because that map
// is keyed one-per-PartType and the "Tailgates & Trunks" tile deliberately
// spans two enum values. alt is empty on purpose: the category name sits
// directly beside the image, so announcing it twice is noise.
const TILE_IMAGES: Record<string, string> = {
  doors: "/part-images/door.webp",
  hoods: "/part-images/hood.webp",
  fenders: "/part-images/fender.webp",
  bumpers: "/part-images/bumper.webp",
  "tailgates-trunks": "/part-images/tailgate.webp",
  // A liftgate is a rear hatch and reads the same as a tailgate — the same
  // deliberate reuse as PART_TYPE_IMAGES.LIFTGATE.
  liftgates: "/part-images/tailgate.webp",
  "quarter-panels": "/part-images/quarter-panel.webp",
  "rear-body-panels": "/part-images/rear-body-panel.webp",
  grilles: "/part-images/grille.webp",
  hinges: "/part-images/hinge.webp",
  "radiator-support": "/part-images/radiator-support.webp",
  "reinforcement-bars": "/part-images/reinforcement-bar.webp",
};

// Below this, a category doesn't earn a tile — it gets a text link instead.
const TILE_MIN_COUNT = 4;

const WHY = [
  {
    title: "New, never salvage",
    body: "Every part is new aftermarket stock — not pulled from a wrecked car, not refinished.",
  },
  {
    title: "Same-day across Central Florida",
    body: "Order before 12 PM and it reaches your shop the same day, anywhere in Central Florida.",
  },
  {
    title: "Dispatched within 24 hours",
    body: "Most orders leave the Orlando warehouse within a day of being placed.",
  },
  {
    title: "Free delivery in Orlando",
    body: "No delivery fee inside Orlando city limits — every order, no minimum.",
  },
];

const DELIVERY_STEPS = [
  {
    title: "Order by 12 PM",
    body: "Call, text, or send the quote form with your vehicle and the part you need.",
  },
  {
    title: "Dispatched within 24 hours",
    body: "Most orders leave our Orlando warehouse the same day they're placed.",
  },
  {
    title: "Same-day across Central FL",
    body: "Delivered to your shop or door — free within Orlando — or pick up locally at the warehouse.",
  },
];

const selectClass = `h-[52px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[16px] font-medium text-white focus:border-[#E31E24] ${focusRingClass} lg:h-[56px]`;

const contactRowClass =
  "flex items-center justify-between gap-4 border border-white/8 bg-[#1A1A1A] px-4 py-[15px] text-white transition-colors hover:border-[#E31E24]/60 lg:px-[18px] lg:py-[17px]";

// Offsets the browser's built-in anchor scroll (native jump on click and on
// initial load with a #hash) so a section's top lands below the sticky
// header instead of underneath it.
const sectionScrollMtClass = "scroll-mt-[72px] lg:scroll-mt-[92px]";

const sectionClass = `border-t border-white/8 px-4 py-16 lg:px-14 lg:py-24 ${sectionScrollMtClass}`;

function Hero({ options }: { options: SearchOptions }) {
  return (
    <div
      id="hero"
      className="relative -mt-14 flex min-h-[560px] flex-col justify-center overflow-hidden bg-[#0A0A0A] px-4 pb-14 pt-[92px] lg:-mt-[72px] lg:min-h-[640px] lg:px-14 lg:pb-16 lg:pt-[132px]"
    >
      {/* The one background layer that does a job: keeps the headline legible
          against the top of the page. The drifting carbon-fibre weave, the
          grain noise and the sweeping red light that used to sit here carried
          no information and delayed the only element anyone came for. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, transparent 40%, #0A0A0A 90%)" }}
      />

      <div className="relative mx-auto flex w-full max-w-[1060px] flex-col gap-5 lg:gap-7">
        <h1 className={`${h1Class} lg:max-w-[18ch]`}>
          Find your part.
          <br />
          <span className="text-[#E31E24]">Brand new. Today.</span>
        </h1>

        <p className={`${bodyClass} lg:max-w-[54ch]`}>
          {options.totalParts > 0 ? `${options.totalParts.toLocaleString()} new ` : "New "}
          aftermarket body parts on the shelf in Orlando — doors, hoods, fenders, bumpers and more.
        </p>

        <form
          action="/catalog"
          method="GET"
          className="flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-4 lg:gap-3 lg:p-[22px]"
        >
          <div className={eyebrowClass}>Search by vehicle</div>
          {/* Three selects, not four: the model dropdown this replaced had
              `value=""` on both of its options, so it could never produce a
              filter. Model selection happens on the catalog itself, where the
              list can narrow to the chosen make. */}
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[1fr_1.2fr_1.4fr_200px] lg:gap-2.5">
            <label htmlFor="hero-year" className="sr-only">
              Year
            </label>
            <select id="hero-year" name="year" defaultValue="" className={selectClass}>
              <option value="">Year</option>
              {options.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <label htmlFor="hero-make" className="sr-only">
              Make
            </label>
            <select id="hero-make" name="make" defaultValue="" className={selectClass}>
              <option value="">Make</option>
              {options.makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="hero-part" className="sr-only">
              Part type
            </label>
            <select id="hero-part" name="partType" defaultValue="" className={selectClass}>
              <option value="">Part type</option>
              {options.partTypes.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.count})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={`h-[52px] bg-[#E31E24] font-[family-name:var(--font-barlow)] text-[15px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#ff3a40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:h-[56px]`}
            >
              Search parts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryTile({ category, featured }: { category: Category; featured: boolean }) {
  return (
    <Link
      href={`/catalog?part=${category.slug}`}
      className={`group flex flex-col border border-white/8 bg-[#1A1A1A] transition-colors hover:border-[#E31E24]/60 ${focusRingClass} ${
        featured ? "col-span-2" : ""
      }`}
    >
      <div
        className={`flex items-center justify-center overflow-hidden bg-[#111] ${
          featured ? "h-[132px] lg:h-[196px]" : "h-[104px] lg:h-[150px]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TILE_IMAGES[category.slug]}
          alt=""
          className="h-[70%] w-[70%] object-contain opacity-90"
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 px-3 py-3 lg:px-4 lg:py-3.5">
        <span className={subHeadingClass}>{category.label}</span>
        {/* The live count, where a decorative arrow used to sit — "330" is the
            most persuasive thing this tile can say, and it costs nothing. */}
        <span className="shrink-0 font-mono text-[13px] text-[#8A8A8A]">{category.count}</span>
      </div>
    </Link>
  );
}

function BrowseByPart({ categories }: { categories: Category[] }) {
  const tiled = categories.filter((c) => c.count >= TILE_MIN_COUNT);
  const thin = categories.filter((c) => c.count < TILE_MIN_COUNT);

  return (
    <div id="parts" className={sectionClass}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
          <h2 className={sectionHeadingClass}>Browse by part</h2>

        {/* The deepest category leads at double width. Doors are 330 of 592
            parts; giving them the same tile as a single grille told the
            visitor nothing about what this shop actually stocks. */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {tiled.map((c, i) => (
            <CategoryTile key={c.slug} category={c} featured={i === 0} />
          ))}
        </div>

        {thin.length > 0 ? (
            <p className={bodyClass}>
              Also in stock:{" "}
              {thin.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 ? " · " : ""}
                  <Link
                    href={`/catalog?part=${c.slug}`}
                    className={`text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#E31E24] ${focusRingClass}`}
                  >
                    {c.label}
                  </Link>{" "}
                  <span className="font-mono text-[13px] text-[#8A8A8A]">({c.count})</span>
                </span>
              ))}
            </p>
        ) : null}
      </div>
    </div>
  );
}

function WhyADS() {
  return (
    <div id="why" className={`bg-[#0C0C0C] ${sectionClass}`}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
          <h2 className={sectionHeadingClass}>Why ADS</h2>

        {/* The animated 0 HR / 0 PM / 0% / 0 counter strip that used to close
            this section is gone. It server-rendered as a row of zeros, its
            "8 part categories" figure matched neither the 12 advertised nor
            the 10 in stock, and every fact in it is already stated here. */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.title} className="flex flex-col gap-1.5">
              <h3 className={subHeadingClass}>{w.title}</h3>
              <p className={bodyClass}>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliverySection() {
  return (
    <div id="delivery" className={sectionClass}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
          <h2 className={sectionHeadingClass}>Delivery &amp; pickup</h2>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="flex flex-col gap-6">
            {DELIVERY_STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <span className="mt-0.5 shrink-0 font-mono text-[13px] text-[#8A8A8A]">{i + 1}</span>
                  <div className="flex flex-col gap-1">
                    <h3 className={subHeadingClass}>{step.title}</h3>
                    <p className={bodyClass}>{step.body}</p>
                  </div>
                </div>
            ))}
          </div>

          {/* Was a decorative fake map — a grid of lines with a pulsing red dot
              that represented no real location. Replaced with the details
              somebody driving over actually needs. */}
            <div className="flex flex-col gap-4 border border-white/8 bg-[#1A1A1A] p-5 lg:p-6">
              <h3 className={subHeadingClass}>Pick up at the warehouse</h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className={eyebrowClass}>Address</span>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-[family-name:var(--font-barlow)] text-[15px] text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#E31E24] ${focusRingClass}`}
                  >
                    {ADDRESS}
                  </a>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={eyebrowClass}>Hours</span>
                  <span className="font-[family-name:var(--font-barlow)] text-[15px] text-white">
                    {HOURS_DISPLAY}
                  </span>
                  <span className={bodyClass}>{PHONE_NOTE}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={eyebrowClass}>Delivery</span>
                  <span className={bodyClass}>
                    Free inside Orlando city limits. Same-day across Central Florida on orders placed
                    before 12 PM.
                  </span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <div id="contact" className={`bg-[#0C0C0C] ${sectionClass}`}>
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
          <h2 className={sectionHeadingClass}>Talk to a parts specialist</h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-10">
            <div className="flex flex-col gap-2">
              <a href={`tel:${PHONE_HREF}`} className={contactRowClass}>
                <span className={eyebrowClass}>Call</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`sms:${PHONE_HREF}`} className={contactRowClass}>
                <span className={eyebrowClass}>Text</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`mailto:${EMAIL}`} className={contactRowClass}>
                <span className={eyebrowClass}>Email</span>
                <span className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold lg:text-[14px]">
                  {EMAIL}
                </span>
              </a>
              <div className={`hidden lg:flex ${contactRowClass}`}>
                <span className={eyebrowClass}>Hours</span>
                <span className="text-right font-[family-name:var(--font-barlow)] text-[14px]">
                  {HOURS_DISPLAY}
                </span>
              </div>
            </div>
            <QuoteForm />
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const options = await getSearchOptions();

  return (
    <main>
      {/* No red announcement bar above the header: the same-day claim it made
          appeared eight more times across the site, and the Delivery section
          below makes it properly, with the detail that actually matters. */}
      <SiteHeader heroId="hero" />
      <Hero options={options} />
      <BrowseByPart categories={options.categories} />
      <WhyADS />
      <DeliverySection />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
