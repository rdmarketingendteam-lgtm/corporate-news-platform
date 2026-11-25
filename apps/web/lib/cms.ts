import 'server-only'

import type { LexicalNode, LexicalState } from './lexical/types'

/** Server-side only: the CMS base URL is never exposed to the browser. */
export const CMS_URL = process.env.CMS_URL
export const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://127.0.0.1:8000'
/** Only attempt CMS calls if an external CMS URL is explicitly configured (not local 3001 default) */
export const HAS_CMS = Boolean(CMS_URL && CMS_URL !== 'http://localhost:3001' && CMS_URL.startsWith('http') && !CMS_URL.includes('localhost') && !CMS_URL.includes('192.168.'))

/** Cache tags — keep in sync with apps/cms/src/lib/revalidate.ts */
export const tags = {
  articles: 'articles',
  article: (slug: string) => `article:${slug}`,
  category: (slug: string) => `category:${slug}`,
  author: (slug: string) => `author:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  taxonomy: 'taxonomy',
  plans: 'plans',
}

// ---------- types (subset of the CMS schema the site uses) ----------

export type Media = {
  id: number | string
  url?: string | null
  alt?: string | null
  caption?: string | null
  credit?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null } | undefined> | null
}

export type Category = { id: number | string; name: string; slug: string; description?: string | null; showInNav?: boolean }
export type Tag = { id: number | string; name: string; slug: string; description?: string | null }
export type Author = {
  id: number | string
  displayName: string
  slug: string
  jobTitle?: string | null
  bio?: string | null
  avatar?: Media | null
  xHandle?: string | null
}

export type ArticleCard = {
  id: number | string
  headline: string
  slug: string
  dek?: string | null
  publishedAt?: string | null
  lastUpdatedAt?: string | null
  isBreaking?: boolean | null
  isSponsored?: boolean | null
  sponsorName?: string | null
  accessLevel?: 'free' | 'subscribers' | null
  category?: Category | null
  author?: Author | null
  featuredMedia?: Media | null
  source?: string | null
  sourceUrl?: string | null
}

export type Article = ArticleCard & {
  body?: LexicalState
  preview?: LexicalState
  tags?: Tag[] | null
  wordCount?: number | null
  updatedAt?: string
  corrections?: { id?: string; issuedAt: string; note: string }[] | null
  seo?: { title?: string | null; description?: string | null; canonicalUrl?: string | null; noIndex?: boolean | null } | null
}

export type Plan = {
  id: number | string
  name: string
  code: string
  description?: string | null
  features?: { text: string }[] | null
  priceMinor: number
  currency: string
  interval: 'month' | 'year'
  adFree?: boolean | null
}

type Paginated<T> = { docs: T[]; totalDocs: number; totalPages: number; page: number; hasNextPage: boolean; hasPrevPage: boolean }

const CARD_SELECT = [
  'headline',
  'slug',
  'dek',
  'publishedAt',
  'lastUpdatedAt',
  'isBreaking',
  'isSponsored',
  'sponsorName',
  'accessLevel',
  'category',
  'author',
  'featuredMedia',
]

// ---------- helper converters ----------

function healBrokenLines(text: string): string {
  // Join split quotes: e.g. on '\n\nRamayana\n\n',
  let res = text.replace(/'\s*\n+\s*([^'\n]+)\s*\n+\s*'\s*,/g, "'$1',")
                .replace(/"\s*\n+\s*([^"\n]+)\s*\n+\s*"\s*,/g, '"$1",')
  // Join lines where next line starts with a comma, period, or closing quote
  res = res.replace(/\n+\s*([,\.\?!;:\'\"\)\]\}])/g, '$1')
  // Join lines where line ends without terminal punctuation and next line starts with lowercase
  res = res.replace(/([^\.\!\?\:\n])\n+\s*([a-z])/g, '$1 $2')
  // Join line ending with common prepositions/conjunctions
  res = res.replace(/\b(in|on|at|by|with|for|to|from|as|and|or|but|the|a|an|is|are|was|were|has|have|had)\s*\n+\s*/gi, '$1 ')
  // Join lines ending with titles/roles before names
  res = res.replace(/\b(directed by|produced by|written by|stars|starring|actor|actress|minister|president|prime minister|chief minister)\s*\n+\s*/gi, '$1 ')
  // Normalize multiple spaces
  res = res.replace(/[ \t]+/g, ' ')
  return res.replace(/\n{3,}/g, '\n\n').trim()
}

export function textToLexical(text?: string | null): LexicalState {
  if (!text) return null

  // Normalize line endings and heal broken mid-sentence line breaks
  const rawCleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!rawCleaned) return null
  const cleaned = healBrokenLines(rawCleaned)
  if (!cleaned) return null

  // Split on newlines (single or multiple)
  const rawLines = cleaned.split(/\n+/).map(l => l.trim()).filter(Boolean)

  const paragraphs: string[] = []

  for (const line of rawLines) {
    // If the line is short or normal length, keep it as a paragraph
    if (line.length <= 320) {
      paragraphs.push(line)
      continue
    }

    // If the line is very long (scraped without newlines), split into natural 2-3 sentence chunks
    const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘])/)
    let currentChunk = ''
    let sentenceCount = 0

    for (const s of sentences) {
      if (!currentChunk) {
        currentChunk = s
        sentenceCount = 1
      } else if (currentChunk.length + s.length < 300 || sentenceCount < 2) {
        currentChunk += ' ' + s
        sentenceCount++
      } else {
        paragraphs.push(currentChunk)
        currentChunk = s
        sentenceCount = 1
      }
    }
    if (currentChunk) {
      paragraphs.push(currentChunk)
    }
  }

  const finalParagraphs = paragraphs.length > 0 ? paragraphs : [cleaned]

  const children: LexicalNode[] = finalParagraphs.map(rawP => {
    // Strip any leading orphaned punctuation like "', " or '", ' or orphaned commas
    let p = rawP.replace(/^['"’“”]*,\s*/, '').trim()
    if (p && p.charAt(0) >= 'a' && p.charAt(0) <= 'z') {
      p = p.charAt(0).toUpperCase() + p.slice(1)
    }
    // Check if line is a bullet item
    if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('• ')) {
      return {
        type: 'paragraph',
        format: '',
        children: [{ type: 'text', text: p.replace(/^[-*•]\s*/, '• ') }]
      }
    }
    // Check if line is an actual quoted dialogue or statement (never an orphaned fragment)
    const isQuote = (p.startsWith('“') || p.startsWith('"')) && (p.endsWith('”') || p.endsWith('"')) && p.length > 20
    if (isQuote && !p.startsWith('",') && !p.startsWith('”,') && !p.startsWith("',") && !p.startsWith('", ') && !p.startsWith("', ")) {
      return {
        type: 'quote',
        format: '',
        children: [{ type: 'text', text: p }]
      }
    }
    return {
      type: 'paragraph',
      format: '',
      children: [{ type: 'text', text: p }]
    }
  })

  return {
    root: {
      type: 'root',
      children
    }
  }
}

const KNOWN_PUBLISHERS_REGEX = /\b(the indian express|indian express|indianexpress|news18|news 18|times of india|the times of india|timesofindia|toi|ndtv|ndtv news|hindustan times|ht|the hindu|hindu|pti|press trust of india|ani|asian news international|reuters|afp|bloomberg|associated press|ap|bbc|cnn|editorial staff|news desk)\b/i

function sanitizeAuthor(rawAuthor?: string | null, rawSource?: string | null): string {
  if (!rawAuthor) return 'Editorial Staff'
  const clean = rawAuthor.trim()
  if (KNOWN_PUBLISHERS_REGEX.test(clean)) {
    return 'Editorial Staff'
  }
  if (rawSource && clean.toLowerCase().includes(rawSource.toLowerCase().trim())) {
    return 'Editorial Staff'
  }
  if (clean.includes('@') || clean.includes('http') || clean.length < 2) {
    return 'Editorial Staff'
  }
  return clean
}

function cleanHtmlText(text?: string | null): string {
  if (!text) return ''
  let t = text

  // 1. First pass: strip obvious image tags and raw HTML tags
  t = t.replace(/<img[^>]*>/gi, '')
  t = t.replace(/<[^>]+>/g, ' ')

  // 2. Decode HTML entities (both named and numeric)
  t = t.replace(/&quot;/g, '"')
       .replace(/&amp;/g, '&')
       .replace(/&apos;|&#39;/g, "'")
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&nbsp;|\u00a0/g, ' ')
       .replace(/&hellip;|&#8230;/g, '...')
       .replace(/&#8217;|&#8216;/g, "'")
       .replace(/&#8220;|&#8221;/g, '"')

  // 3. Second pass: strip any newly exposed HTML or image tags after entity decoding
  t = t.replace(/<img[^>]*>/gi, '')
  t = t.replace(/<[^>]+>/g, ' ')

  // 4. Strip any leaked external publisher image URLs or publisher domains
  t = t.replace(/https?:\/\/[^\s]*timesofindia[^\s]*/gi, '')
       .replace(/https?:\/\/[^\s]*indiatimes[^\s]*/gi, '')
       .replace(/https?:\/\/[^\s]*indianexpress[^\s]*/gi, '')
       .replace(/https?:\/\/[^\s]*ndtv[^\s]*/gi, '')
       .replace(/https?:\/\/[^\s]*news18[^\s]*/gi, '')

  // 5. Fix mojibake
  t = t.replace(/â\x80\x99|â€™/g, "'")
       .replace(/â\x80\x9c|â€œ|â\x80\x9d|â€\x9d|â€/g, '"')
       .replace(/â\x80\x94|â€”/g, '—')
       .replace(/â\x80\x93|â€“/g, '–')
       .replace(/(\w)âs\b/gi, "$1's")
       .replace(/â([^â\n]+)â/g, "'$1'")
       .replace(/â/g, "'")

  // 6. Strip syndication and promotional boilerplate
  t = t.replace(/\(This story has not been edited by[^\)]*\)/gi, ' ')
       .replace(/\(This story is auto-generated[^\)]*\)/gi, ' ')
       .replace(/\(With inputs from[^\)]*\)/gi, ' ')
       .replace(/Also Read\s*\|\s*[^\n]+/gi, ' ')
       .replace(/Published by:[^\n]+/gi, ' ')
       .replace(/Stay updated with the latest sports news across Cricket, Football, Chess, and more\./gi, ' ')
       .replace(/Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\./gi, ' ')

  // 7. Strip orphaned leading quotes/commas at start of text
  t = t.replace(/^['"’“”]*,\s*/, '')

  // Collapse whitespace
  return t.replace(/\s+/g, ' ').trim()
}

function extractImageFromHtml(text?: string | null): string | null {
  if (!text) return null
  const m = text.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  return m && m[1] && m[1].startsWith('http') ? m[1] : null
}

function mapScraperToArticleCard(a: any): ArticleCard {
  const catName = a.category ? (a.category.charAt(0).toUpperCase() + a.category.slice(1)) : 'News'
  const authorName = sanitizeAuthor(a.author, a.source_name || a.source)
  const cleanHeadline = cleanHtmlText(a.title)
  const cleanDek = cleanHtmlText(a.description || a.summary)
  const imgUrl = a.image_url || a.top_image || extractImageFromHtml(a.description) || extractImageFromHtml(a.content) || null

  return {
    id: a.id || a.article_id,
    headline: cleanHeadline,
    slug: a.slug || a.id || a.article_id,
    dek: cleanDek || null,
    publishedAt: a.published_at || a.collected_at || null,
    lastUpdatedAt: a.collected_at || null,
    isBreaking: false,
    isSponsored: false,
    accessLevel: 'free',
    source: 'Editorial Staff',
    sourceUrl: null,
    category: {
      id: a.category ? a.category.toLowerCase() : 'news',
      name: catName,
      slug: (a.category || 'news').toLowerCase(),
      showInNav: true
    },
    author: {
      id: authorName,
      displayName: authorName,
      slug: authorName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    },
    featuredMedia: imgUrl ? {
      id: a.id,
      url: imgUrl,
      alt: cleanHeadline,
      credit: 'PressPoint Wire',
      sizes: {
        card: { url: imgUrl, width: 450, height: 300 },
        hero: { url: imgUrl, width: 1200, height: 675 },
        og: { url: imgUrl, width: 1200, height: 630 }
      }
    } : null
  }
}

function mapScraperToArticle(a: any): Article {
  const card = mapScraperToArticleCard(a)
  const cleanHeadline = cleanHtmlText(a.title)
  const cleanDek = cleanHtmlText(a.description || a.summary)

  // Clean raw content to avoid repeating the title or description at the top of the body
  let rawContent = (cleanHtmlText(a.content) || cleanDek || cleanHeadline || '').trim()
  if (rawContent && cleanHeadline && rawContent.startsWith(cleanHeadline)) {
    rawContent = rawContent.slice(cleanHeadline.length).trim()
  }
  if (rawContent && cleanDek && rawContent.startsWith(cleanDek)) {
    rawContent = rawContent.slice(cleanDek.length).trim()
  }
  if (!rawContent) {
    rawContent = cleanDek || cleanHeadline || ''
  }

  return {
    ...card,
    body: textToLexical(rawContent),
    preview: textToLexical(cleanDek),
    wordCount: rawContent.split(/\s+/).filter(Boolean).length,
    updatedAt: a.updated_at || a.collected_at || undefined,
    tags: (a.tags || []).map((t: string, idx: number) => ({ id: idx, name: cleanHtmlText(t), slug: t.toLowerCase() })),
    seo: {
      title: cleanHeadline,
      description: cleanDek || undefined,
      canonicalUrl: undefined
    }
  }
}

// ---------- fetch core ----------

type FetchOpts = { tags?: string[]; revalidate?: number | false; token?: string; noStore?: boolean }

export class CmsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function cms<T>(path: string, params: Record<string, string | number | undefined> = {}, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(path, CMS_URL)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    headers: opts.token ? { authorization: `JWT ${opts.token}` } : undefined,
    ...(opts.noStore || opts.token
      ? { cache: 'no-store' as const }
      : { next: { revalidate: opts.revalidate ?? 300, tags: opts.tags ?? [] } }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new CmsError(`CMS ${res.status} for ${url.pathname}`, res.status)
  return res.json() as Promise<T>
}

/** Build Payload REST query params for a `where` on published articles. */
const liveWhere = (extra: Record<string, string> = {}) => ({
  'where[status][equals]': 'published',
  ...extra,
})

const selectParams = (fields: string[]) => Object.fromEntries(fields.map((f) => [`select[${f}]`, 'true']))

/** Never let a CMS outage take the site down: lists degrade to empty. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error('[cms]', err instanceof Error ? err.message : err)
    return fallback
  }
}

const emptyPage = <T,>(): Paginated<T> => ({ docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false })

// ---------- queries ----------

export const PAGE_SIZE = 20

export type ArticleSummary = {
  total: number
  sources: Record<string, number>
  categories: Record<string, number>
}

export async function getArticlesSummary(): Promise<ArticleSummary> {
  return safe(async () => {
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/articles/summary`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 }
    })
    if (!res.ok) return { total: 0, sources: {}, categories: {} }
    const data = await res.json()
    return {
      total: data.total || 0,
      sources: data.sources || {},
      categories: data.categories || {}
    }
  }, { total: 0, sources: {}, categories: {} })
}

