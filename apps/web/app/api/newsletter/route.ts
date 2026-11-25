import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(async () => {
      const form = await req.formData().catch(() => null)
      return { email: form?.get('email')?.toString() || '' }
    })

    const email = (body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const res = await fetch(`${SCRAPER_API_URL}/api/v1/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'website' }),
      cache: 'no-store'
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Failed to subscribe' }, { status: res.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! You will receive our morning news digest.',
      email
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
