import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim().toLowerCase()

    if (!email.endsWith('@gmail.com')) {
      return NextResponse.json({
        error: 'Security requirement: Only genuine @gmail.com addresses are permitted for member registration and backlink profiles.'
      }, { status: 400 })
    }

    const res = await fetch(`${SCRAPER_API_URL}/api/v1/auth/gmail/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store'
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to request OTP' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
