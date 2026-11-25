import type { MetadataRoute } from 'next'

import { absoluteUrl } from '../lib/site'

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production'
  // Never let preview/staging deployments be indexed.
  if (!isProduction) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/account', '/api/', '/search', '/forgot-password', '/reset-password'] }],
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/news-sitemap.xml')],
  }
}
