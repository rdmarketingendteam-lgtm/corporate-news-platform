import type { NextRequest } from 'next/server'

import { CMS_URL } from '../../../../lib/cms'
import { back, field } from '../../../../lib/forms'
import { isSameOrigin, safeNext, setSession, type Reader } from '../../../../lib/session'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const form = await req.formData()
  const next = safeNext(form.get('next'))
  const email = field(form, 'email', 254)
  const password = field(form, 'password', 200)
  const name = field(form, 'name', 120)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back(req, '/account', { error: 'Enter a valid email address.', next, mode: 'register' })
  if (password.length < 10) return back(req, '/account', { error: 'Use at least 10 characters for your password.', next, mode: 'register' })

  const created = await fetch(new URL('/api/readers', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name, newsletterOptIn: form.get('newsletter') === 'on' }),
    cache: 'no-store',
  }).catch(() => null)
  if (!created?.ok) {
    // Don't reveal whether an address is registered.
    return back(req, '/account', { error: 'We could not create that account. If you already have one, sign in instead.', next, mode: 'register' })
  }

  const login = await fetch(new URL('/api/readers/login', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  if (!login.ok) return back(req, '/account', { notice: 'Account created. Please sign in.', next })
  const data = (await login.json()) as { token: string; exp?: number; user: Reader }
  const response = back(req, next)
  setSession(response, data.token, data.exp, data.user)
  return response
}
