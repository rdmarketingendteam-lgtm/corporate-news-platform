import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers.get('user-agent') || '',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
