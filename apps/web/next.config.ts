import type { NextConfig } from 'next'

/**
 * Content-Security-Policy is shipped in REPORT-ONLY mode first: Google Ad Manager loads
 * scripts and frames from many Google domains. Review violation reports in staging, then
 * switch the header name to `Content-Security-Policy` to enforce.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://securepubads.g.doubleclick.net https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "frame-src https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com https://www.youtube-nocookie.com",
  "connect-src 'self' https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com",
  "font-src 'self' data:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://rzp.io https://*.razorpay.com",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.102.43'],
  reactStrictMode: true,
  experimental: {
    agentUpgrade: 'security',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
      { source: '/account', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ]
  },
}

export default nextConfig
