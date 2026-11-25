import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') || ''
    const url = `${SCRAPER_API_URL}/api/v1/backlinks/public${category ? `?category=${encodeURIComponent(category)}` : ''}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, backlinks: [] }, { status: 500 })
  }
}
