import { PartPosition, PartType } from "@/generated/prisma/enums";

const PART_TYPE_CODE: Record<PartType, string> = {
  DOOR: "DR",
  HOOD: "HD",
  TAILGATE: "TG",
  TRUNK: "TK",
  LIFTGATE: "LG",
  REAR_BODY_PANEL: "RB",
  QUARTER_PANEL: "QP",
  FENDER: "FD",
  BUMPER: "BP",
  GRILLE: "GR",
  HINGE: "HG",
  RADIATOR_SUPPORT: "RS",
  REINFORCEMENT_BAR: "RN",
};

const POSITION_CODE: Record<PartPosition, string> = {
  FRONT_LEFT: "LF",
  FRONT_RIGHT: "RF",
  REAR_LEFT: "LR",
  REAR_RIGHT: "RR",
  FRONT: "F",
  REAR: "R",
};

function modelCode(model: string): string {
  const alnum = model.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return alnum.slice(0, 4) || "GEN";
}

function yearDigits(year: number): string {
  return String(year % 100).padStart(2, "0");
}

export type SkuInput = {
  model: string;
  yearStart: number;
  yearEnd: number;
  partType: PartType;
  position?: PartPosition | null;
};

// e.g. Kia K5, 2020-2023, DOOR, REAR_LEFT -> "K5-20-23-DR-LR". Purely
// deterministic — no DB access — so it can run identically on the client
// (live preview) and the server (default value + collision suffixing).
export function generateSkuBase(input: SkuInput): string {
  if (!input.model.trim() || !input.yearStart || !input.yearEnd || !input.partType) return "";

  const segments = [
    modelCode(input.model),
    yearDigits(input.yearStart),
    yearDigits(input.yearEnd),
    PART_TYPE_CODE[input.partType],
  ];
  if (input.position) segments.push(POSITION_CODE[input.position]);

  return segments.join("-");
}
