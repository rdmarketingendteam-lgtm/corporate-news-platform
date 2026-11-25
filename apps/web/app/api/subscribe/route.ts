import type { NextRequest } from 'next/server'

import { CMS_URL } from '../../../lib/cms'
import { back, field } from '../../../lib/forms'
import { TOKEN_COOKIE, isSameOrigin } from '../../../lib/session'

/** Starts provider-hosted checkout (Stripe Checkout or Razorpay subscription link). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const form = await req.formData()
  const plan = field(form, 'plan', 80)
  const provider = field(form, 'provider', 20) || undefined
  const token = req.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return back(req, '/account', { next: '/subscribe', notice: 'Create an account or sign in to subscribe.' })

  const res = await fetch(new URL('/api/billing/checkout', CMS_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `JWT ${token}` },
    body: JSON.stringify({ plan, provider }),
    cache: 'no-store',
  }).catch(() => null)
  const data = (await res?.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res?.ok || !data.url) return back(req, '/subscribe', { error: data.error ?? 'Checkout is unavailable right now.' })

  const target = new URL(data.url)
  if (target.protocol !== 'https:' && process.env.NODE_ENV === 'production') return back(req, '/subscribe', { error: 'Checkout is unavailable right now.' })
  return Response.redirect(target, 303)
}
