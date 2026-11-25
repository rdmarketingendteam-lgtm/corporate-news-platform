import { getCategory, getLatestArticles, tags } from '../../../../lib/cms'
import { buildRss } from '../../../../lib/feeds'
import { absoluteUrl, site } from '../../../../lib/site'

export const revalidate = 300

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) return new Response('Not found', { status: 404 })
  const { docs } = await getLatestArticles({ categoryId: category.id, limit: 50, cacheTags: [tags.category(slug)] })
  const xml = buildRss({
    title: `${site.name} — ${category.name}`,
    siteUrl: absoluteUrl(`/category/${slug}`),
    feedUrl: absoluteUrl(`/category/${slug}/feed.xml`),
    description: category.description ?? `${category.name} from ${site.name}`,
    language: site.language,
    items: docs.map((a) => ({ title: a.headline, url: absoluteUrl(`/news/${a.slug}`), description: a.dek, publishedAt: a.publishedAt, author: a.author?.displayName, category: category.name })),
  })
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
