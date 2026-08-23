@AGENTS.md

> **Picking up work on this project? Read [`CHANGELOG.md`](CHANGELOG.md) first.**
> It records exactly where Phase 2 left off, what is blocked and on whom, and the
> design decisions that must not be undone. It is kept current — trust it over
> assumptions about the code.


# ADS Auto Parts

Inventory + public catalog for an Orlando auto body parts dealer.

## Stack

- **Next.js 16.2.11** — App Router under `src/app`, route groups `(admin)` and `(public)`, server actions.
- **React 19.2.4**, TypeScript, **Tailwind v4** (via `@tailwindcss/postcss`).
- **Prisma 7.9** with the `@prisma/adapter-pg` driver adapter. The client is generated to `src/generated/prisma` — import from `@/generated/prisma/client` and `@/generated/prisma/enums`, **not** `@prisma/client`.
- IDs are `@default(cuid())` on every model. `@paralleldrive/cuid2`'s `createId()` is used in exactly one place — `src/app/(admin)/import/actions.ts` — to pre-generate IDs for bulk `createMany` calls.
- **Supabase** Postgres + `@supabase/ssr` for auth. Deployed on **Vercel**.
- `next.config.ts` raises the server-action body limit to 10mb; hand-maintained inventory workbooks exceed the 1MB default.

Scripts: `dev`, `build` (runs `prisma generate` first), `lint`, `db:seed`, `setup:storage`, `reset:products`.

## Database connection — critical

Two URLs, and they are not interchangeable:

- `DATABASE_URL` — Supabase **transaction pooler, port 6543, `pgbouncer=true`**. All runtime queries go through this (`src/lib/prisma.ts`).
- `DIRECT_URL` — Supabase **session pooler, port 5432, no pgbouncer flag**. Used only by Migrate (`prisma.config.ts`), which needs a non-pooled connection for advisory locks and DDL.

**Never change `DIRECT_URL` to `db.<ref>.supabase.co`.** That host is IPv6-only and unreachable on this network.

Local development connects to a **separate dev Supabase project** — never production.

## Data model

Products are identified by **vehicle fit**: make / model / `yearStart`–`yearEnd` + `partType` + `position`.

**Part identity is fit + part type, never a manufacturer number.** `Product.sku` is an org-generated code (e.g. `ACC-18-DR-L`), unique per org, and it is what everything keys off.

`Product.oemPartNumber` was added in Aug 2026 for the Phase 2 spec's fitment work. It is an **optional cross-reference** a shop can quote against an insurance estimate — deliberately not unique, nothing keys off it, and it does not change the identity rule above.

`VehicleFit` handles parts fitting multiple vehicles — a shared bumper cover gets a second `VehicleFit` row, not a second `Product`. Search matches across *all* of a product's fits; the primary fit on `Product` is kept in sync by the single-fit admin form.

Enums (see `prisma/schema.prisma` for the authoritative list):

- **`PartType` — 13 values:** `DOOR`, `HOOD`, `TAILGATE`, `TRUNK`, `LIFTGATE`, `REAR_BODY_PANEL`, `QUARTER_PANEL`, `FENDER`, `BUMPER`, `GRILLE`, `HINGE`, `RADIATOR_SUPPORT`, `REINFORCEMENT_BAR`.
- **`PartPosition`** — `FRONT_LEFT`, `FRONT_RIGHT`, `REAR_LEFT`, `REAR_RIGHT`, `FRONT`, `REAR`.
- **`PartCondition`** — `A`, `B`, `C`.
- **`UserRole`** — `OWNER`, `ADMIN`, `STAFF`. **`ADMIN` is displayed to users as "Manager".** `ROLE_LABEL` in `src/lib/permissions.ts` is the single source of truth for that.

`src/lib/permissions.ts` also holds the `can*` predicates. They gate **server actions** — that is the real boundary — and are reused to hide or disable UI. Adding a UI check without the action check is a bug.

`capaCertified` marks new aftermarket parts built to certified fit & finish standards. Never used salvage.

## Public site rules

- **Availability is shown as a label only.** `getAvailability()` in `src/lib/format.ts` returns `IN STOCK` (`#4ADE80`), `LOW STOCK` (`#FBBF24`), or `CALL` (`#9CA3AF`). **Never display exact quantities on public pages.**
- **Theme is light** (changed Aug 2026 at the client's request — it previously ran near-black
  throughout, which read as generic rather than as a parts supplier). A cool grey ground the colour
  of primer, white cards, and graphite bands for the header, the footer and the landing hero, which
  is where the industrial weight now lives. Cool grey deliberately, not warm cream: the subject is
  painted steel.
- **Colour comes from the tokens in `src/app/globals.css`, never from a literal.** The site carried
  465 colour literals across 41 files, which is what made the light conversion a project rather
  than an edit. `--surface-*`, `--ink-*`, `--line-*`, `--accent*`, `--stock-*`.
- Anything on a dark band must state its own text colour rather than inherit — the `(public)`
  layout sets ink for the page, so an inheriting band renders black on black.
- Red `#E31E24` is still reserved for the primary action and the CAPA mark, so it keeps meaning.
  `--accent-hover` is the darker shade, used for hover on light and for small red labels that would
  otherwise miss AA.
- Part images (`src/lib/part-images.ts`) are **one shared image per part type**, never per product. Callers prefer `product.photos[0]` first; `getPartTypeImage()` returns `null` for "no default" — render a placeholder box, never a broken `<img>`.

## The landing page: no restyling

`src/app/(public)/page.tsx` was deliberately reverted to its pre-restyle state. **Do not restyle it.** Its visual design is settled; changes here should be behavioural fixes with a specific reason, not aesthetic ones.

**Two deliberate exceptions, both made at the client's explicit request (Aug 2026):** a VIN entry
point was added inside the hero search card, because the VIN lookup existed nowhere else a customer
would start; and the sections below the hero were converted to the light theme. The hero itself
keeps its dark ground and its layout is unchanged.

- It defines its own local `sectionHeadingClass` and `badgeClass` and deliberately does **not** import `src/lib/public-ui.ts`. The catalog and product detail pages *do* use that shared scale. This divergence is correct — do not reconcile it.
- Its opacity-0 `Reveal` wrappers are intentional. Leave them.

**Superseded (Aug 2026):** this section previously also froze the `CountUp` counters rendering `0 HR / 0 PM / 0%` as "accepted and intentional". The Phase 2 build spec lists that as bug 1.11, and it is a real defect — the server rendered `0`, so any visitor who didn't scroll to the stats band, every crawler, and anyone without JS saw the homepage advertise zero. `CountUp` now takes the real value as its initial state and treats the animation as progressive enhancement. Spec 1.12 (mobile/desktop label variants both rendering into the markup) was fixed in the same pass. Neither changed the page's visual design.

`src/lib/public-ui.ts` (public) and `src/lib/admin-ui.ts` (staff) are the shared type scales for everything else.

## Workflow

`main` is protected. Branch from `main`, open a pull request. **Never push to `main` directly.**
