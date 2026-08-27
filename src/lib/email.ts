// Transactional email — the one place the app talks to a mail provider.
//
// Until this existed, the public quote form wrote an Inquiry row and stopped
// there. Nothing told a human. Leads were visible only on /inquiries, which
// nobody opens, while two Google Ads campaigns paid for the clicks that
// produced them. That is what this module exists to fix.
//
// Provider is Resend, chosen off the Vercel Marketplace (`messaging` is the
// category; Resend is the only integration in it, and it is the provider the
// Vercel integration guide wires up for Next.js). Installing it on the
// project injects RESEND_API_KEY automatically.
//
// Everything provider-specific stops at this file — including the name of
// that env var. Callers pass a message and get a result back; a caller that
// wants to say "mail isn't set up" reads `reason` rather than re-testing the
// key, so swapping providers stays one function body rather than a grep.

import { Resend } from "resend";
import { BUSINESS_NAME, EMAIL } from "@/lib/site";

/**
 * Envelope sender.
 *
 * ⚠️ The default only reaches the Resend account owner's own address.
 * `onboarding@resend.dev` is Resend's shared onboarding sender: it needs no
 * DNS and lets the pipeline be verified end to end before anyone touches the
 * domain, but Resend will only deliver from it to the address that owns the
 * API key. Real lead mail to the shop needs `autodoorstoreorlando.com`
 * verified in Resend (three DNS records) and then:
 *
 *     EMAIL_FROM="ADS Auto Parts <leads@autodoorstoreorlando.com>"
 *
 * An env var rather than a constant in site.ts for the same reason SITE_URL
 * resolves from one (site.ts:24-34): it has to be able to differ between a
 * preview deploy and production, and it is tied to provider account state
 * rather than to the shop's own details.
 */
function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || `${BUSINESS_NAME} <onboarding@resend.dev>`;
}

/**
 * Where the shop's own notifications go — new leads, new paid orders.
 *
 * Defaults to the address already published on every page (EMAIL in site.ts),
 * because that is the mailbox the shop actually reads. Override with a
 * comma-separated list to add marketing or a second owner without a code
 * change:
 *
 *     SHOP_EMAIL_TO="autodoorstorewest@gmail.com,connie@example.com"
 *
 * One list rather than one per message type: the shop is a shop. If leads and
 * orders ever genuinely need different inboxes, that is the point to split it.
 */
export function shopRecipients(): string[] {
  const configured = process.env.SHOP_EMAIL_TO?.trim();
  if (!configured) return [EMAIL];
  return configured
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export type EmailMessage = {
  to: string[];
  subject: string;
  /** Both parts are required — a text/plain alternative keeps this out of spam folders. */
  text: string;
  html: string;
  /** Where a reply goes. For a lead this is the customer, so staff can just hit Reply. */
  replyTo?: string;
  /** Sent as Idempotency-Key, so a retried send cannot deliver twice. */
  idempotencyKey?: string;
};

/**
 * `unconfigured` means no mail provider is set up at all — an expected state
 * (CI, a fresh checkout, a deploy before the integration is installed), and
 * worth a quieter log than a genuine failure. `failed` is everything else.
 * Callers distinguish the two without naming the provider or its env var.
 */
export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unconfigured" | "failed"; error: string };

/**
 * Send one message.
 *
 * **This never throws and never rejects.** Every caller is on a path where the
 * real work is already done and committed — the lead is in the database, the
 * order is placed — and a mail provider having a bad afternoon must not undo
 * that or surface an error to a customer. The notification is the softest
 * thing in the request, and it fails alone.
 *
 * Note that the Resend SDK reports API-level failures in the returned `error`
 * rather than by throwing, so both have to be handled.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "unconfigured", error: "RESEND_API_KEY is not set" };
  }
  if (message.to.length === 0) {
    return { ok: false, reason: "unconfigured", error: "no recipients configured" };
  }

  try {
    // Constructed per send rather than hoisted: the constructor reads the key
    // eagerly and throws when it is absent, which would defeat the check
    // above. It allocates a handful of empty resource wrappers and does no
    // I/O, so there is nothing to save by reusing one.
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: emailFrom(),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (error) return { ok: false, reason: "failed", error: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id ?? "" };
  } catch (cause) {
    return {
      ok: false,
      reason: "failed",
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape text for interpolation into an HTML email body.
 *
 * Lives with the transport rather than with any one message type: every HTML
 * email this app ever sends needs it, and the alternative is each new message
 * module either importing it from an unrelated sibling or writing a second
 * escaper that these tests do not cover.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
