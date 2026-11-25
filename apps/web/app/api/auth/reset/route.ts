import type { NextRequest } from 'next/server'

import { CMS_URL } from '../../../../lib/cms'
import { back, field } from '../../../../lib/forms'
import { isSameOrigin, setSession, type Reader } from '../../../../lib/session'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const form = await req.formData()
  const token = field(form, 'token', 500)
  const password = field(form, 'password', 200)
  if (password.length < 10) return back(req, '/reset-password', { token, error: 'Use at least 10 characters.' })
  const res = await fetch(new URL('/api/readers/reset-password', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
    cache: 'no-store',
  }).catch(() => null)
  if (!res?.ok) return back(req, '/reset-password', { error: 'This reset link is invalid or has expired.' })
  const data = (await res.json()) as { token?: string; user?: Reader }
  const response = back(req, '/account', { notice: 'Password updated.' })
  if (data.token) setSession(response, data.token, undefined, data.user ?? null)
  return response
}
