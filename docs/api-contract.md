# API reference

The CMS exposes Payload's REST API under `https://editor.example.com/api` plus a few custom endpoints. GraphQL is disabled. All access rules are enforced server-side; the website only uses the public subset.

## Public (no auth)

| Method & path | Notes |
| --- | --- |
| `GET /api/articles?where[...]&sort=-publishedAt&limit&page&depth` | Only `status=published` live versions. Subscriber-only stories return `preview` (3 blocks) and **no `body`**. `body`, `searchText` and editorial notes cannot be queried. |
| `GET /api/categories`, `/api/tags`, `/api/authors`, `/api/redirects` | Public taxonomy and redirect map |
| `GET /api/plans` | Active subscription plans |
| `GET /api/search?q=&page=&limit=` | Postgres full-text search over published stories (max 20 per page) |
| `GET /api/billing/providers` | Configured payment providers, preferred first |
| `GET /api/health` | `200 {ok:true}` when the database answers |
| `POST /api/readers` | Reader sign-up (cannot set entitlements) |
| `POST /api/readers/login`, `/logout`, `/forgot-password`, `/reset-password`, `GET /api/readers/me` | Reader auth (Payload) |

## Reader (Authorization: `JWT <reader token>`)

| Method & path | Notes |
| --- | --- |
| `GET /api/articles?...` | Entitled readers also receive `body` on subscriber-only stories |
| `GET /api/subscriptions` | The reader's own subscriptions only |
| `POST /api/billing/checkout` `{ plan, provider? }` | Returns `{ url }` for provider-hosted checkout. 409 if already subscribed. |
| `POST /api/billing/cancel` `{ subscription }` | Cancels at period end with the provider |

## Webhooks & system

| Method & path | Auth |
| --- | --- |
| `POST /api/billing/webhooks/stripe` | `Stripe-Signature` (HMAC-SHA256, 5-minute tolerance) |
| `POST /api/billing/webhooks/razorpay` | `X-Razorpay-Signature` (HMAC-SHA256 of raw body); de-duplicated by `x-razorpay-event-id` |
| `GET /api/cron/publish-scheduled` | `Authorization: Bearer $CRON_SECRET` (Vercel Cron) |

## Staff (admin UI / `JWT <staff token>`)

Standard Payload REST on all collections, subject to the role matrix:

| Role | Articles | Other |
| --- | --- | --- |
| super_admin | everything | users & roles, plans, audit log, payment events |
| editor_in_chief | everything | audit log, taxonomy |
| section_editor | approve/publish/unpublish in assigned sections | taxonomy |
| journalist | create; edit own drafts; submit | — |
| copy_editor | edit drafts/submitted/in review/approved; move to review; send back | — |
| seo_manager | SEO fields and slug only, any non-archived story | taxonomy, redirects |
| ad_manager | read only | media upload |
| analyst | read only | readers & subscriptions (read) |

Publishing = `PATCH /api/articles/:id` with `_status: "published"` (the admin's **Publish** button) on an article whose status is Approved (or later). Saving a draft = `?draft=true`. Unpublishing = status `archived` + `workflowNote` + Publish.

## Website (apps/web) routes

| Path | Purpose |
| --- | --- |
| `POST /api/revalidate` | CMS → website cache purge (`Bearer $REVALIDATE_SECRET`) |
| `GET /api/article-body/:slug` | Full subscriber body for the signed-in reader (uncached) |
| `POST /api/auth/{login,register,logout,forgot,reset}`, `/api/subscribe`, `/api/account/cancel` | Form handlers; same-origin check + SameSite=Lax HTTP-only session cookie |
| `/feed.xml`, `/category/:slug/feed.xml`, `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt`, `/ads.txt` | Distribution |
