import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'

/** Shared with the migration that creates the GIN index — keep identical so Postgres uses the index. */
export const SEARCH_VECTOR_SQL = `(setweight(to_tsvector('english', coalesce("headline", '')), 'A') || setweight(to_tsvector('english', coalesce("dek", '')), 'B') || setweight(to_tsvector('english', coalesce("search_text", '')), 'C'))`

const MAX_QUERY = 200
const MAX_LIMIT = 20

/**
 * GET /api/search?q=&page=&limit=
 * Postgres full-text search over published articles, ranked by relevance then recency.
 * Only ids come from SQL; documents are then loaded through Payload with public access rules.
 */
export const searchEndpoint: Endpoint = {
  path: '/search',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const params = new URL(req.url ?? 'http://x').searchParams
    const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY)
    const limit = Math.min(Math.max(Number(params.get('limit')) || 10, 1), MAX_LIMIT)
    const page = Math.min(Math.max(Number(params.get('page')) || 1, 1), 50)
    const headers = { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' }

    if (q.length < 2) return Response.json({ docs: [], totalDocs: 0, page, limit, q }, { headers })

    const db = (req.payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
    const vector = sql.raw(SEARCH_VECTOR_SQL)
    const where = sql`"status" = 'published' AND "_status" = 'published' AND ${vector} @@ websearch_to_tsquery('english', ${q})`

    const [{ rows }, countResult] = await Promise.all([
      db.execute(sql`
        SELECT "id" FROM "articles"
        WHERE ${where}
        ORDER BY ts_rank_cd(${vector}, websearch_to_tsquery('english', ${q})) DESC, "published_at" DESC NULLS LAST
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
      db.execute(sql`SELECT count(*)::int AS "count" FROM "articles" WHERE ${where}`),
    ])
    const ids = rows.map((r) => r.id)
    const totalDocs = Number(countResult.rows[0]?.count ?? 0)
    if (!ids.length) return Response.json({ docs: [], totalDocs, page, limit, q }, { headers })

    const { docs } = await req.payload.find({
      collection: 'articles',
      where: { id: { in: ids } },
      limit: ids.length,
      depth: 1,
      overrideAccess: false, // no user → public read rules apply
      select: { headline: true, slug: true, dek: true, publishedAt: true, category: true, author: true, featuredMedia: true, accessLevel: true, isSponsored: true },
    })
    const order = new Map(ids.map((id, i) => [String(id), i]))
    docs.sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0))
    return Response.json({ docs, totalDocs, page, limit, q }, { headers })
  },
}
