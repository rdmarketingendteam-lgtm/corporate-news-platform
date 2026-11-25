import type { Payload } from 'payload'

/**
 * Tell the public website to purge cached pages. The web app exposes
 * POST /api/revalidate, protected by REVALIDATE_SECRET, which calls Next.js
 * revalidateTag()/revalidatePath() — on Vercel this purges the CDN/ISR cache.
 */
export async function revalidateWeb(
  payload: Payload,
  input: { tags?: string[]; paths?: string[] },
): Promise<void> {
  const base = process.env.WEB_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!base || !secret) {
    payload.logger.warn('revalidateWeb skipped: WEB_URL or REVALIDATE_SECRET not set')
    return
  }
  const tags = [...new Set(input.tags ?? [])]
  const paths = [...new Set(input.paths ?? [])]
  if (!tags.length && !paths.length) return

  try {
    const res = await fetch(new URL('/api/revalidate', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tags, paths }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) payload.logger.error(`revalidateWeb failed: HTTP ${res.status}`)
  } catch (err) {
    // Never fail an editorial save because the website is unreachable; cache TTLs are the fallback.
    payload.logger.error({ err }, 'revalidateWeb request failed')
  }
}

/** Cache tags used by the web app (keep in sync with apps/web/lib/cms.ts). */
export const cacheTags = {
  articles: 'articles',
  article: (slug: string) => `article:${slug}`,
  category: (slug: string) => `category:${slug}`,
  author: (slug: string) => `author:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  taxonomy: 'taxonomy',
  plans: 'plans',
}
