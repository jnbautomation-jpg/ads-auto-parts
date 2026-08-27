# Changelog — Phase 2

**Last updated:** 25 August 2026
**Branch:** `main` (deployed). One PR open: #11.
**Live at:** https://www.autodoorstoreorlando.com

> **Reading this to pick up work?** Start at [Where we left off](#where-we-left-off), then
> [Outstanding](#outstanding--blocked-on-people) and [Decisions not to undo](#decisions-not-to-undo).
> The spec this implements is `ADS-Phase2-Build-Spec.pdf` (the client's document, not in the repo —
> Luca has it).

---

## Where we left off

**The site is live and everything built is deployed.** Eleven PRs merged. What follows is the
state on 25 August 2026.

### Live and working

Light theme, Spanish site at `/es`, VIN lookup, insurance-estimate upload, returns page, customer
accounts, orders, catalogue-grounded AI chat (answering in both languages against real stock),
mobile navigation, order receipts, 592 products across 10 part types.

### Open PR

**#11 — ad conversion tracking + favicon.** Google Ads and Meta Pixel were never carried over from
the old Wix site, so two live campaigns have been reporting zero conversions since launch. Adds
both tags plus a `generate_lead` / `Lead` event on quote submission, and replaces Next.js's default
favicon with the shop's logo mark. Needs JJ to merge.

### The one that is costing money right now

**Form leads reach nobody.** `submitQuoteRequest` writes an Inquiry row and returns. There is no
mail library in the project at all — no email is ever sent, to anyone. Leads are visible only on
`/inquiries` in the admin, which nobody opens.

The marketing director (Connie Lothian) reported this on 10, 13 and 17 August and twice offered to
pause the Google Ads over it. Her test leads are sitting in `/inquiries`. **This is the highest
priority item in the project** — ad spend is buying leads that nobody sees.

Fixing it needs an email provider chosen and credentialed. Resend is the obvious fit on Vercel.
Nothing is built yet; this is a green field.

### Also raised by marketing, not yet addressed

- **No blog.** The old Wix site had blog pages Google had indexed. That SEO is lost. Rebuilding
  needs the old post content — exportable from Wix, or recoverable from Google's cache.
- **Old URLs still 404.** They no longer land on the staff login (spec 1.1 fixed that), but there
  is no 301 map, so live Google Ads clicks on old URLs hit a 404 and the shop pays for them.
  Blocked on the old URL list from Search Console.
- **Sitemap never submitted** to Search Console. The sitemap itself is valid and serving 603 URLs.
  Submission has to happen in Connie's Search Console account.
- **Google Ads conversion label** not supplied. `GOOGLE_LEAD_CONVERSION_LABEL` in
  `src/lib/tracking.ts` is empty, so the lead event shows in reports but does not register as a
  campaign conversion until marketing sends the label from the Ads UI.

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

**Resolved (Aug 2026):** the `sales@autodoorstoreorlando.com` mailbox was never created, and the
public address is back on the shop's working Gmail. That is a decision, not a stopgap — see the
comment above `EMAIL` in `src/lib/site.ts`. Spec 1.14's point (get off a personal account and onto
the business domain) still stands whenever the shop wants it, and it is a one-line change.

---

## Health

| Check | State |
| --- | --- |
| Unit tests | 348 passing across 27 files |
| CI | Green — lint, typecheck, tests, production build, on Node 20 and 24 |
| Live-site regression sweep | 46 checks passing — predates the i18n completion pass, not re-run since |
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
full Spanish i18n — including the parts of it that were missing when this file first claimed it was
finished (see [Where we left off](#where-we-left-off)). Spanish now covers the routes, both
footers, the trust band, both quote forms and their server-side validation messages, the 404 and
error pages, the chat bubble's own chrome, `<html lang>`, and the social cards.

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

`src/lib/i18n-routes.test.ts` walks `src/app/(public)/` and **fails the build** if that sentence
stops being true in either direction. It was written because it had already stopped being true.

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

8. **Public pages never show an exact stock count.** Counts were added on 25 Aug at the client's
   request and removed the same day at their request. The reasons the rule exists, so the next
   person starts from the reasoning: a competitor can read the shop's whole stock position off the
   site, "1 left" makes retail buyers hesitate, and the number is wrong the moment a part sells
   over the phone. `i18n.test.ts` pins that an availability label never contains a digit.

9. **The public site is light; the header, footer and landing hero are graphite bands.** Changed
   25 Aug at the client's request — near-black throughout read as generic rather than as a parts
   supplier. **Anything on a dark band must state its own text colour rather than inherit**: the
   `(public)` layout sets ink for the page, so an inheriting band renders black on black. That bug
   shipped twice — once on the hero, once on the landing header's logo.

10. **Colour comes from tokens in `globals.css`, never a literal.** The site carried 465 colour
    literals across 41 files, which is what made the light conversion a project rather than an edit.

11. **The public email stays on `autodoorstorewest@gmail.com`.** `sales@autodoorstoreorlando.com`
    was never created and the client decided not to create it. Spec 1.14 is a choice now, not a
    task. One line in `site.ts` if it ever changes.

12. **Ad tracking IDs live in `site.ts`, not env vars.** They are public identifiers that appear in
    the page source by design. An empty string disables that tag.

13. **The lead conversion event fires only after the server confirms the lead is saved**, wrapped
    in try/catch. A blocked tracker must never cost the shop a lead, and a tracking exception must
    never surface to a customer who has just successfully sent one.

14. **The chat can only learn catalogue facts through its one tool.** No catalogue data goes in the
   prompt. That is what stops it inventing parts or prices.

9. **Every public page exists in both languages, and a test enforces it.**
   `src/lib/i18n-routes.test.ts` walks the route tree. An English page without an `/es` twin is a
   failed build, because the twin is already promised by the page's own hreflang and by the header
   on every Spanish page — a missing one is a 404 in the primary nav, not a missing translation.

10. **No Spanish string may equal its English source.** `i18n.test.ts` walks the whole dictionary.
    Genuine cognates ("Material", "VIN") are listed by name in `SAME_IN_BOTH`; add to that list
    rather than weakening the check. This is what catches a key added to `en.ts` and pasted
    unchanged into `es.ts`.

11. **What a Spanish customer sends is stored in English.** The part dropdown submits the English
    label, and `actions.ts` writes `Vehicle:` / `Part needed:` prefixes that `parseQuoteMessage()`
    reads back for the admin inquiries table. Staff screens are English; translating what gets
    stored makes a Spanish lead show "—" for vehicle and part.

12. **Business hours live in `src/lib/site.ts` in both languages, not in the dictionaries.**
    `HOURS_DISPLAY_IN` / `PHONE_NOTE_IN` sit directly beside the English constants. Hours are a
    contested fact still blocked on Matthew, and a shop whose Spanish page advertises different
    opening hours from its English page is worse than one that is only half translated. Three
    copy-pasted duplicates of the hours string were removed to get here.

13. **`global-error.tsx` is English on purpose.** It replaces the root layout, so it has neither
    request headers nor a router and cannot know which language the visitor was reading. Guessing
    would produce a page whose `<html lang>` contradicts its own text. The phone number is the
    useful part of that page and reads the same either way.

---

## Outstanding — blocked on people

### Highest priority — Luca

- **Choose an email provider so form leads reach a human.** Nothing built yet. See
  [Where we left off](#where-we-left-off). Every day this waits, ad spend buys leads nobody sees.
- **Send Connie the Google Ads conversion label request** and get the old URL list out of Search
  Console so the 301 map can be written.
- **Set a spend limit on the Anthropic account.** The chat is public and answering; the key is
  live in Vercel. Not done as of 25 Aug.
- Export the Wix blog content if the shop wants that SEO back.
- Exclude the project folder from iCloud. `clean:dupes` now cleans `.tsx` too and runs before
  `dev` and `test`, so it self-heals — but the copies keep appearing.

### JJ

- **Merge PR #11.**
- **Stripe checkout.** Not started. Customers still cannot pay on the site — this is the single
  largest gap between "live site" and "working business". Everything around it exists: orders,
  stock that cannot oversell, statuses, labels, receipts. `Order.stripePaymentIntentId` is on the
  model and unique so a replayed webhook cannot double-create. The spec wants card / Apple Pay /
  Google Pay and the **webhook** as the source of truth for payment, not the client callback.
- **Fix `DIRECT_URL` in Vercel Production.** The build no longer fails on it — `prisma.config.ts`
  derives the session pooler from `DATABASE_URL` when `DIRECT_URL` points at the IPv6-only host —
  but it prints a warning on every deploy until it is corrected.
- Make the `verify` checks required before merging to `main`. They run on every PR; nothing blocks
  a merge while they are red.
- `www` → non-www redirect.
- Confirm the Preview environment points at the dev database, not production.

### Matthew

- Real business hours. Site says Mon–Fri 9–5; Facebook says always open. Both languages read from
  `HOURS_DISPLAY_IN` in `src/lib/site.ts`, so it is one edit.
- Sign-off on the returns policy — `/returns` is live with draft terms.
- Delivery ZIP zones and the out-of-city fee (`src/lib/delivery.ts` currently says "call for a
  quote" rather than guessing).
- Google / Facebook / Yelp / eBay URLs (`REVIEW_LINKS` in `src/lib/site.ts` — links are hidden
  while empty rather than shipped broken).
- **Rewards earn/redeem rates** and the **reserve-now deposit and hold expiry**. Both features are
  unbuilt and blocked entirely on these numbers.
- *Settled 25 Aug:* the flat $100 markup stays (`RETAIL_MARKUP_USD`). The client confirmed it when
  asking for the trade discount display.

### Legwork — not code

- **Part photographs.** Every part still shows a generic category image. Highest-value non-code job.
- The first stock count (`/stock` ranks what to count first).
- Check the live catalogue against the workbook before importing anything. The importer only
  **creates** — it never updates — and SKUs are unique, so re-importing overlapping rows either
  fails or duplicates. A replacement import needs the catalogue cleared first
  (`scripts/reset-products.ts`), which needs production database access.

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
- **Next does not deep-merge `openGraph`.** A page that sets it replaces the layout's object
  outright — set `{ url, title }` to fix one field and you have just dropped `og:image`,
  `og:site_name` and `og:type` from that page's share card. Three pages had lost their preview
  image this way. Build page metadata with `pageMetadata()` in `src/lib/metadata.ts` rather than
  hand-writing an `openGraph` block.
- **A layout cannot see the URL.** `<html lang>` can only be set in the root layout, and Next's
  documented answer (`app/[lang]/...`) is not usable here — it would move every English page under
  `/en` and break the indexed URLs spec 1.1 exists to protect. `src/proxy.ts` forwards the path as
  `x-pathname` (`PATHNAME_HEADER` in `src/lib/i18n.ts`) and the root layout, the `(public)` layout
  and both 404 pages read it. Client components use `usePathname()` instead.
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
fa860cd docs: add CHANGELOG as the handover point for future work
7994d91 fix(i18n): Spanish estimate and returns pages — the /es twins that were missing
668ff91 fix(i18n): the footers and contact block were English on every Spanish page
04a2272 fix(i18n): the quote forms — the Spanish site's conversion point — were English
eee6463 fix(i18n): Spanish pages declared lang="en" and shared as English
2ea2f9a fix(i18n): 404 and error pages answered in English on the Spanish site
a24c504 fix(i18n): the chat bubble greeted Spanish visitors in English
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
