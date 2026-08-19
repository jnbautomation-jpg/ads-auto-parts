// Cross-sell suggestions — Phase 2B.
//
//   "Suggest related items — client specifically called out hood hinges."
//   "Rule-based mapping per part type is fine to start."
//
// Rule-based exactly as the spec permits. These pairings come from how the
// parts actually go together on a repair, not from purchase history the shop
// doesn't have yet:
//
//   * A hood is bolted on with hinges, and a shop replacing a damaged hood
//     very often finds the hinges bent too — the client's own example.
//   * Front-end collision work rarely stops at one panel: a bumper, grille
//     and radiator support are usually damaged together.
//   * A door and its hinges are the same story as a hood.
//
// Suggestions are always filtered to parts that FIT THE SAME VEHICLE and are
// actually in stock, so this can never suggest something the shop can't ship.

import type { PartType } from "@/generated/prisma/enums";

/** Part types worth offering alongside each part type. Ordered by relevance. */
export const CROSS_SELL_MAP: Partial<Record<PartType, PartType[]>> = {
  // The client's specific example.
  HOOD: ["HINGE", "GRILLE", "FENDER"],
  DOOR: ["HINGE"],
  // Front-end collision damage clusters.
  BUMPER: ["GRILLE", "REINFORCEMENT_BAR", "RADIATOR_SUPPORT"],
  GRILLE: ["BUMPER", "RADIATOR_SUPPORT"],
  RADIATOR_SUPPORT: ["BUMPER", "REINFORCEMENT_BAR"],
  REINFORCEMENT_BAR: ["BUMPER"],
  FENDER: ["HOOD", "BUMPER"],
  // Rear-end equivalents.
  TAILGATE: ["HINGE", "REAR_BODY_PANEL"],
  TRUNK: ["HINGE", "REAR_BODY_PANEL"],
  LIFTGATE: ["HINGE", "REAR_BODY_PANEL"],
  REAR_BODY_PANEL: ["BUMPER", "QUARTER_PANEL"],
  QUARTER_PANEL: ["REAR_BODY_PANEL"],
};

/** Which part types to suggest alongside the given one. */
export function relatedPartTypes(partType: string): PartType[] {
  return CROSS_SELL_MAP[partType as PartType] ?? [];
}
