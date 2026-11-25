import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/forum/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Forum submission failed' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
