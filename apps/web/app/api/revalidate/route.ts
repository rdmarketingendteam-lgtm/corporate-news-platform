import { timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'

const authorized = (req: NextRequest) => {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) return false
  const given = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200).slice(0, max) : []

/** Called by the CMS after publish/update/unpublish. Expires cached data immediately (CDN included on Vercel). */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown; paths?: unknown }
  const tags = strings(body.tags, 50)
  const paths = strings(body.paths, 50).filter((p) => p.startsWith('/'))
  for (const tag of tags) revalidateTag(tag, { expire: 0 })
  for (const path of paths) revalidatePath(path)
  // listings that aggregate many stories
  if (tags.includes('articles')) {
    revalidatePath('/feed.xml')
    revalidatePath('/news-sitemap.xml')
  }
  return Response.json({ revalidated: { tags, paths } })
}
