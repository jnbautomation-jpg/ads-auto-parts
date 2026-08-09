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

export function getAvailability(quantity: number, reorderPoint: number): Availability {
  if (quantity <= 0) return { label: "CALL", color: "#9CA3AF" };
  if (quantity <= reorderPoint) return { label: "LOW STOCK", color: "#FBBF24" };
  return { label: "IN STOCK", color: "#4ADE80" };
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
