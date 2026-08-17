@AGENTS.md

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

**There are no manufacturer part numbers in this catalog.** `Product.sku` is an org-generated code (e.g. `ACC-18-DR-L`), unique per org. Fit + part type is the real identity.

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
- Theme is dark: black, red `#E31E24`, white. Red is reserved for the primary action and the CAPA mark, so it keeps meaning.
- Part images (`src/lib/part-images.ts`) are **one shared image per part type**, never per product. Callers prefer `product.photos[0]` first; `getPartTypeImage()` returns `null` for "no default" — render a placeholder box, never a broken `<img>`.

## The landing page: no restyling

`src/app/(public)/page.tsx` was deliberately reverted to its pre-restyle state. **Do not restyle it.** Its visual design is settled; changes here should be behavioural fixes with a specific reason, not aesthetic ones.

- It defines its own local `sectionHeadingClass` and `badgeClass` and deliberately does **not** import `src/lib/public-ui.ts`. The catalog and product detail pages *do* use that shared scale. This divergence is correct — do not reconcile it.
- Its opacity-0 `Reveal` wrappers are intentional. Leave them.

**Superseded (Aug 2026):** this section previously also froze the `CountUp` counters rendering `0 HR / 0 PM / 0%` as "accepted and intentional". The Phase 2 build spec lists that as bug 1.11, and it is a real defect — the server rendered `0`, so any visitor who didn't scroll to the stats band, every crawler, and anyone without JS saw the homepage advertise zero. `CountUp` now takes the real value as its initial state and treats the animation as progressive enhancement. Spec 1.12 (mobile/desktop label variants both rendering into the markup) was fixed in the same pass. Neither changed the page's visual design.

`src/lib/public-ui.ts` (public) and `src/lib/admin-ui.ts` (staff) are the shared type scales for everything else.

## Workflow

`main` is protected. Branch from `main`, open a pull request. **Never push to `main` directly.**