export async function getLatestArticles(opts: {
  limit?: number;
  page?: number;
  categoryId?: string | number;
  categorySlug?: string;
  source?: string;
  tagId?: string | number;
  authorId?: string | number;
  cacheTags?: string[];
} = {}): Promise<Paginated<ArticleCard>> {
  // If specific publisher source is requested, query Scraper API directly
  if (opts.source) {
    return safe(async () => {
      let url = `${SCRAPER_API_URL}/api/v1/articles?limit=${opts.limit ?? PAGE_SIZE}&page=${opts.page ?? 1}&source=${encodeURIComponent(opts.source!)}`
      const cat = opts.categorySlug || opts.categoryId
      if (cat) {
        url += `&category=${encodeURIComponent(String(cat))}`
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
      if (!res.ok) return emptyPage<ArticleCard>()
      const data = await res.json()
      const docs = (data.articles || []).map(mapScraperToArticleCard)
      const total = data.total || docs.length
      return {
        docs,
        totalDocs: total,
        totalPages: Math.ceil(total / (opts.limit ?? PAGE_SIZE)) || 1,
        page: opts.page ?? 1,
        hasNextPage: (opts.page ?? 1) * (opts.limit ?? PAGE_SIZE) < total,
        hasPrevPage: (opts.page ?? 1) > 1
      }
    }, emptyPage<ArticleCard>())
  }

  // First attempt CMS only if an active CMS service is configured
  if (HAS_CMS) {
    try {
      const extra: Record<string, string> = {}
      if (opts.categoryId !== undefined) extra['where[category][equals]'] = String(opts.categoryId)
      if (opts.tagId !== undefined) extra['where[tags][in]'] = String(opts.tagId)
      if (opts.authorId !== undefined) extra['where[author][equals]'] = String(opts.authorId)
      const cmsRes = await cms<Paginated<ArticleCard>>(
        '/api/articles',
        {
          ...liveWhere(extra),
          sort: '-publishedAt',
          limit: Math.min(opts.limit ?? PAGE_SIZE, 50),
          page: Math.min(Math.max(opts.page ?? 1, 1), 500),
          depth: 1,
          ...selectParams(CARD_SELECT),
        },
        { tags: [tags.articles, ...(opts.cacheTags ?? [])], revalidate: 120 },
      )
      if (cmsRes.docs && cmsRes.docs.length > 0) return cmsRes
    } catch {}
  }

  // Fallback to Scraper API
  return safe(async () => {
    let url = `${SCRAPER_API_URL}/api/v1/articles?limit=${opts.limit ?? PAGE_SIZE}&page=${opts.page ?? 1}`
    const cat = opts.categorySlug || opts.categoryId
    if (cat) {
      url += `&category=${encodeURIComponent(String(cat))}`
    }
    if (opts.source) {
      url += `&source=${encodeURIComponent(String(opts.source))}`
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
    if (!res.ok) return emptyPage<ArticleCard>()
    const data = await res.json()
    const docs = (data.articles || []).map(mapScraperToArticleCard)
    const total = data.total || docs.length
    return {
      docs,
      totalDocs: total,
      totalPages: Math.ceil(total / (opts.limit ?? PAGE_SIZE)) || 1,
      page: opts.page ?? 1,
      hasNextPage: (opts.page ?? 1) * (opts.limit ?? PAGE_SIZE) < total,
      hasPrevPage: (opts.page ?? 1) > 1
    }
  }, emptyPage<ArticleCard>())
}

/** Public (cached) article. Subscriber-only stories come back with `preview` and no `body`. */
export async function getArticle(slug: string): Promise<Article | null> {
  // First attempt CMS only if an active CMS service is configured
  if (HAS_CMS) {
    try {
      const res = await cms<Paginated<Article>>(
        '/api/articles',
        { ...liveWhere({ 'where[slug][equals]': slug }), limit: 1, depth: 2 },
        { tags: [tags.article(slug), tags.articles], revalidate: 600 },
      )
      if (res.docs && res.docs[0]) return res.docs[0]
    } catch {}
  }

  // Fallback to Scraper API
  return safe(async () => {
    const res = await fetch(`${SCRAPER_API_URL}/api/v1/articles/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 120 }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.article) return null
    return mapScraperToArticle(data.article)
  }, null)
}

/** Full body for an entitled reader — never cached. */
export async function getArticleBodyForReader(slug: string, token: string): Promise<LexicalState | null> {
  try {
    const res = await cms<Paginated<Article>>(
      '/api/articles',
      { ...liveWhere({ 'where[slug][equals]': slug }), limit: 1, depth: 2, 'select[body]': 'true' },
      { token },
    )
    if (res.docs && res.docs[0]?.body) return res.docs[0].body
  } catch {}

  const a = await getArticle(slug)
  return a?.body ?? null
}

export async function getRedirect(path: string): Promise<string | null> {
  return safe(async () => {
    const res = await cms<Paginated<{ to: string }>>(
      '/api/redirects',
      { 'where[from][equals]': path, limit: 1, depth: 0 },
      { tags: [tags.articles], revalidate: 600 },
    )
    return res.docs[0]?.to ?? null
  }, null)
}

export function getCategories(): Promise<Category[]> {
  return safe<Category[]>(
    async () => {
      if (HAS_CMS) {
        try {
          const res = await cms<Paginated<Category>>('/api/categories', { sort: 'order', limit: 50, depth: 0 }, { tags: [tags.taxonomy], revalidate: 3600 })
          if (res.docs && res.docs.length > 0) return res.docs
        } catch {}
      }

      // Fallback from Scraper API
      try {
        const sRes = await fetch(`${SCRAPER_API_URL}/api/v1/categories`, { signal: AbortSignal.timeout(4000) })
        if (sRes.ok) {
          const data = await sRes.json()
          if (data.distribution && data.distribution.length > 0) {
            return data.distribution.map((d: any): Category => ({
              id: d.slug,
              name: d.name,
              slug: d.slug,
              description: `${d.total_articles} articles across ${(d.publishers || []).join(', ')}`,
              showInNav: true
            }))
          }
          if (data.categories && data.categories.length > 0) {
            return data.categories.map((c: string): Category => ({
              id: c.toLowerCase(),
              name: c.charAt(0).toUpperCase() + c.slice(1),
              slug: c.toLowerCase(),
              showInNav: true
            }))
          }
        }
      } catch {}

      return [
        { id: 'india', name: 'India', slug: 'india', showInNav: true },
        { id: 'world', name: 'World', slug: 'world', showInNav: true },
        { id: 'business', name: 'Business', slug: 'business', showInNav: true },
        { id: 'technology', name: 'Technology', slug: 'technology', showInNav: true },
        { id: 'sports', name: 'Sports', slug: 'sports', showInNav: true },
        { id: 'entertainment', name: 'Entertainment', slug: 'entertainment', showInNav: true },
        { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', showInNav: true },
      ] as Category[]
    },
    [] as Category[],
  )
}

export type CategoryDistributionItem = {
  slug: string
  name: string
  total_articles: number
  count: number
  articles: ArticleCard[]
}

export type CategoryDistributionResponse = {
  success: boolean
  total_categories: number
  limit_per_category: number
  source_filter?: string | null
  categories: CategoryDistributionItem[]
  categories_map: Record<string, CategoryDistributionItem>
}

export async function getCategoryDistribution(opts: {
  limitPerCategory?: number
  categories?: string[]
  source?: string
} = {}): Promise<CategoryDistributionResponse> {
  return safe(async () => {
    let url = `${SCRAPER_API_URL}/api/v1/categories/distribution?limit_per_category=${opts.limitPerCategory ?? 6}`
    if (opts.categories && opts.categories.length > 0) {
      url += `&categories=${encodeURIComponent(opts.categories.join(','))}`
    }
    if (opts.source) {
      url += `&source=${encodeURIComponent(opts.source)}`
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 60 } })
    if (!res.ok) return { success: false, total_categories: 0, limit_per_category: opts.limitPerCategory ?? 6, categories: [], categories_map: {} }
    const data = await res.json()
    const mappedCategories: CategoryDistributionItem[] = (data.categories || []).map((cat: any) => ({
      slug: cat.slug,
      name: cat.name,
      total_articles: cat.total_articles,
      count: cat.count,
      articles: (cat.articles || []).map(mapScraperToArticleCard)
    }))
    const categoriesMap: Record<string, CategoryDistributionItem> = {}
    for (const item of mappedCategories) {
      categoriesMap[item.slug] = item
    }
    return {
      success: true,
      total_categories: mappedCategories.length,
      limit_per_category: data.limit_per_category || (opts.limitPerCategory ?? 6),
      source_filter: data.source_filter || opts.source || null,
      categories: mappedCategories,
      categories_map: categoriesMap
    }
  }, { success: false, total_categories: 0, limit_per_category: opts.limitPerCategory ?? 6, categories: [], categories_map: {} })
}

async function bySlug<T>(collection: string, slug: string, tag: string): Promise<T | null> {
  return safe(async () => {
    try {
      const res = await cms<Paginated<T>>(`/api/${collection}`, { 'where[slug][equals]': slug, limit: 1, depth: 1 }, { tags: [tag, tags.taxonomy], revalidate: 3600 })
      if (res.docs && res.docs[0]) return res.docs[0]
    } catch {}

    if (collection === 'categories') {
      const cleanSlug = slug.toLowerCase().trim()
      const all = await getCategories()
      const found = all.find((c) => c.slug.toLowerCase() === cleanSlug)
      if (found) return found as T

      // Universal dynamic fallback for all categories (including custom categories)
      const cleanName = cleanSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return {
        id: cleanSlug,
        name: cleanName,
        slug: cleanSlug,
        description: `Latest news and updates in ${cleanName}.`,
        showInNav: true
      } as unknown as T
    }
    return null
  }, null)
}

export const getCategory = (slug: string) => bySlug<Category>('categories', slug, tags.category(slug))
export const getTag = (slug: string) => bySlug<Tag>('tags', slug, tags.tag(slug))
export const getAuthor = (slug: string) => bySlug<Author>('authors', slug, tags.author(slug))

export function getAuthors() {
  return safe(async () => (await cms<Paginated<Author>>('/api/authors', { limit: 500, depth: 0 }, { tags: [tags.taxonomy], revalidate: 3600 })).docs, [] as Author[])
}

export function getPlans() {
  return safe(
    async () => (await cms<Paginated<Plan>>('/api/plans', { sort: 'order', limit: 20, depth: 0 }, { tags: [tags.plans], revalidate: 3600 })).docs,
    [] as Plan[],
  )
}

export type SearchResult = { docs: ArticleCard[]; totalDocs: number; page: number; limit: number; q: string }

export function searchArticles(q: string, page = 1): Promise<SearchResult> {
  return safe<SearchResult>(
    async () => {
      try {
        const cmsRes = await cms<SearchResult>('/api/search', { q, page, limit: 10 }, { tags: [tags.articles], revalidate: 60 })
        if (cmsRes.docs && cmsRes.docs.length > 0) return cmsRes
      } catch {}

      const sRes = await fetch(`${SCRAPER_API_URL}/api/v1/articles?search=${encodeURIComponent(q)}&page=${page}&limit=10`, { signal: AbortSignal.timeout(4000) })
      if (sRes.ok) {
        const data = await sRes.json()
        const docs = (data.articles || []).map(mapScraperToArticleCard)
        return {
          docs,
          totalDocs: data.total || docs.length,
          page,
          limit: 10,
          q
        }
      }
      return { docs: [], totalDocs: 0, page, limit: 10, q } as SearchResult
    },
    { docs: [], totalDocs: 0, page, limit: 10, q } as SearchResult,
  )
}

/** For sitemaps/feeds: published articles since a date (paged internally, capped). */
export async function getArticlesSince(sinceIso: string | null, max = 1000): Promise<ArticleCard[]> {
  const out: ArticleCard[] = []
  try {
    for (let page = 1; out.length < max; page++) {
      const extra: Record<string, string> = sinceIso ? { 'where[publishedAt][greater_than_equal]': sinceIso } : {}
      const res = await safe(
        () =>
          cms<Paginated<ArticleCard & { updatedAt?: string; seo?: Article['seo'] }>>(
            '/api/articles',
            { ...liveWhere(extra), sort: '-publishedAt', limit: 100, page, depth: 1, ...selectParams([...CARD_SELECT, 'updatedAt', 'seo']) },
            { tags: [tags.articles], revalidate: 300 },
          ),
        emptyPage<ArticleCard>(),
      )
      out.push(...res.docs)
      if (!res.hasNextPage) break
    }
  } catch {}

  if (!out.length) {
    const scraperRes = await getLatestArticles({ limit: Math.min(max, 100) })
    out.push(...scraperRes.docs)
  }

  return out.slice(0, max)
}
