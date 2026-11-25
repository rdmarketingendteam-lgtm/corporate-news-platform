import { sql } from '@payloadcms/db-postgres'
import type { Endpoint } from 'payload'

/** GET /api/health — uptime check that also verifies the database connection. */
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    try {
      await (req.payload.db as any).drizzle.execute(sql`select 1`)
      return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
    } catch {
      return Response.json({ ok: false }, { status: 503, headers: { 'cache-control': 'no-store' } })
    }
  },
}
