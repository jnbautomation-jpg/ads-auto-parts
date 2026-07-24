import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { QuoteForm } from "./quote-form";
import { SiteHeader } from "./site-header";

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const MAKES = [
  "Toyota",
  "Honda",
  "Ford",
  "Chevrolet",
  "Nissan",
  "Hyundai",
  "Kia",
  "Dodge",
  "RAM",
  "Jeep",
  "GMC",
  "Volkswagen",
  "Subaru",
  "Mazda",
  "BMW",
  "Mercedes-Benz",
  "Lexus",
  "Acura",
];

const PARTS = [
  "Doors",
  "Hoods",
  "Fenders",
  "Bumpers",
  "Tailgates & Trunks",
  "Liftgates",
  "Quarter Panels",
  "Rear Body Panels",
];

const TILES = [
  { name: "Doors", note: "Front & rear · shells & skins", slug: "doors", ph: "door panel photo" },
  { name: "Hoods", note: "Steel & aluminum", slug: "hoods", ph: "hood photo" },
  { name: "Fenders", note: "Left & right", slug: "fenders", ph: "fender photo" },
  { name: "Bumpers", note: "Covers & reinforcements", slug: "bumpers", ph: "bumper photo" },
  { name: "Tailgates & Trunks", note: "Trucks & sedans", slug: "tailgates-trunks", ph: "tailgate photo" },
  { name: "Liftgates", note: "SUVs & hatchbacks", slug: "liftgates", ph: "liftgate photo" },
  { name: "Quarter Panels", note: "Full & partial", slug: "quarter-panels", ph: "quarter panel photo" },
  { name: "Rear Body Panels", note: "Rear body & valance", slug: "rear-body-panels", ph: "rear panel photo" },
];

const WHY = [
  {
    title: "CAPA Certified Quality",
    body: "New aftermarket parts built to certified fit & finish standards — never used salvage.",
  },
  {
    title: "Same-Day Central FL",
    body: "Order before 12 PM and it's on your bumper the same day, anywhere in Central Florida.",
  },
  { title: "24-Hour Dispatch", body: "Most orders leave our Orlando warehouse within 24 hours of the order." },
  { title: "Free Delivery In Orlando", body: "No delivery fee on orders within Orlando city limits — every time, no minimum." },
];

const STATS = [
  { target: 24, suffix: " HR", label: "DISPATCH" },
  { target: 12, suffix: " PM", label: "SAME-DAY CUTOFF" },
  { target: 100, suffix: "%", label: "NEW PARTS" },
  { target: 8, suffix: "", label: "PART CATEGORIES" },
];

const DELIVERY_STEPS = [
  { title: "Order by 12 PM", body: "Call, text, or send the quote form with your vehicle and the part you need." },
  {
    title: "Dispatched within 24 hours",
    body: "Most orders leave our Orlando warehouse the same day they're placed.",
  },
  {
    title: "Same-day across Central FL",
    body: "Delivered to your shop or door — free within Orlando — or skip the wait and pick up locally at the warehouse.",
  },
];

