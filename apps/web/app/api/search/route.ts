import { NextResponse, type NextRequest } from 'next/server'
import { SCRAPER_API_URL } from '../../../lib/cms'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const q = searchParams.get('q') || ''
  const limit = searchParams.get('limit') || '5'

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json({ results: [], total: 0 })
  }

  try {
    const res = await fetch(
      `${SCRAPER_API_URL}/api/v1/articles?search=${encodeURIComponent(q)}&limit=${limit}`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) {
      return NextResponse.json({ results: [], total: 0 })
    }
    const data = await res.json()
    const results = (data.articles || []).map((a: any) => ({
      id: a.id || a.article_id,
      headline: (a.title || '').replace(/<[^>]+>/g, '').trim(),
      slug: a.slug || a.id || a.article_id,
      publishedAt: a.published_at || a.collected_at,
      source: 'Editorial Staff',
      category: a.category ? (a.category.charAt(0).toUpperCase() + a.category.slice(1)) : 'News',
      categorySlug: (a.category || 'news').toLowerCase(),
      image: a.image_url || a.top_image || null,
    }))

    return NextResponse.json({
      results,
      total: data.total || results.length
    })
  } catch {
    return NextResponse.json({ results: [], total: 0 })
  }
}
