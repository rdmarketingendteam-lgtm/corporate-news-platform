# Deploying to Vercel + Neon

Two Vercel projects from one Git repository, sharing one Neon Postgres database.

```
www.example.com    → Vercel project "news-web"  (root: apps/web)
editor.example.com → Vercel project "news-cms"  (root: apps/cms)   ── Neon Postgres, Vercel Blob
```

## 1. Database (Neon)

1. In the **news-cms** Vercel project → Storage → add **Neon**. The integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
2. Nothing else to do: the CMS build (`vercel-build`) runs `payload migrate` over the **unpooled** URL before `next build`; the app serves traffic over the pooled URL.
3. Enable Neon's point-in-time restore / backups and **test a restore into a branch** before launch.

## 2. Media (Vercel Blob)

In **news-cms** → Storage → add a **Blob** store. This sets `BLOB_READ_WRITE_TOKEN`. Uploads go directly from the editor's browser to Blob, avoiding Vercel's 4.5 MB request-body limit.

## 3. CMS project (`news-cms`)

- Root directory: `apps/cms` (Vercel picks up `apps/cms/vercel.json`).
- Domain: `editor.example.com`.
- Environment variables (Production and Preview — use **different** secrets and a Neon branch for Preview):

| Variable | Value |
| --- | --- |
| `PAYLOAD_SECRET` | `openssl rand -base64 48` (≥ 32 chars; the app refuses to start without it) |
| `CMS_URL` | `https://editor.example.com` |
| `WEB_URL` | `https://www.example.com` |
| `PUBLICATION_NAME` | Your brand |
| `REVALIDATE_SECRET` | random string, **same value in news-web** |
| `CRON_SECRET` | random string (Vercel Cron sends it automatically) |
| `RESEND_API_KEY`, `EMAIL_FROM` | for password-reset emails (verify the sending domain in Resend) |
| `PAYMENT_DEFAULT_PROVIDER` | `razorpay` or `stripe` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | if using Razorpay |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | if using Stripe |

- **Scheduled publishing** uses Vercel Cron every 5 minutes (`/api/cron/publish-scheduled`). Vercel **Hobby** only allows once-daily cron and will reject this schedule at deploy time — use **Pro**, or change the schedule and call the endpoint from an external scheduler with `Authorization: Bearer $CRON_SECRET`.
- After the first deploy, open `https://editor.example.com/admin` and create the first account — it becomes `super_admin`. Create the other staff accounts from **Staff users**.

## 4. Website project (`news-web`)

- Root directory: `apps/web`. Domain: `www.example.com`.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://www.example.com` |
| `NEXT_PUBLIC_PUBLICATION_NAME` | Your brand (must match how it appears in Google News) |
| `CMS_URL` | `https://editor.example.com` |
| `REVALIDATE_SECRET` | same as the CMS |
| `NEXT_PUBLIC_GAM_NETWORK_CODE` | Ad Manager network code (empty = ads off) |
| `NEXT_PUBLIC_GAM_UNIT_PREFIX` | e.g. `news` → ad units `/<network>/news/top`, `/in_article`, `/rail`, `/footer` |
| `NEXT_PUBLIC_CMP_MODE` | `builtin` (India-first banner) or `external` (Google-certified TCF CMP — required for EEA/UK/Swiss readers) |
| `ADS_TXT` | lines from Ad Manager, separated by `\n` |

Add `public/logo.png` (used in NewsArticle structured data).

`robots.txt` blocks all crawling on Preview deployments automatically (`VERCEL_ENV !== production`).

## 5. Payment providers

**Razorpay** (UPI, cards, netbanking)
1. Create a Plan per subscription plan (Dashboard → Subscriptions → Plans). Copy each `plan_…` ID into the matching **Plans** entry in the CMS.
2. Webhook: `https://editor.example.com/api/billing/webhooks/razorpay`, with a secret → `RAZORPAY_WEBHOOK_SECRET`. Events: all `subscription.*`.
3. Checkout uses Razorpay's hosted subscription link. After paying, the reader returns to the site manually; access activates when the webhook arrives.

**Stripe** (international cards)
1. Create a recurring Price per plan; copy each `price_…` ID into the CMS Plan.
2. Webhook endpoint: `https://editor.example.com/api/billing/webhooks/stripe`. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
3. The integration pins Stripe API version `2025-03-31.basil` on its own requests and always re-fetches the subscription, so the webhook endpoint's API version doesn't matter.

Test both in sandbox/test mode on Preview first. Keep the price shown in the CMS Plan (`priceMinor`) in sync with the provider — the provider amount is what's charged.

## 6. Launch gates

- [ ] Secrets set per environment; Preview uses a Neon branch and provider test keys
- [ ] First super admin created; staff accounts and section assignments reviewed
- [ ] Publish, schedule, unpublish (with reason), correction and slug-change tested on staging
- [ ] Payment sandbox: subscribe, renew, failed payment, cancel — for each enabled provider
- [ ] Privacy policy, terms, editorial policy and corrections pages published (the `/privacy` page is a placeholder)
- [ ] Ad Manager: ad units created, `ADS_TXT` set, consent mode decided (`external` CMP if serving EEA/UK)
- [ ] CSP: review `Content-Security-Policy-Report-Only` violations on staging, then enforce (see `apps/web/next.config.ts`)
- [ ] Search Console + Google News Publisher Center: submit `/sitemap.xml` and `/news-sitemap.xml`
- [ ] Load test homepage and article routes; confirm cache hit ratio in Vercel analytics
- [ ] Neon restore drill done; uptime check on `https://editor.example.com/api/health`
- [ ] Error monitoring/alerting connected (e.g. Sentry, Vercel Log Drains)
