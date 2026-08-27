// The email a quote request turns into.
//
// buildLeadEmail() is pure — no database, no network — so the wording and the
// escaping are unit-tested without mocking a provider. sendLeadNotification()
// is the thin impure wrapper the server action calls.
//
// What the shop actually needs out of this email, in the order they need it:
// who to call back, on what number, about which vehicle and part. It is read
// on a phone, in a workshop, next to a car. Everything below is arranged for
// that and not for looking like a newsletter.

import { formatFit, formatPartType, formatPosition } from "@/lib/format";
import { EMAIL, SITE_URL } from "@/lib/site";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

/**
 * Who gets told about a new lead.
 *
 * Defaults to the shop's own published contact address — the one already in
 * site.ts and already printed on every page — because that is the mailbox the
 * shop actually reads. Override with a comma-separated list to add marketing
 * or a second owner without a code change:
 *
 *     LEAD_EMAIL_TO="autodoorstorewest@gmail.com,connie@example.com"
 */
export function leadRecipients(): string[] {
  const configured = process.env.LEAD_EMAIL_TO?.trim();
  if (!configured) return [EMAIL];
  return configured
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/** The product a lead was filed against, when it came from a listing rather than the landing page. */
export type LeadProduct = {
  sku: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  partType: string;
  position: string | null;
};

export type Lead = {
  /** Inquiry row id — used for the idempotency key and the admin deep link. */
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicle: string | null;
  partNeeded: string | null;
  notes: string | null;
  /** Which language the customer filled the form in. */
  locale: Locale;
  product: LeadProduct | null;
  receivedAt: Date;
};

/**
 * Orlando, always.
 *
 * A Vercel function runs in UTC, so formatting the timestamp without a zone
 * puts a 2 PM lead in the shop's inbox stamped 6 PM — which reads as "came in
 * after close, deal with it tomorrow" on exactly the leads worth calling back
 * inside the hour.
 */
const SHOP_TIME_ZONE = "America/New_York";

function formatReceivedAt(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: SHOP_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Everything in a lead is attacker-controlled free text that passed only
 * length and shape validation. It is escaped on the way into the HTML part,
 * and newlines are stripped out of the subject so a crafted name cannot
 * restructure the header.
 */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Describe the catalog listing a lead came from, e.g. "ACC-18-DR-L — 2018–2020 Honda Accord, Door (Left Front)". */
function describeProduct(product: LeadProduct): string {
  const fit = formatFit(product.make, product.model, product.yearStart, product.yearEnd);
  // Test on the raw value, not on formatPosition's output — it renders an
  // unset position as "—", which is meaningful in a table column and useless
  // in the middle of a sentence.
  const part = product.position
    ? `${formatPartType(product.partType)} (${formatPosition(product.position)})`
    : formatPartType(product.partType);
  return `${product.sku} — ${fit}, ${part}`;
}

export function buildLeadEmail(lead: Lead): { subject: string; text: string; html: string } {
  const vehicle = lead.vehicle?.trim() || null;
  const partNeeded = lead.partNeeded?.trim() || null;
  const isSpanish = lead.locale !== DEFAULT_LOCALE;

  // Subject is what gets read first and, on a phone, sometimes all that gets
  // read. Vehicle and part lead because that is what the shop triages on; the
  // name follows so two requests for the same part are still distinguishable.
  const what = [vehicle, partNeeded].filter(Boolean).join(" — ");
  const summary = what ? `${what} (${singleLine(lead.name)})` : singleLine(lead.name);
  // Spanish leads are flagged in the subject so whoever picks it up knows to
  // reply in Spanish before they open it. The body stays English: staff
  // screens are English, and this is the same call as the "Vehicle:" /
  // "Part needed:" prefixes the inquiry itself is stored with.
  const subject = singleLine(`${isSpanish ? "[ES] " : ""}New quote request: ${summary}`);

  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email || "— not given —"],
    ["Vehicle", vehicle || "— not given —"],
    ["Part needed", partNeeded || "— not given —"],
  ];
  if (lead.product) rows.push(["Listing", describeProduct(lead.product)]);
  if (isSpanish) rows.push(["Language", "Spanish — the customer used the Spanish site"]);
  rows.push(["Received", formatReceivedAt(lead.receivedAt)]);

  const inquiriesUrl = `${SITE_URL}/inquiries`;

  const textLines = [
    "New quote request from the website.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ];
  if (lead.notes?.trim()) {
    textLines.push("", "Notes:", lead.notes.trim());
  }
  textLines.push(
    "",
    lead.email ? "Reply to this email to answer the customer directly." : `Call back on ${lead.phone}.`,
    "",
    `All requests: ${inquiriesUrl}`,
  );
  const text = textLines.join("\n");

  // Deliberately plain, table-free, inline-styled HTML. Gmail on a phone is
  // the target and it strips <style> blocks; anything cleverer degrades worse
  // than this does.
  //
  // The colour literals below are the one place they are correct. The
  // no-literals rule (CLAUDE.md, CHANGELOG decision 10) is about the site's
  // stylesheets, where a token in globals.css can reach them — an email client
  // has no stylesheet and no custom properties, so inline hex is the only
  // thing that renders. #E31E24 is the same shop red, kept in step by hand.
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 6px"><strong style="display:inline-block;min-width:110px">${escapeHtml(
          label,
        )}</strong>${renderValue(label, value)}</p>`,
    )
    .join("");

  const notesHtml = lead.notes?.trim()
    ? `<p style="margin:16px 0 6px"><strong>Notes</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(
        lead.notes.trim(),
      )}</p>`
    : "";

  const html = [
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">`,
    `<p style="margin:0 0 16px;font-size:17px"><strong>New quote request from the website</strong></p>`,
    htmlRows,
    notesHtml,
    `<p style="margin:20px 0 0;font-size:13px;color:#666">`,
    lead.email
      ? `Reply to this email to answer the customer directly. `
      : `No email given — call back on ${escapeHtml(lead.phone)}. `,
    `<a href="${escapeHtml(inquiriesUrl)}" style="color:#E31E24">See all requests</a>`,
    `</p>`,
    `</div>`,
  ].join("");

  return { subject, text, html };
}

