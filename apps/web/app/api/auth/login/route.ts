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
  if (!email || !password) return back(req, '/account', { error: 'Enter your email and password.', next })

  const res = await fetch(new URL('/api/readers/login', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  }).catch(() => null)
  if (!res?.ok) {
    const locked = res?.status === 401 && (await res.text()).includes('locked')
    return back(req, '/account', { error: locked ? 'Too many attempts. Try again in a few minutes.' : 'Email or password is incorrect.', next })
  }
  const data = (await res.json()) as { token: string; exp?: number; user: Reader }
  const response = back(req, next)
  setSession(response, data.token, data.exp, data.user)
  return response
}