const PHONE_DISPLAY = "(407) 743-4644";
const PHONE_HREF = "4077434644";
const EMAIL = "autodoorstorewest@gmail.com";
const ADDRESS = "6950 Venture Cir, Orlando, FL 32807";
const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`;

const selectClass =
  "h-[52px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[16px] font-medium text-white focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none lg:h-[56px]";

const badgeClass =
  "flex items-center gap-1.5 border border-white/10 px-3 py-[7px] font-[family-name:var(--font-barlow)] text-[10.5px] font-semibold tracking-[0.1em] text-[#ccc] lg:gap-2 lg:px-4 lg:py-[9px] lg:text-[12px]";

const contactRowClass =
  "flex items-center justify-between border border-white/8 bg-[#1A1A1A] px-4 py-[15px] text-white transition-colors hover:border-[#E31E24]/60 lg:px-[18px] lg:py-[17px]";
const contactLabelClass =
  "font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.22em] text-[#777] lg:text-[12px] lg:tracking-[0.24em]";

const sectionHeadingClass =
  "font-[family-name:var(--font-oswald)] text-[24px] font-semibold uppercase tracking-[0.14em] lg:text-[36px]";

function TopBar() {
  return (
    <div className="bg-[#E31E24] px-3 py-2.5 text-center font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.12em] text-white lg:text-[12px] lg:tracking-[0.16em]">
      SAME-DAY DELIVERY ACROSS CENTRAL FLORIDA — ORDER BY 12 PM
      <span className="hidden lg:inline"> · MOST ORDERS DISPATCHED WITHIN 24 HOURS</span>
    </div>
  );
}

function Hero() {
  const words1 = ["Find", "your", "part."];
  const words2 = ["Brand", "new.", "Today."];

  return (
    <div
      id="hero"
      className="relative -mt-14 flex min-h-[730px] flex-col justify-center overflow-hidden bg-[#0A0A0A] px-4 pb-14 pt-[110px] lg:-mt-[72px] lg:min-h-[880px] lg:px-14 lg:pb-20 lg:pt-[180px]"
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
          <div className="h-0.5 w-[24px] bg-[#E31E24] lg:w-[34px]" />
          <div className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[#E31E24] lg:text-[13px] lg:tracking-[0.32em]">
            NEW AFTERMARKET BODY PARTS · ORLANDO, FL
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
              className="inline-block text-[#E31E24]"
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
          Doors, hoods, fenders, bumpers and more — new, CAPA certified, delivered same-day across Central
          Florida on orders before 12 PM.
        </p>

        <form
          action="/catalog"
          method="GET"
          className="flex flex-col gap-2.5 border border-white/8 border-t-2 border-t-[#E31E24] bg-[#1A1A1A] p-4 lg:gap-3 lg:p-[22px]"
          style={{ animation: "rise 0.7s 0.45s both, glow 2.4s ease-out 0.9s both" }}
        >
          <div className="font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.26em] text-[#888] lg:text-[13px] lg:tracking-[0.28em]">
            SEARCH BY VEHICLE
          </div>
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_230px] lg:gap-2.5">
            <select name="year" defaultValue="" className={selectClass}>
              <option value="" disabled>
                Year
              </option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select name="make" defaultValue="" className={selectClass}>
              <option value="" disabled>
                Make
              </option>
              {MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select name="model" defaultValue="" className={selectClass}>
              <option value="" disabled>
                Model
              </option>
              <option value="">All models</option>
            </select>
            <select name="partType" defaultValue="" className={selectClass}>
              <option value="" disabled>
                Part type
              </option>
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-[56px] bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[16px] font-bold tracking-[0.2em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97]"
            >
              SEARCH PARTS
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2" style={{ animation: "rise 0.6s 0.7s both" }}>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[#E31E24] lg:h-1.5 lg:w-1.5" />
            CAPA CERTIFIED
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[#E31E24] lg:h-1.5 lg:w-1.5" />
            <span className="lg:hidden">SAME-DAY CENTRAL FL</span>
            <span className="hidden lg:inline">SAME-DAY CENTRAL FL DELIVERY</span>
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[#E31E24] lg:h-1.5 lg:w-1.5" />
            24-HR DISPATCH
          </div>
          <div className={badgeClass}>
            <span className="h-[5px] w-[5px] rotate-45 bg-[#E31E24] lg:h-1.5 lg:w-1.5" />
            <span className="lg:hidden">FREE ORLANDO DELIVERY</span>
            <span className="hidden lg:inline">FREE DELIVERY IN ORLANDO</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3.5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 lg:bottom-[18px]">
        <div className="font-[family-name:var(--font-barlow-condensed)] text-[9px] font-semibold tracking-[0.32em] text-[#666] lg:text-[10px] lg:tracking-[0.36em]">
          SCROLL
        </div>
        <div className="h-[22px] w-px overflow-hidden bg-white/15 lg:h-[26px]">
          <div className="h-2 w-px bg-[#E31E24]" style={{ animation: "cue 1.8s ease-in infinite" }} />
        </div>
      </div>
    </div>
  );
}

function BrowseByPart() {
  return (
    <div id="parts" className="px-4 py-14 lg:px-14 lg:py-[110px]">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-4 lg:gap-8">
        <Reveal>
          <div className="flex items-baseline justify-between">
            <h2 className={sectionHeadingClass}>Browse by part</h2>
            <div className="hidden font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.3em] text-[#E31E24] lg:block">
              8 CATEGORIES · ALL NEW · NO SALVAGE
            </div>
          </div>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, #E31E24 0 56px, rgba(255,255,255,0.1) 56px)" }}
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {TILES.map((t, i) => (
            <Reveal key={t.slug} delay={i * 80}>
              <Link
                href={`/catalog?part=${t.slug}`}
                className="group block overflow-hidden border border-white/8 bg-[#1A1A1A] transition-all duration-300 hover:-translate-y-1 hover:border-[#E31E24]/60 hover:shadow-[0_18px_44px_-14px_rgba(0,0,0,0.85)]"
              >
                <div className="h-[104px] overflow-hidden bg-[#111] lg:h-[150px]">
                  <div
                    className="flex h-full w-full items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105"
                    style={{
                      backgroundImage: "repeating-linear-gradient(45deg, #161616 0 10px, #121212 10px 20px)",
                    }}
                  >
                    <span className="font-mono text-[9px] text-[#555] lg:text-[10px]">[{t.ph}]</span>
                  </div>
                </div>
                <div className="h-0.5 origin-left scale-x-0 bg-[#E31E24] transition-transform duration-[350ms] ease-out group-hover:scale-x-100" />
                <div className="flex items-center justify-between gap-1.5 px-3 py-2.5 lg:px-4 lg:py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="font-[family-name:var(--font-oswald)] text-[12.5px] font-semibold uppercase tracking-[0.1em] lg:text-[15px]">
                      {t.name}
                    </div>
                    <div className="font-[family-name:var(--font-barlow)] text-[10.5px] text-[#888] lg:text-[12px]">
                      {t.note}
                    </div>
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[#E31E24] lg:text-[16px]">
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

function WhyADS() {
  return (
    <div id="why" className="relative border-t border-white/6 bg-[#0C0C0C] px-4 py-14 lg:px-14 lg:py-[110px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto flex max-w-[1060px] flex-col gap-4 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>Why ADS</h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, #E31E24 0 72px, rgba(255,255,255,0.1) 72px)" }}
          />
        </Reveal>

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-4 lg:gap-3.5">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 80}>
              <div className="flex h-full gap-3.5 border border-white/8 bg-[#1A1A1A] p-[18px] lg:flex-col lg:gap-3.5 lg:p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#E31E24]/50 lg:h-10 lg:w-10">
                  <span className="h-2.5 w-2.5 rotate-45 bg-[#E31E24] lg:h-3 lg:w-3" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold uppercase tracking-[0.14em] lg:text-[16px]">
                    {w.title}
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.5] text-[#a0a0a0] lg:text-[13.5px] lg:leading-[1.55]">
                    {w.body}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="grid grid-cols-2 gap-px border border-white/8 bg-white/8 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5 bg-[#0C0C0C] p-[18px] lg:gap-2 lg:p-7">
                <div className="font-[family-name:var(--font-oswald)] text-[30px] font-bold tracking-[0.04em] text-white lg:text-[44px]">
                  <CountUp target={s.target} />
                  <span className="text-[18px] text-[#E31E24] lg:text-[24px]">{s.suffix}</span>
                </div>
                <div className="font-[family-name:var(--font-barlow-condensed)] text-[10px] font-semibold tracking-[0.24em] text-[#777] lg:text-[11px] lg:tracking-[0.28em]">
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

function DeliverySection() {
  return (
    <div id="delivery" className="border-t border-white/6 px-4 py-14 lg:px-14 lg:py-[110px]">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>Delivery &amp; pickup</h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, #E31E24 0 72px, rgba(255,255,255,0.1) 72px)" }}
          />
        </Reveal>

        <Reveal>
          <div className="inline-flex items-center gap-2 self-start border border-[#E31E24]/50 bg-[#E31E24]/10 px-4 py-2 font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.16em] text-[#E31E24] lg:text-[13px]">
            <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-[#E31E24]" />
            FREE DELIVERY IN ORLANDO
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-10">
          <div className="flex flex-col">
            {DELIVERY_STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <div className="flex gap-[18px] pb-[22px] last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-[#E31E24] lg:h-3 lg:w-3" />
                    {i < DELIVERY_STEPS.length - 1 ? (
                      <div className="mt-2 w-px flex-1 bg-white/12" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold uppercase tracking-[0.12em] lg:text-[17px]">
                      {step.title}
                    </div>
                    <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.5] text-[#a0a0a0] lg:text-[14px] lg:leading-[1.55]">
                      {step.body}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="relative h-[220px] overflow-hidden border border-white/8 bg-[#1A1A1A] lg:h-[340px]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px)",
                }}
              />
              <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
                <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E31E24]" style={{ animation: "pulse-ring 2.2s ease-out infinite" }} />
                <div className="h-2.5 w-2.5 rounded-full bg-[#E31E24]" />
              </div>
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2.5 bg-[#080808]/92 px-3.5 py-3 lg:inset-x-4 lg:bottom-4 lg:px-[18px] lg:py-4">
                <div className="flex flex-col gap-0.5">
                  <div className="font-[family-name:var(--font-oswald)] text-[12px] font-semibold tracking-[0.12em] lg:text-[14px] lg:tracking-[0.14em]">
                    <span className="lg:hidden">ADS WAREHOUSE</span>
                    <span className="hidden lg:inline">ADS WAREHOUSE — LOCAL PICKUP AVAILABLE</span>
                  </div>
                  <div className="font-[family-name:var(--font-barlow)] text-[11.5px] text-[#999] lg:text-[13px]">
                    {ADDRESS}
                  </div>
                </div>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.18em] text-[#E31E24] transition-colors hover:text-[#ff4a50] lg:text-[12px] lg:tracking-[0.2em]"
                >
                  <span className="lg:hidden">MAP →</span>
                  <span className="hidden lg:inline">OPEN IN MAPS →</span>
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <div id="contact" className="border-t border-white/6 bg-[#0C0C0C] px-4 py-14 lg:px-14 lg:py-[110px]">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:gap-8">
        <Reveal>
          <h2 className={sectionHeadingClass}>
            <span className="lg:hidden">Get a quote</span>
            <span className="hidden lg:inline">Talk to a parts specialist</span>
          </h2>
        </Reveal>
        <Reveal variant="rule">
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, #E31E24 0 72px, rgba(255,255,255,0.1) 72px)" }}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-10">
          <Reveal>
            <div className="flex flex-col gap-2">
              <a href={`tel:${PHONE_HREF}`} className={contactRowClass}>
                <span className={contactLabelClass}>CALL</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`sms:${PHONE_HREF}`} className={contactRowClass}>
                <span className={contactLabelClass}>TEXT</span>
                <span className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold lg:text-[16px]">
                  {PHONE_DISPLAY}
                </span>
              </a>
              <a href={`mailto:${EMAIL}`} className={contactRowClass}>
                <span className={contactLabelClass}>EMAIL</span>
                <span className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold lg:text-[14px]">
                  {EMAIL}
                </span>
              </a>
              <div className={`hidden lg:flex ${contactRowClass}`}>
                <span className={contactLabelClass}>VISIT</span>
                <span className="font-[family-name:var(--font-barlow)] text-[14px] font-medium">{ADDRESS}</span>
              </div>
              <div className={`hidden lg:flex ${contactRowClass}`}>
                <span className={contactLabelClass}>HOURS</span>
                <span className="font-[family-name:var(--font-barlow)] text-[14px] font-medium">
                  Mon–Fri · call to confirm
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <QuoteForm />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <div className="border-t border-white/6 bg-[#070707] px-4 pt-10 lg:px-14 lg:pt-16">
      <div className="mx-auto flex max-w-[1060px] flex-col gap-5 lg:gap-10">
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-3.5">
            <BrandLogo size="sm" />
            <div className="font-[family-name:var(--font-barlow)] text-[13px] leading-[1.6] text-[#888] lg:max-w-[320px]">
              New aftermarket auto body parts — never used salvage. CAPA certified fit and finish, dispatched
              from Orlando within 24 hours.
            </div>
          </div>

          <div className="hidden flex-col gap-2 font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.1em] lg:flex">
            <div className="mb-1 font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[#666]">
              SITE
            </div>
            <a href="#parts" className="text-[#aaa] transition-colors hover:text-white">
              PARTS
            </a>
            <a href="#why" className="text-[#aaa] transition-colors hover:text-white">
              WHY ADS
            </a>
            <a href="#delivery" className="text-[#aaa] transition-colors hover:text-white">
              DELIVERY
            </a>
            <a href="#contact" className="text-[#aaa] transition-colors hover:text-white">
              CONTACT
            </a>
          </div>

          <div className="flex flex-col gap-2 font-[family-name:var(--font-barlow)] text-[12px] leading-[1.8] text-[#666] lg:text-[13px] lg:leading-[1.6] lg:text-[#aaa]">
            <div className="hidden font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-[0.28em] text-[#666] lg:mb-1 lg:block">
              CONTACT
            </div>
            <div>{ADDRESS}</div>
            <a href={`tel:${PHONE_HREF}`} className="hover:text-white">
              {PHONE_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-white">
              {EMAIL}
            </a>
            <div className="text-[#666] lg:text-[#777]">Mon–Fri · call to confirm current hours</div>
          </div>
        </div>

        {/* Mobile-only flat section nav (desktop uses the SITE column above) */}
        <div className="flex flex-wrap gap-5 font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.12em] lg:hidden">
          <a href="#parts" className="text-[#aaa] transition-colors hover:text-white">
            PARTS
          </a>
          <a href="#why" className="text-[#aaa] transition-colors hover:text-white">
            WHY ADS
          </a>
          <a href="#delivery" className="text-[#aaa] transition-colors hover:text-white">
            DELIVERY
          </a>
          <a href="#contact" className="text-[#aaa] transition-colors hover:text-white">
            CONTACT
          </a>
        </div>

        <div className="flex items-center justify-between border-t border-white/6 py-3.5 font-[family-name:var(--font-barlow)] text-[11px] tracking-[0.06em] text-[#555] lg:py-4">
          <div>© 2026 AUTO DOOR STORE · ORLANDO, FL</div>
          <div className="flex items-center gap-[18px]">
            <div className="hidden lg:block">SAME-DAY DELIVERY ACROSS CENTRAL FLORIDA · ORDER BY 12 PM</div>
            <Link href="/login" className="text-[#555] transition-colors hover:text-[#999]">
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main>
      <TopBar />
      <SiteHeader heroId="hero" />
      <Hero />
      <BrowseByPart />
      <WhyADS />
      <DeliverySection />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
