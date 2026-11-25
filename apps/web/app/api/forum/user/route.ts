import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email') || ''
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/forum/user?email=${encodeURIComponent(email)}`, {
      cache: 'no-store'
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
