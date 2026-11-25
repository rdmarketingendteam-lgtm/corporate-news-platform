export const site = {
  name: process.env.NEXT_PUBLIC_PUBLICATION_NAME || 'The Daily Brief',
  tagline: 'Independent journalism · Global perspective',
  description: 'Independent reporting, breaking news, and analysis from India and around the world.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  /** ISO 639 language code used in feeds and the news sitemap. */
  language: 'en',
  locale: 'en_IN',
  logoPath: '/logo.png',
  timeZone: 'Asia/Kolkata',
}

export const absoluteUrl = (path = '/') => new URL(path, `${site.url}/`).toString()

export function formatDate(iso?: string | null, withTime = false): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: site.timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

export function formatPrice(minor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100)
}
