import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = body.username || body.identifier || body.email || ''
    const password = body.password || ''

    const res = await fetch(`${SCRAPER_API_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, identifier: username, password }),
      cache: 'no-store'
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
