// The public quote form (src/app/(public)/actions.ts) writes vehicle/part
// into Inquiry.message as "Vehicle: ...\nPart needed: ...\n\n<notes>" since
// the schema doesn't have dedicated columns for them. Pull them back out for
// the admin inquiries table.
export function parseQuoteMessage(message: string | null): { vehicle: string; part: string } {
  if (!message) return { vehicle: "—", part: "—" };

  const vehicleMatch = message.match(/^Vehicle: (.+)$/m);
  const partMatch = message.match(/^Part needed: (.+)$/m);

  return {
    vehicle: vehicleMatch?.[1] ?? "—",
    part: partMatch?.[1] ?? "—",
  };
}

export function formatReceivedDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
