import type { NextRequest } from 'next/server'

import { CMS_URL } from '../../../../lib/cms'
import { back, field } from '../../../../lib/forms'
import { isSameOrigin } from '../../../../lib/session'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new Response('Forbidden', { status: 403 })
  const form = await req.formData()
  const email = field(form, 'email', 254)
  if (email) {
    await fetch(new URL('/api/readers/forgot-password', CMS_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    }).catch(() => null)
  }
  // Same response whether or not the address exists.
  return back(req, '/forgot-password', { sent: '1' })
}
