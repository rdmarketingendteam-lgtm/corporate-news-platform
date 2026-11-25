/** Only allow safe link targets: http(s), mailto, tel, site-relative paths and in-page anchors. */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const href = raw.trim()
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  if (href.startsWith('#')) return href
  try {
    const u = new URL(href)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) ? u.toString() : null
  } catch {
    return null
  }
}

/** Map an internal-link relationship to a site path. */
export function internalHref(doc: { relationTo?: string; value?: unknown } | undefined): string | null {
  if (!doc || typeof doc.value !== 'object' || !doc.value) return null
  const slug = (doc.value as { slug?: string }).slug
  if (!slug) return null
  switch (doc.relationTo) {
    case 'articles':
      return `/news/${slug}`
    case 'categories':
      return `/category/${slug}`
    case 'authors':
      return `/author/${slug}`
    case 'tags':
      return `/topic/${slug}`
    default:
      return null
  }
}

export type EmbedKind = { kind: 'youtube'; id: string } | { kind: 'link'; host: string; url: string; label: string }

/** Classify embed URLs. Only YouTube is rendered as an iframe (privacy-enhanced); everything else is a link card. */
export function classifyEmbed(raw: unknown): EmbedKind | null {
  const href = safeHref(raw)
  if (!href || !href.startsWith('https://')) return null
  const u = new URL(href)
  const host = u.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null
  }
  if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return { kind: 'youtube', id }
  const label =
    host === 'x.com' || host === 'twitter.com' ? 'View post on X' : host === 'instagram.com' ? 'View post on Instagram' : `Open ${host}`
  return { kind: 'link', host, url: href, label }
}
