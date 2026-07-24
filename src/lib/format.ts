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

const PART_TYPE_LABEL: Record<string, string> = {
  DOOR: "Door",
  HOOD: "Hood",
  TAILGATE: "Tailgate",
  TRUNK: "Trunk",
  LIFTGATE: "Liftgate",
  REAR_BODY_PANEL: "Rear Body",
  QUARTER_PANEL: "Quarter Panel",
  FENDER: "Fender",
  BUMPER: "Bumper",
};

export function formatPartType(partType: string): string {
  return PART_TYPE_LABEL[partType] ?? partType;
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
