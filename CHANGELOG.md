# Changelog — Phase 2

**Last updated:** 20 August 2026
**Branch:** `feat/customer-accounts` (27 commits ahead of `main`)
**Status:** every Phase 2 spec item that does not require someone else's decision is built and verified.

> **Reading this to pick up work?** Start at [Where we left off](#where-we-left-off), then
> [Decisions not to undo](#decisions-not-to-undo). The spec this implements is
> `ADS-Phase2-Build-Spec.pdf` (the client's document, not in the repo — Luca has it).

---

## Where we left off

Nothing is half-finished. The last completed task was translating the customer account pages into
Spanish, which finished the spec's i18n requirement.

**Everything remaining is blocked on a person, not on code.** See
[Outstanding](#outstanding--blocked-on-people). Do not start building those without an answer —
several (rewards rates, the deposit amount, delivery fees) would mean inventing numbers that affect
real revenue.

**Two branches are open and neither is merged:**

| Branch | Contains |
| --- | --- |
| PR #2 (`chore/foundation-tests-ci`) | Tests, CI, migrate-on-deploy, and the Section 1 live-site fixes |
| `feat/customer-accounts` | Everything since. **Not yet a PR.** |

Merging PR #2 first keeps the review simpler.

**The single blocker for going live:** the `sales@autodoorstoreorlando.com` mailbox does not exist
yet, and every "email us" link now points at it. Either create it, or revert
`EMAIL` in `src/lib/site.ts` to the old Gmail temporarily — Luca has been offered both.

---

## Health

| Check | State |
| --- | --- |
| Unit tests | 310 passing across 24 files |
| CI | Green — lint, typecheck, tests, production build, on Node 20 and 24 |
| Live-site regression sweep | 46 checks passing |
| Working tree | Clean |

Run everything the way CI does (no `.env`, placeholder credentials):

```bash
npm run lint && npm run typecheck && npm test && npm run build:ci
```

Deeper checks that need a real database (dev Supabase, never production):

```bash
npx tsx scripts/verify-order-locking.ts    # proves two buyers can't take the last part
npx tsx scripts/verify-chat-grounding.ts   # proves chat can't leak trade prices
npx tsx scripts/clean-vehicle-data.ts      # dry run; --apply to write
npx tsx scripts/backfill-retail-price.ts   # dry run; --apply to write
```

---

## What was built

### Foundations (there were none before)

- **310 unit tests** covering the pure logic: the workbook importer, pricing rules, permissions,
  VIN validation, i18n, stock ranking, estimate parsing.
- **CI** on every PR — lint, typecheck, tests, build, on Node 20 *and* 24 (the code polyfills a
  global that only Node 20 lacks, so both are tested).
- **Migrations apply on deploy** — `build` runs `prisma migrate deploy`. `build:ci` deliberately
  does not, so CI's placeholder connection string can never migrate anything.
- `.env.example` documents all six variables.

### Section 1 — live-site bugs

| # | Item | State |
| --- | --- | --- |
| 1.1 | 404 page; unknown URLs no longer hit the staff login | Done (301 map deferred — needs the URL list) |
| 1.2 | Canonical tags | Done (www→non-www is a Vercel setting) |
| 1.3 | Wholesale price exposed publicly | Done |
| 1.4 | DB-driven dropdowns + cascading filters | Done |
| 1.5 | Dead category tiles | Done (was already on `main`) |
| 1.6 | Dirty model data | Done (unique constraint deferred — needs a canonical model table) |
| 1.7 | VW / Volkswagen split | Done |
| 1.8 | CAPA baked into model names | Done |
| 1.9 | Placeholder image on every part | Partial — fallback chain works; real photos are a data task |
| 1.10 | One page title sitewide | Done |
| 1.11 | Broken stat counters | Done |
| 1.12 | Duplicated label text | Done |
| 1.13 | Sitemap + structured data | Done |
| 1.14 | Gmail contact address | Done — **see blocker above** |
| 1.15 | Hours conflict | **Blocked** — needs Matthew |

### Section 2 — Phase 2A commerce

Done: order dashboard, stock decrement with row locking, two-tier pricing, wholesale accounts,
full Spanish i18n.

Not done: **Stripe checkout** (JJ's, by Luca's decision) and **reserve-now / pay-at-pickup** (the
spec marks it "not finalized"; needs Matthew's deposit amount and hold expiry).

### Section 3 — Phase 2B growth

Done: VIN lookup, AI chat, cross-sell, reorder from history, back-in-stock alerts, ZIP delivery
estimator, shipping labels, trust signals.

Not done: **rewards programme** — the spec itself says it needs earn/redeem rates from Matthew
before building.

### Section 4 — also worth adding

Done: better fitment data, returns & warranty page, local landing pages, eBay link (needs the URL).

Not done: part photographs, the first stock count — both legwork rather than code.

---

## Routes

**Public** — every one has a Spanish twin at the same path prefixed with `/es`:

```
/                    /catalog            /catalog/[id]
/vin                 /estimate           /returns
/parts/[city]        /account            /account/orders
/account/orders/[id] /account/sign-in    /account/sign-up
```

Cities: `winter-park`, `apopka`, `kissimmee`, `sanford`, `daytona-beach`, `lakeland`.

**Staff** (all behind auth):

```
/dashboard  /products  /stock     /suppliers  /import
/inquiries  /orders    /alerts    /customers  /staff
```

---

## Decisions not to undo

These were deliberate. Changing them re-introduces a bug that was specifically fixed.

1. **Public queries must never select `price`.** `price` is the wholesale/trade price;
   `retailPrice` is public. `productSelectFor(tier)` in `src/lib/pricing.ts` decides what the
   *query* fetches, not what the template renders — so wholesale cannot leak through the RSC
   payload, a link, or a future refactor. Verified: a retail viewer's page contains `$469.00` and
   zero occurrences of `339.00`.

2. **Structured data and page metadata always use the retail price**, regardless of who is viewing.
   Search engines cache that markup; emitting a trade price because a wholesale account rendered
   the page would publish trade pricing to the internet.

3. **Customers are a separate table from staff.** `users` grants staff access; `customer_accounts`
   does not. No bug in customer signup can mint a staff account.

4. **The middleware is a denylist and that is intentional.** Unknown URLs must 404, not redirect to
   the staff login (spec 1.1). It is *not* the security boundary — `(admin)/layout.tsx` calls
   `requireAuthContext()` and every action re-checks. `src/lib/supabase/middleware.test.ts` walks
   `src/app/(admin)/` and **fails the build** if a new staff route isn't listed. It has caught this
   three times; do not delete it.

5. **`null` means "not recorded", never "no"** — for fitment fields (`src/lib/fitment.ts`) and for
   `lastCountedAt`. Telling a shop a door has no mirror hole when nobody checked causes the exact
   return the feature prevents.

6. **The landing page is not to be restyled.** `CLAUDE.md` has the detail. Behavioural fixes with a
   specific reason are fine — 1.11 and 1.12 were done that way.

7. **Local landing pages must stay genuinely different from each other**, or Google treats them as
   doorway pages. `src/lib/locations.ts` has the warning and a test enforces it.

8. **The chat can only learn catalogue facts through its one tool.** No catalogue data goes in the
   prompt. That is what stops it inventing parts or prices.

---

## Outstanding — blocked on people

### JJ

- **Stripe checkout.** Everything around it exists — orders, stock that can't oversell, statuses,
  labels. Spec asks for card / Apple Pay / Google Pay, and for the **webhook** to be the source of
  truth for payment, not the client callback. `Order.stripePaymentIntentId` is already on the model
  and is unique so a replayed webhook can't double-create.
- **www → non-www redirect** — a Vercel domain setting.
- **Check Vercel's Preview environment points at the dev database**, not production.
- **Review and merge** PR #2, then this branch.

### Matthew

- Rewards earn/redeem rates.
- Reserve-now deposit amount and hold expiry.
- Flat `$100` markup vs a percentage (`RETAIL_MARKUP_USD` in `src/lib/pricing.ts`; a flat amount is
  +50% on a $199 part and +19% on a $539 one).
- Delivery ZIP zones and the out-of-city fee (`src/lib/delivery.ts` — currently says "call for a
  quote" rather than guessing).
- Sign-off on the returns policy (`/returns` — draft).
- Real business hours (site says Mon–Fri 9–5; Facebook says always open).
- Google / Facebook / Yelp / eBay URLs (`REVIEW_LINKS` in `src/lib/site.ts` — links are hidden
  while empty rather than shipped broken).

### Luca

- Create the `sales@` mailbox (**the deploy blocker**).
- `ANTHROPIC_API_KEY` in Vercel to switch the chat on, plus a spend limit. Without it the widget
  doesn't render and the endpoint hands off to the phone number.
- Export old indexed URLs from Search Console for the 301 map.
- Make CI a required status check in GitHub branch protection.
- Exclude the project from iCloud sync (see gotchas).

### Legwork

Part photographs; the first stock count (`/stock` ranks what to count first); filling in fitment
detail as parts are handled.

---

## Gotchas

- **iCloud duplicates build files.** It leaves `foo 2.ts` copies inside `.next` and
  `src/generated`, which redeclare every type and break `tsc` with errors unrelated to any source
  change. `npm run typecheck` clears them first (`clean:dupes`). Fix at source by excluding the
  project from iCloud.
- **Never delete `.next` while the dev server is running** — it corrupts Turbopack's cache and the
  server starts 404ing every route. Stop the server first. This bit twice.
- **Port 3000 may be taken** by another project's dev server. `.claude/launch.json` has
  `autoPort: true`, so the preview picks a free port; nothing in this app needs 3000.
- **The dev database only contains DOOR products** (325 of them). Features that depend on other
  part types — cross-sell especially — correctly render nothing locally. That is the in-stock
  filter working, not a bug.
- **`DIRECT_URL` must never be `db.<ref>.supabase.co`** — IPv6-only and unreachable. See
  `CLAUDE.md`.

---

## Deploy runbook

1. Create the `sales@` mailbox (or revert `EMAIL` in `src/lib/site.ts`).
2. Confirm Vercel **Preview** env vars point at dev Supabase, not production.
3. Merge PR #2, then `feat/customer-accounts`.
4. Migrations apply automatically during the build — nothing to run by hand.
5. After deploying, run `npm run clean:vehicles` against production (dry run first, then `--apply`).
6. Optional: add `ANTHROPIC_API_KEY` to switch on the chat.
7. Attach the domain and set the www redirect. **If a site already lives there, this is a DNS
   cutover, not an update — plan it.**

---

## Commit history (this branch, oldest first)

```
0cf9897 test+ci: add unit tests, CI workflow, and migrate-on-deploy
47d2ade feat: harden public site — spam protection, error boundaries, SEO
5edc36a feat(pricing): split retail from wholesale (spec 1.3 / step 6)
ff84cfb fix(routing): unknown URLs 404 instead of redirecting to staff login
f3cac40 fix(landing): server-render real stat values, stop double-rendering labels
d02aaaf fix(contact): move public email to sales@autodoorstoreorlando.com
2d2c28e fix(data): canonical makes and models, CAPA out of model names
7834884 feat(accounts): customer accounts, trade approval, per-account pricing
744a5de feat(catalog): cascading Year -> Make -> Model -> Part filters
00c4564 feat(orders): order records + stock decrement with row locking
d37b947 feat(vin): find parts by VIN
34f81db feat(chat): catalog-grounded AI parts assistant
70908bc feat(seo): Product/Offer and LocalBusiness structured data
536be12 feat(i18n): Spanish translation foundation
161ccf7 feat(i18n): Spanish catalog at /es/catalog
fbd2318 feat(i18n): Spanish product detail and VIN lookup
8897bf0 feat(i18n): Spanish landing page — customer-facing Phase 2A complete
6e04223 fix(vin): distinct helper text under the VIN input
07141cb feat(alerts): back-in-stock requests from empty searches
2015567 feat(2b): cross-sell suggestions and ZIP delivery estimator
b7fb2f1 feat(2b): reorder from history, trust signals, returns policy
a749c7f feat(2b): PDF shipping labels from order data
91e8810 feat(fitment): OEM reference, shell/skin, material, paint prep, pre-cut holes
4e6941d feat(seo): local landing pages for the six named cities
6a39baa feat(stock): accuracy pass — verification worklist for staff
0786d41 feat(estimate): insurance estimate upload with VIN + parts extraction
f50075c feat(i18n): Spanish account pages — sign-in, dashboard, orders, reorder
```

Each commit message explains *why*, not just what — including what was deliberately not done and
what was verified. They are worth reading before changing anything in that area.

---

## Database migrations added in Phase 2

```
20260817201259_add_retail_price        two-tier pricing (hand-written: add, backfill, constrain)
20260817205230_add_customer_accounts   customer accounts + saved vehicles
20260819181653_add_orders              orders, order items, order-number sequence
20260819183231_add_chat                chat sessions and messages
20260819223138_add_part_alerts         back-in-stock requests
20260820001052_add_fitment_detail      OEM ref, shell/skin, material, paint prep, holes
20260820003629_add_stock_counting      lastCountedAt
```

All additive. None drop or truncate anything.
