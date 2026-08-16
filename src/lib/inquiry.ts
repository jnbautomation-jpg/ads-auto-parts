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

// --- Public quote form validation ----------------------------------------
//
// The quote form is unauthenticated and reachable by anyone on the internet,
// so everything below treats its input as hostile. These are pure functions
// so they can be unit-tested without a database; the rate limit itself lives
// in the server action, since it needs to query recent inquiries.

// Name of the hidden field that no human ever fills in. Lives here rather
// than in the component so the server action can check it without importing
// from the client bundle. See src/components/honeypot-field.tsx.
export const HONEYPOT_NAME = "company";

// Upper bounds on what we will store. Generous enough that no real customer
// hits them, tight enough that a bot cannot write unbounded text into the
// database. Notes is the only genuinely free-form field.
export const QUOTE_LIMITS = {
  name: 120,
  phone: 40,
  email: 200,
  vehicle: 160,
  partNeeded: 80,
  notes: 2000,
} as const;

// A real phone number has at least this many digits once punctuation is
// stripped — enough to reject "asdf" and "1" without rejecting an
// international format the shop might legitimately receive.
const MIN_PHONE_DIGITS = 7;

// Deliberately permissive: the goal is to catch a typo or obvious junk, not
// to adjudicate RFC 5322. Email is optional on this form anyway.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits only, for comparing two differently-formatted spellings of the same number. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export type QuoteInput = {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  partNeeded: string;
  notes: string;
};

export type QuoteValidation =
  | { ok: true; value: QuoteInput }
  | { ok: false; error: string };

export function validateQuoteInput(raw: Partial<Record<keyof QuoteInput, string>>): QuoteValidation {
  const value: QuoteInput = {
    name: (raw.name ?? "").trim(),
    phone: (raw.phone ?? "").trim(),
    email: (raw.email ?? "").trim(),
    vehicle: (raw.vehicle ?? "").trim(),
    partNeeded: (raw.partNeeded ?? "").trim(),
    notes: (raw.notes ?? "").trim(),
  };

  if (!value.name || !value.phone) {
    return { ok: false, error: "Name and phone are required." };
  }

  // Over-length input is rejected rather than silently truncated — a real
  // customer deserves to know their message did not go through intact.
  for (const [field, limit] of Object.entries(QUOTE_LIMITS) as [keyof QuoteInput, number][]) {
    if (value[field].length > limit) {
      return { ok: false, error: `That ${FIELD_LABEL[field]} is too long — please shorten it.` };
    }
  }

  if (normalizePhone(value.phone).length < MIN_PHONE_DIGITS) {
    return { ok: false, error: "Please enter a phone number we can reach you on." };
  }

  if (value.email && !EMAIL_RE.test(value.email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }

  return { ok: true, value };
}

const FIELD_LABEL: Record<keyof QuoteInput, string> = {
  name: "name",
  phone: "phone number",
  email: "email address",
  vehicle: "vehicle",
  partNeeded: "part",
  notes: "message",
};

export function formatReceivedDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
