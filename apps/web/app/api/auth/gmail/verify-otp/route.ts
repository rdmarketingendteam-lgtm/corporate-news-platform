import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../../lib/cms'
import { setSession } from '../../../../../lib/session'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim().toLowerCase()
    const otp = (body.otp || '').trim()

    if (!email.endsWith('@gmail.com')) {
      return NextResponse.json({ error: 'Only @gmail.com addresses permitted.' }, { status: 400 })
    }
    if (!otp) {
      return NextResponse.json({ error: 'Please enter the 6-digit OTP code.' }, { status: 400 })
    }

    const res = await fetch(`${SCRAPER_API_URL}/api/v1/auth/gmail/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
      cache: 'no-store'
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'OTP verification failed' }, { status: res.status })
    }

    const nextRes = NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      user: data.user,
      token: data.token
    })

    // Set cookie session
    const reader = {
      id: email,
      email,
      name: data.user?.display_name || email.split('@')[0],
      entitlement: { status: 'active', planCode: 'member', activeUntil: '2030-12-31' }
    }
    setSession(nextRes, data.token, undefined, reader)

    return nextRes
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
