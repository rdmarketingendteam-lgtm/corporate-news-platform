# Corporate News Platform

English-first news platform for India + international coverage: a public **Next.js** website and a **Payload CMS** newsroom, on **PostgreSQL**, deployed to **Vercel** with **Neon**.

| App | Path | What it does |
| --- | --- | --- |
| Website | `apps/web` | Homepage, articles, sections, topics, authors, search, RSS, sitemaps, reader accounts, subscriptions, ads |
| CMS | `apps/cms` | Admin at `/admin`, REST API at `/api`, editorial workflow, roles, billing webhooks, scheduled publishing |

## What's implemented

1. **Rich-text renderer** — `apps/web/components/RichText.tsx`. Every Lexical node is mapped explicitly (no raw HTML): headings, lists, quotes, tables, images with captions/credits, internal and external links (scheme allow-list), pull quotes, fact boxes, and embeds (privacy-enhanced YouTube iframe; X/Instagram/other as link cards — no third-party scripts).
2. **Role-based permissions** — `apps/cms/src/access/roles.ts`. Eight roles enforced server-side at collection *and* field level. Section editors publish only in their sections; SEO managers edit only SEO fields and slugs; ad managers and analysts are read-only on content; only super admins change roles. The first account created becomes `super_admin`.
3. **Editorial workflow** — `apps/cms/src/workflow/`. Draft → Submitted → In review → Approved → Published/Scheduled, plus Archived (unpublish). Transition rules per role, mandatory notes for send-backs and unpublishing (kept as editorial feedback), edits to live stories stay private until re-published, slug changes on live stories create 301 redirects, published stories can't be deleted, everything recorded in an append-only **audit log**.
4. **Payments** — `apps/cms/src/billing/`. **Razorpay and Stripe, switchable** (either or both). Provider-hosted checkout only (no card data touches our servers), signature-verified webhooks with replay protection, idempotency ledger, provider re-fetch on every event (immune to out-of-order delivery), cancel-at-period-end, entitlement with renewal grace. Paywall is enforced by the CMS: non-subscribers receive a 3-paragraph preview, never the full body.
5. **Ads + consent** — Google Ad Manager via GPT (`apps/web/components/ads/`). Ads load only after the reader's consent choice; "Essential only" → non-personalised ads. Reserved slot heights (no layout shift), labelled "Advertisement", no ads inside sponsored content, ad-free plans supported, `/ads.txt`.
6. **Search, sitemaps, RSS, cache invalidation** — Postgres full-text search with a GIN index (weighted headline > dek > body), `/sitemap.xml`, Google News `/news-sitemap.xml` (48h window, ≤1,000), `/feed.xml` + per-section feeds, and on-publish cache purge from the CMS to the website (`revalidateTag`, instant on Vercel's CDN).
7. **Tests + deployment** — 75 CMS tests (36 unit + 39 Postgres integration tests against the real migrations) and 17 website tests; GitHub Actions CI; Vercel configs for both apps; Neon-ready migrations; scheduled publishing via Vercel Cron.

See [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) for what's verified and what still needs a human decision before launch.

## Local development

Prerequisites: Node 20.9+ (22 recommended), pnpm 9, Docker (or any Postgres 16).

```bash
docker compose up -d postgres                 # creates `news` and `news_test` databases
cp apps/cms/.env.example apps/cms/.env        # then edit secrets
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter cms migrate                     # create the schema
pnpm --filter cms seed                        # optional: demo sections, staff per role, plans, stories
pnpm dev                                      # web → http://localhost:3000, CMS → http://localhost:3001/admin
```

Seeded staff accounts (`admin@example.com`, `eic@example.com`, `india.editor@example.com`, `reporter@example.com`, `copy@example.com`, `seo@example.com`, `ads@example.com`, `analyst@example.com`) use the password printed by the seed script.

### Tests

```bash
pnpm -r typecheck
pnpm -r test                 # unit tests (both apps)
pnpm --filter cms test:int   # integration tests; wipes and migrates the news_test database
```

### Changing the CMS schema

Edit a collection, then generate and commit a migration:

```bash
pnpm --filter cms migrate:create <name>
pnpm --filter cms generate:types && pnpm --filter cms generate:importmap
```

CI runs integration tests against migrations (not schema push), so a schema change without a migration fails the build.

## Deployment

Step-by-step Vercel + Neon runbook: [`docs/deployment.md`](docs/deployment.md). API reference: [`docs/api-contract.md`](docs/api-contract.md). Product blueprint: [`docs/blueprint.md`](docs/blueprint.md).
