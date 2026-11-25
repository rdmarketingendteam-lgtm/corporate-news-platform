import type { MetadataRoute } from 'next'

import { getArticlesSince, getAuthors, getCategories } from '../lib/cms'
import { absoluteUrl } from '../lib/site'

export const revalidate = 3600

/**
 * Main sitemap: sections, authors and the most recent 5,000 stories.
 * For a larger archive, switch to generateSitemaps() and split by year/month.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, authors, articles] = await Promise.all([getCategories(), getAuthors(), getArticlesSince(null, 5000)])
  return [
    { url: absoluteUrl('/'), changeFrequency: 'always', priority: 1 },
    ...categories.map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...authors.map((a) => ({ url: absoluteUrl(`/author/${a.slug}`), changeFrequency: 'daily' as const, priority: 0.4 })),
    ...articles
      .filter((a) => !(a as { seo?: { noIndex?: boolean | null } }).seo?.noIndex)
      .map((a) => ({ url: absoluteUrl(`/news/${a.slug}`), lastModified: a.lastUpdatedAt ?? a.publishedAt ?? undefined, priority: 0.6 })),
  ]
}
