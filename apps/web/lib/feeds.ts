/** Pure XML builders for RSS and the Google News sitemap (unit-tested). */

export const escapeXml = (s: string) =>
  s
    // strip characters that are illegal in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export type FeedItem = {
  title: string
  url: string
  description?: string | null
  publishedAt?: string | null
  author?: string | null
  category?: string | null
}

export function buildRss(opts: { title: string; siteUrl: string; feedUrl: string; description: string; language: string; items: FeedItem[] }): string {
  const items = opts.items
    .map(
      (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.url)}</link>
      <guid isPermaLink="true">${escapeXml(i.url)}</guid>${i.publishedAt ? `\n      <pubDate>${new Date(i.publishedAt).toUTCString()}</pubDate>` : ''}${
        i.description ? `\n      <description>${escapeXml(i.description)}</description>` : ''
      }${i.author ? `\n      <dc:creator>${escapeXml(i.author)}</dc:creator>` : ''}${i.category ? `\n      <category>${escapeXml(i.category)}</category>` : ''}
    </item>`,
    )
    .join('\n')
  const latest = opts.items.find((i) => i.publishedAt)?.publishedAt
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${escapeXml(opts.siteUrl)}</link>
    <description>${escapeXml(opts.description)}</description>
    <language>${escapeXml(opts.language)}</language>
    <atom:link href="${escapeXml(opts.feedUrl)}" rel="self" type="application/rss+xml"/>${latest ? `\n    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ''}
${items}
  </channel>
</rss>
`
}

export type NewsSitemapItem = { url: string; title: string; publishedAt: string }

/** Google News sitemap: only articles from the last 48 hours, max 1,000 entries. */
export function buildNewsSitemap(opts: { publicationName: string; language: string; items: NewsSitemapItem[]; now?: Date }): string {
  const cutoff = (opts.now ?? new Date()).getTime() - 48 * 60 * 60 * 1000
  const items = opts.items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff).slice(0, 1000)
  const urls = items
    .map(
      (i) => `  <url>
    <loc>${escapeXml(i.url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(opts.publicationName)}</news:name>
        <news:language>${escapeXml(opts.language)}</news:language>
      </news:publication>
      <news:publication_date>${new Date(i.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(i.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`
}
