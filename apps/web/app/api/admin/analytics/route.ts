import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/analytics/stats`, {
      cache: 'no-store'
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
