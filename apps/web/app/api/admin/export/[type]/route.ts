import { type NextRequest, NextResponse } from 'next/server'
import { SCRAPER_API_URL } from '../../../../../lib/cms'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params
    const format = req.nextUrl.searchParams.get('format') || 'json'

    const targetUrl = `${SCRAPER_API_URL}/api/v1/admin/export/${type}?format=${format}`
    const res = await fetch(targetUrl, {
      headers: {
        'x-api-key': 'scraper-internal-api-key',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch export data' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || (format === 'csv' ? 'text/csv' : 'application/json')
    const contentDisposition = res.headers.get('content-disposition') || `attachment; filename=newspaper_${type}.${format}`

    const body = await res.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
