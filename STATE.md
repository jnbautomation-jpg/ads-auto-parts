# Where we are — read this first

**Updated:** 16 September 2026 · **Live:** https://autodoorstoreorlando.com

Everything built is merged and deployed. Nothing is half-finished.

This file is the *narrative* — what is waiting on whom, and why. The volatile
facts (current branch, what is on `main`, open PRs) are printed fresh at the top
of every session by `scripts/session-state.sh`, so they are never stale here.
Full history and the decisions that must not be undone live in `CHANGELOG.md`.

---

## The two features that do nothing until JJ sets keys

Both degrade silently — the site behaves exactly as it did before, plus a log
line — which is why they were safe to merge. **Neither works yet.** Both live on
the Vercel project, which is **JJ's account**, so this is always a hand-off.

| Feature | What switches it on |
| --- | --- |
| **Lead email** | `vercel integration add resend` (sets `RESEND_API_KEY`), then verify `autodoorstoreorlando.com` in Resend and set `EMAIL_FROM`. Until the domain is verified, Resend's fallback sender only delivers to the account owner. |
| **Checkout** | `vercel integration add stripe`, then **the webhook** at `/api/stripe/webhook` subscribed to `payment_intent.succeeded`, `.payment_failed`, `.canceled`, plus `STRIPE_WEBHOOK_SECRET`. **Skip the webhook and checkout looks like it works — customers get charged and no order is ever marked paid.** |

The Stripe account must be **Matthew's**, not JJ's or Luca's. Money lands
wherever it points.

## Open questions — blocked on a person, not on code

- **Does a wholesale account also get the $500 volume discount?** They already
  save $100 per unit and pay no tax, so stacking would be $200 off. **Defaulted
  to no.** `WHOLESALE_ALSO_ELIGIBLE` in `src/lib/discount.ts` is the one line to
  flip. Needs Matthew.
- **Matthew still owes:** real business hours (site says Mon–Fri 9–5, Facebook
  says always open), returns-policy sign-off, the Google / Facebook / Yelp /
  eBay URLs, rewards earn-and-redeem rates, and the reserve-now deposit and hold
  expiry. The last two block features that are entirely unbuilt.
- **Connie (marketing) still owes:** the Google Ads conversion label
  (`GOOGLE_LEAD_CONVERSION_LABEL` in `src/lib/tracking.ts` is empty, so leads
  show in reports but never register as campaign conversions), the old-URL
  export from Search Console, and the sitemap submission. An email asking for
  all three is drafted and with JJ to send.

## Asked for, not built

- **"Call us about cheaper shipping"** prompt at checkout, for customers who
  might beat the flat freight rate. Matthew asked for it on 29 Aug.
- **The blog.** The old Wix site had indexed blog pages; that SEO is lost.
  Rebuilding needs the post content exported from Wix.
- **The 301 map** for old URLs. They 404 today, and live ad clicks land on them.
  Blocked on Connie's Search Console export.

## Ground rules worth not rediscovering

- Branch from `main`, open a PR, **never push to `main`**. JJ reviews the Vercel
  preview and merges.
- The dev Supabase project auto-pauses. A paused project answers
  `tenant/user postgres.<ref> not found`, which Prisma reports as a generic
  `P1001` — it is not a network fault, and resuming it is a dashboard action.
- Any ad-hoc `tsx` script that touches the database must `import "dotenv/config"`
  first, or it silently tries to connect to a database named after the Mac user.
