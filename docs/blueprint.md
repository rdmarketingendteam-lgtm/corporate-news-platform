# Product & Technical Blueprint

## Product goals
1. Publish accurate, timely English-language news for India and international readers.
2. Enable newsroom roles, editorial review, scheduled publication, correction history, and live coverage.
3. Support display advertising and paid subscriptions.
4. Preserve SEO, uptime, and content integrity during traffic spikes.

## User-facing routes
- `/` — homepage: breaking banner, lead story, latest feed, category rails, trending, video, newsletter.
- `/news/[slug]` — article detail, author, timestamps, share, related stories, ad slots, subscription prompts.
- `/category/[slug]` — category landing and pagination.
- `/topic/[slug]` — topic archive.
- `/author/[slug]` — reporter profile and authored articles.
- `/search?q=` — search results.
- `/live/[slug]` — live blog timeline.
- `/videos` — video archive.
- `/subscribe` — plans and hosted payment checkout.
- `/account` — subscription status, preferences, saved stories.
- `/about`, `/contact`, `/editorial-policy`, `/corrections`, `/privacy`, `/terms`.

## CMS routes / capabilities
- Login, MFA for privileged accounts, user management, role assignment.
- Article editor with autosave, preview, media, tags, SEO fields, publish scheduling.
- Editorial queues: Draft → Submitted → In Review → Approved → Scheduled/Published.
- Editor feedback and revision history.
- Live event creation, update authoring, pinning, closing.
- Advertising placement and campaign metadata.
- Subscription plan configuration and entitlement management.
- Audit log, analytics dashboard, content export.

## Roles
- `super_admin`: full access, security and configuration.
- `editor_in_chief`: editorial approval and publishing.
- `section_editor`: approve/publish assigned sections.
- `journalist`: create and edit own drafts; submit for review.
- `copy_editor`: edit copy and metadata; submit for approval.
- `seo_manager`: SEO fields and structured metadata.
- `ad_manager`: ad campaign and placement management.
- `analyst`: read-only analytics.

Enforce permissions on the server/CMS, not merely by hiding UI elements.

## Editorial workflow
1. Journalist creates draft; autosave stores draft.
2. Journalist submits; content enters review queue.
3. Editor checks sourcing, accuracy, legal risk, headline, images, and attribution.
4. Copy/SEO review completes; editor approves.
5. Editor publishes now or schedules a publication time.
6. Publication invalidates CDN/cache and updates sitemap/RSS.
7. Material corrections create a visible correction note and retain revision history.
8. Unpublish requires a reason and is recorded in audit log.

## Monetization
### Advertising
- Define placements: top leaderboard, in-article, rail, footer, video.
- Use ad provider tags in controlled components; reserve layout space to reduce CLS.
- Label sponsored content clearly and store sponsor/disclosure metadata.
- Apply consent management where required; honor user privacy choices.
- Never allow ad scripts in article body HTML without sanitization and review.

### Subscription
- Free and paid entitlements; optional metered/paywall rules.
- Subscription checkout hosted by a payment provider.
- Verify webhook signatures server-side; idempotently update subscription state.
- Store provider customer/subscription IDs, status, plan, dates; never store card data.
- Entitlement check runs server-side. Provide cancellation and renewal notices.

## Search, SEO, and distribution
- Server-render article pages.
- Canonical URLs, Open Graph, article metadata, NewsArticle JSON-LD.
- Main sitemap plus a news sitemap containing recent eligible articles.
- RSS feed, robots.txt, breadcrumbs, author pages, internal links.
- Keep stable slugs; redirect changed slugs with a 301.
- Avoid indexing search/filter query URLs.
- Use Search Console and analytics with consent controls as applicable.

## Performance and scale
- CDN-cache published pages and media.
- Revalidate cache on publish/update; keep stale content available during origin incidents.
- Use optimized image variants and modern formats.
- Cache category/trending queries; paginate feeds.
- Add queue workers for email, sitemap generation, analytics aggregation, and media processing.
- Load test homepage/article pages and publishing invalidation.
- Configure database pooling and query indexes.

## Security
- MFA for admin/editor roles.
- Server-side RBAC and least privilege.
- Secure, HTTP-only, SameSite cookies; CSRF protection for state-changing operations.
- Rate limit login, search, and public write endpoints.
- Validate and sanitize rich content; restrict upload types and size.
- Secrets in managed secret store; rotate on staff departure or incident.
- Audit publication, user, ad, and subscription changes.
- Automated encrypted backups and restore drills.
- CSP, HSTS, secure headers, dependency scanning, SAST, and incident playbook.

## Release stages
1. Local development and seeded demo content.
2. Staging environment with production-like settings.
3. Editorial acceptance tests and payment sandbox.
4. SEO migration and redirect validation.
5. Load/security testing.
6. Limited soft launch, then production launch.
7. Monitor error rate, latency, publishing failures, subscription webhooks, and traffic.
