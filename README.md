# ADS Auto Parts

Inventory management and public parts catalog for [ADS Auto Door Store](https://maps.google.com/?q=6950%20Venture%20Cir%2C%20Orlando%2C%20FL%2032807), an Orlando auto body parts dealer.

Two halves of one app:

- **Public site** (`/`, `/catalog`) — customers browse parts by vehicle fit and request quotes.
- **Staff dashboard** (`/dashboard`, `/products`, …) — inventory, suppliers, bulk import, inquiries, and staff management, behind Supabase auth.

For architecture, data-model rules, and conventions, read [`CLAUDE.md`](CLAUDE.md). This file covers **running and deploying** it.

---

## Requirements

- **Node.js 20 or 24** (CI tests both)
- **npm**
- Access to a **Supabase project** — a dev one for local work, a separate one for production

## Getting started

```bash
npm install
```

Then create your environment file:

```bash
cp .env.example .env
```

Fill in all five variables (see [Environment variables](#environment-variables)). Point them at the **dev** Supabase project — never production.

Apply the schema and seed the first owner account:

```bash
npm run db:migrate:deploy
npm run db:seed
npm run setup:storage
```

Start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000.

---

## Environment variables

All five are required. `.env` is gitignored; `.env.example` documents the shape.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler**, port **6543**, with `pgbouncer=true`. Every runtime query uses this. |
| `DIRECT_URL` | Supabase **session pooler**, port **5432**, no pgbouncer flag. Used only by Prisma Migrate. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Exposed to the browser. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. Exposed to the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Bypasses row-level security and can modify any auth user. Never expose to the browser. |

Optional:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, Open Graph tags, and the sitemap (e.g. `https://adsautodoorstore.com`). Falls back to Vercel's production domain, then `http://localhost:3000`. **Set this once the real domain is attached** — otherwise shared links and the sitemap point at the wrong host. |

### The two database URLs are not interchangeable

This is the single most common way to break this project.

- `DATABASE_URL` is **pooled** (PgBouncer, port 6543). The app uses it for every query.
- `DIRECT_URL` is **direct** (port 5432). Migrate needs a non-pooled connection for advisory locks and DDL.

**Never set `DIRECT_URL` to `db.<project-ref>.supabase.co`.** That host is IPv6-only and unreachable on the shop's network. Use the session pooler hostname.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server. |
| `npm run build` | **Production build.** Generates the Prisma client, **applies pending migrations**, then builds. |
| `npm run build:ci` | Build without applying migrations — used by CI, which has no real database. |
| `npm start` | Serve a production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Unit tests (Vitest), one pass. |
| `npm run test:watch` | Unit tests in watch mode. |
| `npm run db:migrate:deploy` | Apply pending migrations to the database in `DIRECT_URL`. |
| `npm run db:migrate:status` | Show which migrations have and haven't been applied. |
| `npm run db:seed` | Create the first OWNER account. |
| `npm run setup:storage` | Create the Supabase storage buckets for part photos. |
| `npm run reset:products` | **Destructive.** Wipes products. Dev only. |

## Tests

```bash
npm test
```

Vitest, covering the pure modules — the workbook import parser, permission predicates, availability labels, SKU generation, quote-form validation, and the CSV parser. No database or browser required.

Tests live next to the code as `src/**/*.test.ts`.

---

## Deploying

Hosted on **Vercel**, deployed from GitHub.

### Branching

`main` is protected. **Never push to `main` directly.**

```bash
git checkout -b your-branch
# ...work...
git push -u origin your-branch
gh pr create
```

Opening a PR gives you two things: CI runs lint, typecheck, tests, and a build on Node 20 and 24; and Vercel builds a **preview deployment** at its own URL. That preview link is what to send a reviewer — it's the real app, not a screenshot. Merging to `main` triggers the production deploy.

### Migrations run automatically

`npm run build` runs `prisma migrate deploy` before `next build`, so Vercel applies pending migrations as part of every deploy. Two consequences:

- `DIRECT_URL` **must** be set in Vercel, or the build fails.
- A bad migration fails the build instead of shipping code against a schema that doesn't exist yet. That's intentional.

### Environment separation

Set environment variables per environment in the Vercel dashboard:

- **Production** → the production Supabase project.
- **Preview** → the **dev** Supabase project.

Getting this wrong means every pull-request preview writes test inquiries and product edits into the live database.

### First production deploy checklist

1. Connect the GitHub repo to a Vercel project.
2. Add all five environment variables, scoped to **Production**, pointing at production Supabase.
3. Add the same five scoped to **Preview**, pointing at dev Supabase.
4. Set `NEXT_PUBLIC_SITE_URL` to the real domain.
5. Deploy. Migrations apply during the build.
6. Run `npm run db:seed` against production once, to create the owner account.
7. Run `npm run setup:storage` against production once, to create the photo buckets.
8. Attach the domain in Vercel and point DNS at it.

> If a site already lives on that domain, step 8 is a cutover, not an update — plan it deliberately rather than discovering it on merge day.

---

## Notes

- **Availability is a label, never a number.** The public site shows `IN STOCK` / `LOW STOCK` / `CALL`. Exact quantities are staff-only. See `getAvailability()` in [`src/lib/format.ts`](src/lib/format.ts).
- **Permissions are enforced in server actions**, not just the UI. `src/lib/permissions.ts` is the single source of truth. A UI check without a matching action check is a bug.
- **`ADMIN` is shown to users as "Manager."**
- **The landing page is deliberately frozen.** See the "DO NOT TOUCH" section in [`CLAUDE.md`](CLAUDE.md) before editing `src/app/(public)/page.tsx`.
