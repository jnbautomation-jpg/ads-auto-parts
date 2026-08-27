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
// Everything provider-specific stops at this file. Callers pass a message and
// get a result back; swapping providers is one function body.

import { Resend } from "resend";
import { BUSINESS_NAME } from "@/lib/site";

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
 * Deliberately an env var rather than a constant in site.ts: unlike the ad
 * tracking IDs this is tied to provider account state, and it has to be able
 * to differ between a preview deploy and production.
 */
function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || `${BUSINESS_NAME} <onboarding@resend.dev>`;
}

/** Whether outbound mail can be sent at all. False in CI and in any checkout without a key. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
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

export type EmailResult = { ok: true; id: string } | { ok: false; error: string };

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
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };
  if (message.to.length === 0) return { ok: false, error: "no recipients configured" };

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: emailFrom(),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      },
      message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
    );

    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id ?? "" };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}
