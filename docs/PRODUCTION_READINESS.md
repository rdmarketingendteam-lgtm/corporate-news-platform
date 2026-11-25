# Production readiness

Status as of 31 Oct 2026. Stack: Payload 3.82.1, Next.js 16.4.3, React 19.3.1, Node 22, PostgreSQL 16.

## Verified

Run locally against PostgreSQL 16 with production builds of both apps:

- `pnpm -r typecheck` — clean.
- CMS: 36 unit tests + 39 integration tests (real Payload + Postgres, schema created from the committed migration).
- Website: 17 unit tests (renderer, URL safety, feeds).
- Production builds of both apps succeed; both were run with `next start` and smoke-tested over HTTP and in a real browser (Playwright): consent banner, registration, paywall locked for non-subscribers, unlocked for an entitled reader, cross-origin form POST rejected, publish in CMS → website updated immediately, no horizontal overflow at 390 px.

### Bugs found and fixed during verification

| Issue | Impact | Fix |
| --- | --- | --- |
| Starter's CMS admin layout, import map and `@payload-config` alias were missing; Next 15.2.4 is outside Payload's supported range and has published security advisories | CMS could not build | Rebuilt on Payload's official template structure; upgraded Next/React |
| Payload's draft `_status` and the editorial `status` field both mapped to Postgres enum `enum_articles_status` | "approved", "archived" etc. could not be saved | Editorial status uses its own enum (`enum_articles_workflow_status`) |
| `?select[body]=true` returned subscriber-only bodies to anyone | **Paywall bypass** | Field access now fails closed; regression tests added (verified they fail on the old code) |
| Next's server minification renamed Payload's error classes | Every validation/permission message became "An unknown error occurred" in production | `experimental.serverMinification: false` for the CMS |
| Paywall server-rendered "Checking your subscription…" | Crawlers/no-JS readers saw no subscribe prompt | SSR renders the prompt; signed-in browsers then check |

## Needs a decision or external setup before launch

| Item | Why it isn't done in code |
| --- | --- |
| **MFA for staff** | Payload 3 has no built-in MFA. Options: SSO through your identity provider in front of `editor.` (e.g. Cloudflare Access / Vercel Password Protection on the CMS domain), or a TOTP plugin. Recommended before launch. |
| **Legal pages** | `/privacy` is a placeholder; terms, editorial policy, corrections policy, contact pages need your approved text. |
| **EEA/UK consent** | The built-in banner suits India-first traffic. Serving personalised ads to EEA/UK/Swiss readers requires a Google-certified TCF CMP (`NEXT_PUBLIC_CMP_MODE=external`). |
| **CSP enforcement** | Shipped report-only because Ad Manager's domains vary; enforce after reviewing reports on staging. |
| **Provider sandbox runs** | Stripe/Razorpay logic is tested with mocked HTTP and real signature checks; run the full flow in each provider's test mode on staging (see deployment.md §5). The Razorpay hosted link does not auto-redirect back to the site. |
| **Vercel plan** | 5-minute scheduled publishing needs Vercel Pro (Hobby allows daily cron only). |
| **Rate limiting** | Login lockouts are built in (staff 5 attempts / 15 min; readers 10 / 10 min). Add Vercel WAF rate-limit rules for `/api/auth/*`, `/api/readers`, `/api/search`. |
| **Monitoring** | Hook up error tracking and an uptime check on `/api/health`. |

## Known limitations / next improvements

- Section, topic and author listings use `?page=` and render per request (data is still cached). Moving to path-based pagination (`/category/india/page/2`) would make them fully static.
- Main sitemap covers the latest 5,000 stories; split with `generateSitemaps()` as the archive grows.
- Live blogs, video archive, newsletters and the analytics dashboard from the blueprint are not built.
- Entitlement freshness: the reader's ad-free/subscriber UI flags refresh on login, account page actions and when opening a subscriber story; access itself is always decided by the CMS on each request.
- Editor preview of unpublished stories on the website is not implemented (editors review in the CMS).
