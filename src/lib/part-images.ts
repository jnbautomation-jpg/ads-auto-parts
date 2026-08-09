import { PartType } from "@/generated/prisma/enums";

// One shared image per part type — never per-product. This is only the
// fallback shown when a product has no uploaded photos of its own; callers
// always prefer product.photos[0] first.
export const PART_TYPE_IMAGES: Partial<Record<PartType, string>> = {
  DOOR: "/part-images/door.webp",
  HOOD: "/part-images/hood.webp",
  TAILGATE: "/part-images/tailgate.webp",
  TRUNK: "/part-images/trunk.webp",
  // Client-confirmed deliberate reuse, not a guess: a liftgate is a rear
  // hatch and reads the same as a tailgate — no separate liftgate.png exists.
  LIFTGATE: "/part-images/tailgate.webp",
  REAR_BODY_PANEL: "/part-images/rear-body-panel.webp",
  QUARTER_PANEL: "/part-images/quarter-panel.webp",
  FENDER: "/part-images/fender.webp",
  BUMPER: "/part-images/bumper.webp",
  GRILLE: "/part-images/grille.webp",
  HINGE: "/part-images/hinge.webp",
  RADIATOR_SUPPORT: "/part-images/radiator-support.webp",
  REINFORCEMENT_BAR: "/part-images/reinforcement-bar.webp",
};

// Null means "no default image for this part type" — render a placeholder
// box, never a broken <img>.
export function getPartTypeImage(partType: string): string | null {
  return PART_TYPE_IMAGES[partType as PartType] ?? null;
}
