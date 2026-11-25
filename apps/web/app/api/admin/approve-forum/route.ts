import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../lib/cms'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 })
    }

    const res = await fetch(`${SCRAPER_API_URL}/api/v1/admin/approve-forum-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
