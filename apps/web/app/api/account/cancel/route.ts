import type { NextRequest } from 'next/server'

import { CMS_URL } from '../../../../lib/cms'
import { back, field } from '../../../../lib/forms'
import { TOKEN_COOKIE, getReader, isSameOrigin, setSession } from '../../../../lib/session'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const token = req.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return back(req, '/account')
  const form = await req.formData()
  const res = await fetch(new URL('/api/billing/cancel', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `JWT ${token}` },
    body: JSON.stringify({ subscription: field(form, 'subscription', 64) }),
    cache: 'no-store',
  }).catch(() => null)
  const data = (await res?.json().catch(() => ({}))) as { error?: string }
  const response = back(req, '/account', res?.ok ? { notice: 'Your subscription will end at the close of the current billing period.' } : { error: data.error ?? 'Could not cancel.' })
  if (res?.ok) setSession(response, token, undefined, await getReader(token))
  return response
}
