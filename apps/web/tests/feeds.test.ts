import { describe, expect, it } from 'vitest'

import { buildNewsSitemap, buildRss, escapeXml } from '../lib/feeds'

describe('feeds', () => {
  it('escapes XML special and illegal characters', () => {
    expect(escapeXml(`a & b < c > "d" 'e'\u0001`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;')
  })

  it('builds valid RSS with self link and RFC-822 dates', () => {
    const xml = buildRss({
      title: 'Brief',
      siteUrl: 'https://news.test',
      feedUrl: 'https://news.test/feed.xml',
      description: 'd',
      language: 'en',
      items: [{ title: 'Rates & bonds', url: 'https://news.test/news/a', publishedAt: '2026-10-30T10:00:00Z', author: 'Asha', category: 'Business' }],
    })
    expect(xml).toContain('<title>Rates &amp; bonds</title>')
    expect(xml).toContain('<pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate>')
    expect(xml).toContain('rel="self"')
    expect(xml).toContain('<dc:creator>Asha</dc:creator>')
  })

  it('news sitemap keeps only the last 48 hours and caps at 1,000', () => {
    const now = new Date('2026-10-31T12:00:00Z')
    const items = [
      { url: 'https://n/a', title: 'fresh', publishedAt: '2026-10-31T08:00:00Z' },
      { url: 'https://n/b', title: 'old', publishedAt: '2026-10-28T08:00:00Z' },
      ...Array.from({ length: 1200 }, (_, i) => ({ url: `https://n/${i}`, title: `t${i}`, publishedAt: '2026-10-31T09:00:00Z' })),
    ]
    const xml = buildNewsSitemap({ publicationName: 'Brief', language: 'en', items, now })
    expect(xml).toContain('<news:title>fresh</news:title>')
    expect(xml).not.toContain('<news:title>old</news:title>')
    expect(xml.match(/<news:news>/g)).toHaveLength(1000)
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
    expect(xml).toContain('<news:publication_date>2026-10-31T08:00:00.000Z</news:publication_date>')
  })
})
