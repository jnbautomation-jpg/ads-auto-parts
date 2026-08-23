import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(value: number | string): string {
  return currencyFormatter.format(Number(value));
}

export function formatFit(make: string, model: string, yearStart: number, yearEnd: number): string {
  const years = yearStart === yearEnd ? String(yearStart) : `${yearStart}–${yearEnd}`;
  return `${years} ${make} ${model}`;
}

// Single source of truth for enum -> display name, shared by admin, the
// public catalog, and the landing page — never show a raw enum value
// ("RADIATOR_SUPPORT") to a human.
export const PART_TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  HOOD: "Hood",
  TAILGATE: "Tailgate",
  TRUNK: "Trunk",
  LIFTGATE: "Liftgate",
  REAR_BODY_PANEL: "Rear Body",
  QUARTER_PANEL: "Quarter Panel",
  FENDER: "Fender",
  BUMPER: "Bumper",
  GRILLE: "Grille",
  HINGE: "Hinge",
  RADIATOR_SUPPORT: "Radiator Support",
  REINFORCEMENT_BAR: "Reinforcement Bar",
};

export function formatPartType(partType: string): string {
  return PART_TYPE_LABELS[partType] ?? partType;
}

const POSITION_LABEL: Record<string, string> = {
  FRONT_LEFT: "Left Front",
  FRONT_RIGHT: "Right Front",
  REAR_LEFT: "Left Rear",
  REAR_RIGHT: "Right Rear",
  FRONT: "Front",
  REAR: "Rear",
};

export function formatPosition(position: string | null | undefined): string {
  if (!position) return "—";
  return POSITION_LABEL[position] ?? position;
}

// Public catalog only ever shows a label, never the exact count — staff-only
// screens (admin product list/detail) still show the real number.
export type Availability = { label: string; color: string };

// Re-picked when the public site moved to a light ground. The previous
// #4ADE80 / #FBBF24 / #9CA3AF were chosen against near-black and fail contrast
// on white — a "LOW STOCK" a customer cannot read is not a warning. These match
// --stock-in / --stock-low / --stock-call in globals.css; change both together.
export function getAvailability(quantity: number, reorderPoint: number): Availability {
  if (quantity <= 0) return { label: "CALL", color: "#6A7178" };
  if (quantity <= reorderPoint) return { label: "LOW STOCK", color: "#A65A07" };
  return { label: "IN STOCK", color: "#1B7A3B" };
}

// The landing page's "Browse by part" tiles link to /catalog?part=<slug>
// (see src/app/(public)/page.tsx TILES) — same categories as the hero
// search form's marketing-label map (catalog/page.tsx PART_TYPE_LABEL_MAP),
// just keyed by slug instead of label.
// Public-facing category names for the same slugs as PART_SLUG_TO_TYPES.
// Plural, because these read as navigation ("Doors"), not as a single part's
// type label ("Door") — that one comes from PART_TYPE_LABELS above.
export const PART_SLUG_LABELS: Record<string, string> = {
  doors: "Doors",
  hoods: "Hoods",
  fenders: "Fenders",
  bumpers: "Bumpers",
  "tailgates-trunks": "Tailgates & Trunks",
  liftgates: "Liftgates",
  "quarter-panels": "Quarter Panels",
  "rear-body-panels": "Rear Body Panels",
  grilles: "Grilles",
  hinges: "Hinges",
  "radiator-support": "Radiator Supports",
  "reinforcement-bars": "Reinforcement Bars",
};

export const PART_SLUG_TO_TYPES: Record<string, string[]> = {
  doors: ["DOOR"],
  hoods: ["HOOD"],
  fenders: ["FENDER"],
  bumpers: ["BUMPER"],
  "tailgates-trunks": ["TAILGATE", "TRUNK"],
  liftgates: ["LIFTGATE"],
  "quarter-panels": ["QUARTER_PANEL"],
  "rear-body-panels": ["REAR_BODY_PANEL"],
  grilles: ["GRILLE"],
  hinges: ["HINGE"],
  "radiator-support": ["RADIATOR_SUPPORT"],
  "reinforcement-bars": ["REINFORCEMENT_BAR"],
};

// --- Locale-aware variants (Phase 2A spec step 10) -------------------------
//
// The functions above keep their English behaviour so every existing caller
// is unchanged. These take a locale and are what the /es routes use.
//
// The spec is explicit that part type names and statuses must be translated,
// not just marketing copy — a Spanish page listing "Quarter Panel" and
// "IN STOCK" is only half-translated.

export function formatPartTypeIn(partType: string, locale: Locale): string {
  const dict = getDictionary(locale);
  return (dict.partType as Record<string, string>)[partType] ?? formatPartType(partType);
}

export function formatPositionIn(position: string | null | undefined, locale: Locale): string {
  const dict = getDictionary(locale);
  if (!position) return dict.position.none;
  return (dict.position as Record<string, string>)[position] ?? formatPosition(position);
}

/** Availability label + colour in the given language. Colours never change. */
export function getAvailabilityIn(
  quantity: number,
  reorderPoint: number,
  locale: Locale,
): Availability {
  const dict = getDictionary(locale);
  const base = getAvailability(quantity, reorderPoint);
  const key =
    base.label === "IN STOCK" ? "IN_STOCK" : base.label === "LOW STOCK" ? "LOW_STOCK" : "CALL";
  return { label: (dict.availability as Record<string, string>)[key], color: base.color };
}

/**
 * Money in the given locale. Spanish-speaking customers in Florida are paying
 * in dollars, so the CURRENCY stays USD — only the number formatting changes.
 */
export function formatMoneyIn(value: number | string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

/**
 * Catalog-category label ("Doors", "Puertas") for a URL slug.
 *
 * The Spanish names already exist as the landing page's tile names, so this
 * reads them rather than introducing a second set that could disagree with the
 * tiles about what a category is called. Falls back to the English label, then
 * to the slug itself, so an unmapped slug degrades instead of rendering blank.
 */
export function formatPartSlugIn(slug: string, locale: Locale): string {
  const tiles = getDictionary(locale).landing.tiles as Record<string, { name: string } | undefined>;
  return tiles[slug]?.name ?? PART_SLUG_LABELS[slug] ?? slug;
}
