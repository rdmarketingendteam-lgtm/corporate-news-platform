import { timingSafeEqual } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

const authorized = (req: PayloadRequest): boolean => {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get('authorization') ?? ''
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** Publish every article whose status is "scheduled" and whose publish time has passed. */
export async function publishDueArticles(req: PayloadRequest, now = new Date()) {
  const { docs } = await req.payload.find({
    collection: 'articles',
    draft: true, // scheduled state lives on the latest draft version
    where: { and: [{ status: { equals: 'scheduled' } }, { publishedAt: { less_than_equal: now.toISOString() } }] },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const published: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const doc of docs) {
    try {
      await req.payload.update({
        collection: 'articles',
        id: doc.id,
        draft: false,
        data: { status: 'published', _status: 'published' },
        overrideAccess: true,
        // no req/user: runs as trusted system actor through the workflow hook
        context: { actorLabel: 'scheduler' },
      })
      published.push(String(doc.id))
    } catch (err) {
      failed.push({ id: String(doc.id), error: err instanceof Error ? err.message : String(err) })
      req.payload.logger.error({ err, id: doc.id }, 'scheduled publish failed')
    }
  }
  return { published, failed }
}

/**
 * GET /api/cron/publish-scheduled — called by Vercel Cron (Authorization: Bearer $CRON_SECRET).
 */
export const publishScheduledEndpoint: Endpoint = {
  path: '/cron/publish-scheduled',
  method: 'get',
  handler: async (req) => {
    if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await publishDueArticles(req)
    return Response.json(result, { status: result.failed.length ? 500 : 200 })
  },
}
