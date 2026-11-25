import { getLatestArticles } from '../../lib/cms'
import { buildRss } from '../../lib/feeds'
import { absoluteUrl, site } from '../../lib/site'

export const revalidate = 300

export async function GET() {
  const { docs } = await getLatestArticles({ limit: 50 })
  const xml = buildRss({
    title: site.name,
    siteUrl: site.url,
    feedUrl: absoluteUrl('/feed.xml'),
    description: site.description,
    language: site.language,
    items: docs.map((a) => ({
      title: a.isSponsored ? `Sponsored: ${a.headline}` : a.headline,
      url: absoluteUrl(`/news/${a.slug}`),
      description: a.dek,
      publishedAt: a.publishedAt,
      author: a.author?.displayName,
      category: a.category?.name,
    })),
  })
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
