import { getArticlesSince } from '../../lib/cms'
import { buildNewsSitemap } from '../../lib/feeds'
import { absoluteUrl, site } from '../../lib/site'

export const revalidate = 300

export async function GET() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const articles = await getArticlesSince(since, 1000)
  const xml = buildNewsSitemap({
    publicationName: site.name,
    language: site.language,
    // Sponsored and no-index stories are kept out of Google News.
    items: articles
      .filter((a) => a.publishedAt && !a.isSponsored && !(a as { seo?: { noIndex?: boolean | null } }).seo?.noIndex)
      .map((a) => ({ url: absoluteUrl(`/news/${a.slug}`), title: a.headline, publishedAt: a.publishedAt! })),
  })
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
