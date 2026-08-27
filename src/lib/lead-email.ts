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
import { formatReceivedAt, normalizePhone } from "@/lib/inquiry";
import { collapse } from "@/lib/normalize";
import { SITE_URL } from "@/lib/site";
import { escapeHtml, sendEmail, shopRecipients } from "@/lib/email";
import { DEFAULT_LOCALE, LOCALE_LABEL, type Locale } from "@/lib/i18n";

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

/** Shown where the customer left a field blank, so the reader isn't interpreting a gap. */
const NOT_GIVEN = "— not given —";

/**
 * One labelled line of the email.
 *
 * `kind` is what makes a value tappable in the HTML part. It is carried by the
 * row rather than re-derived from `label` at render time, so translating or
 * renaming a label cannot silently drop a `tel:` link — and so a null value
 * can render its placeholder without the renderer having to sniff whether
 * "— not given —" looks like a phone number.
 */
type Row = { label: string; value: string | null; kind?: "phone" | "email" };

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
  const notes = lead.notes?.trim() || null;
  const isTranslated = lead.locale !== DEFAULT_LOCALE;

  // Subject is what gets read first and, on a phone, sometimes all that gets
  // read. Vehicle and part lead because that is what the shop triages on; the
  // name follows so two requests for the same part are still distinguishable.
  //
  // A lead filed in any language other than the site's default is tagged with
  // that language's code, so whoever picks it up knows to reply in it before
  // they open the mail. The body stays English: staff screens are English,
  // and this is the same call as the "Vehicle:" / "Part needed:" prefixes the
  // inquiry itself is stored with.
  //
  // collapse() is what strips newlines out, so a crafted name cannot
  // restructure the line. It runs once, over the finished subject.
  const what = [vehicle, partNeeded].filter(Boolean).join(" — ");
  const tag = isTranslated ? `[${lead.locale.toUpperCase()}] ` : "";
  const subject = collapse(`${tag}New quote request: ${what ? `${what} (${lead.name})` : lead.name}`);

  const rows: Row[] = [
    { label: "Name", value: lead.name },
    { label: "Phone", value: lead.phone, kind: "phone" },
    { label: "Email", value: lead.email, kind: "email" },
    { label: "Vehicle", value: vehicle },
    { label: "Part needed", value: partNeeded },
  ];
  if (lead.product) rows.push({ label: "Listing", value: describeProduct(lead.product) });
  if (isTranslated) {
    rows.push({ label: "Language", value: `${LOCALE_LABEL[lead.locale]} — reply in this language` });
  }
  rows.push({ label: "Received", value: formatReceivedAt(lead.receivedAt) });

  const inquiriesUrl = `${SITE_URL}/inquiries`;
  const closing = lead.email
    ? "Reply to this email to answer the customer directly."
    : `No email given — call back on ${lead.phone}.`;

  const textLines = ["New quote request from the website.", ""];
  textLines.push(...rows.map(({ label, value }) => `${label}: ${value ?? NOT_GIVEN}`));
  if (notes) textLines.push("", "Notes:", notes);
  textLines.push("", closing, "", `All requests: ${inquiriesUrl}`);
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
  const html = [
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">`,
    `<p style="margin:0 0 16px;font-size:17px"><strong>New quote request from the website</strong></p>`,
    ...rows.map(
      (row) =>
        `<p style="margin:0 0 6px"><strong style="display:inline-block;min-width:110px">${escapeHtml(
          row.label,
        )}</strong>${renderValue(row)}</p>`,
    ),
    notes
      ? `<p style="margin:16px 0 6px"><strong>Notes</strong></p><p style="margin:0;white-space:pre-wrap">${escapeHtml(
          notes,
        )}</p>`
      : "",
    `<p style="margin:20px 0 0;font-size:13px;color:#666">${escapeHtml(closing)} `,
    `<a href="${escapeHtml(inquiriesUrl)}" style="color:#E31E24">See all requests</a>`,
    `</p>`,
    `</div>`,
  ].join("");

  return { subject, text, html };
}

/** Phone and email become tappable; a missing value renders its placeholder as plain text. */
function renderValue({ value, kind }: Row): string {
  if (value === null) return escapeHtml(NOT_GIVEN);
  if (kind === "phone") return `<a href="tel:${normalizePhone(value)}">${escapeHtml(value)}</a>`;
  if (kind === "email") return `<a href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
  return escapeHtml(value);
}

/**
 * Tell the shop a lead came in.
 *
 * Never throws. The Inquiry row is already committed by the time this runs and
 * the customer has already been told their request went through — which is
 * true whether or not this email lands, because /inquiries is still the record
 * of it. A failure is logged loudly enough to find in Vercel's logs and
 * otherwise ignored.
 *
 * "No provider configured" is warned rather than errored, and warned on every
 * lead rather than passed over silently: that is precisely the state the shop
 * was in before this existed — leads arriving and nobody hearing about it —
 * and it should be visible in the logs, not invisible.
 */
export async function sendLeadNotification(lead: Lead): Promise<void> {
  const { subject, text, html } = buildLeadEmail(lead);
  const result = await sendEmail({
    to: shopRecipients(),
    subject,
    text,
    html,
    // Staff reply to the customer, not to the sending domain.
    replyTo: lead.email ?? undefined,
    idempotencyKey: `lead-${lead.id}`,
  });

  if (result.ok) return;
  const report = result.reason === "unconfigured" ? console.warn : console.error;
  report(`Lead ${lead.id} saved but no notification email sent: ${result.error}`);
}
