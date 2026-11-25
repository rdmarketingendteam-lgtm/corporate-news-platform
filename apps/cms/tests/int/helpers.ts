import pg from 'pg'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import { lexicalFromParagraphs } from '../../src/lib/lexical'

/** Wipe the test database and boot Payload against it using the committed migrations. */
export async function bootPayload(): Promise<Payload> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  await client.end()

  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  await payload.db.migrate()
  return payload
}

export const body = (...paragraphs: string[]) => lexicalFromParagraphs(paragraphs)

/** Local API options that act as a given user with access control enforced. */
export const as = (user: any) => ({ user, overrideAccess: false as const })

/** Build a request object for calling custom endpoint handlers directly. */
export async function endpointReq(
  payload: Payload,
  opts: { url: string; method?: string; user?: any; body?: string; headers?: Record<string, string>; routeParams?: Record<string, string> },
): Promise<PayloadRequest> {
  const req = await createLocalReq({ user: opts.user }, payload)
  const r = req as any
  r.url = opts.url
  r.method = opts.method ?? 'GET'
  r.headers = new Headers({ 'content-type': 'application/json', ...(opts.headers ?? {}) })
  r.routeParams = opts.routeParams ?? {}
  r.text = async () => opts.body ?? ''
  r.json = async () => JSON.parse(opts.body ?? '{}')
  if (opts.body && (opts.headers?.['content-type'] ?? 'application/json') === 'application/json') {
    r.data = JSON.parse(opts.body)
  }
  return req
}

export async function expectReject(promise: Promise<unknown>, pattern?: RegExp) {
  let error: unknown
  try {
    await promise
  } catch (err) {
    error = err
  }
  if (!error) throw new Error('Expected the operation to be rejected, but it succeeded')
  if (pattern) {
    const text = `${(error as Error).message} ${JSON.stringify((error as any).data ?? '')}`
    if (!pattern.test(text)) throw new Error(`Rejected with unexpected error: ${text}`)
  }
  return error
}