/** Phone and email become tappable; everything else is escaped text. */
function renderValue(label: string, value: string): string {
  const escaped = escapeHtml(value);
  if (label === "Phone") return `<a href="tel:${escapeHtml(value.replace(/\D/g, ""))}">${escaped}</a>`;
  if (label === "Email" && value.includes("@")) return `<a href="mailto:${escaped}">${escaped}</a>`;
  return escaped;
}

/**
 * Tell the shop a lead came in.
 *
 * Never throws. The Inquiry row is already committed by the time this runs and
 * the customer has already been told their request went through — which is
 * true whether or not this email lands, because /inquiries is still the record
 * of it. A failure is logged loudly enough to find in Vercel's logs and
 * otherwise ignored.
 */
export async function sendLeadNotification(lead: Lead): Promise<void> {
  if (!isEmailConfigured()) {
    // Worth a log line rather than a silent return: this is precisely the
    // state the shop was in before — leads arriving and nobody hearing about
    // it — and it should be visible in the logs, not invisible.
    console.warn(`Lead ${lead.id} saved but no email sent: RESEND_API_KEY is not set`);
    return;
  }

  const { subject, text, html } = buildLeadEmail(lead);
  const result = await sendEmail({
    to: leadRecipients(),
    subject,
    text,
    html,
    // Staff reply to the customer, not to the sending domain.
    ...(lead.email ? { replyTo: lead.email } : {}),
    idempotencyKey: `lead-${lead.id}`,
  });

  if (!result.ok) {
    console.error(`Lead ${lead.id} saved but notification email failed: ${result.error}`);
  }
}
