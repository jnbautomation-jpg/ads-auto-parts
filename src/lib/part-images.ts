import { PartType } from "@/generated/prisma/enums";

// One shared image per part type — never per-product. This is only the
// fallback shown when a product has no uploaded photos of its own; callers
// always prefer product.photos[0] first.
export const PART_TYPE_IMAGES: Partial<Record<PartType, string>> = {
  DOOR: "/part-images/door.png",
  HOOD: "/part-images/hood.png",
  TAILGATE: "/part-images/tailgate.png",
  TRUNK: "/part-images/trunk.png",
  // Client-confirmed deliberate reuse, not a guess: a liftgate is a rear
  // hatch and reads the same as a tailgate — no separate liftgate.png exists.
  LIFTGATE: "/part-images/tailgate.png",
  REAR_BODY_PANEL: "/part-images/rear-body-panel.png",
  QUARTER_PANEL: "/part-images/quarter-panel.png",
  FENDER: "/part-images/fender.png",
  BUMPER: "/part-images/bumper.png",
  GRILLE: "/part-images/grille.png",
  HINGE: "/part-images/hinge.png",
  RADIATOR_SUPPORT: "/part-images/radiator-support.png",
  REINFORCEMENT_BAR: "/part-images/reinforcement-bar.png",
};

// Null means "no default image for this part type" — render a placeholder
// box, never a broken <img>.
export function getPartTypeImage(partType: string): string | null {
  return PART_TYPE_IMAGES[partType as PartType] ?? null;
}
