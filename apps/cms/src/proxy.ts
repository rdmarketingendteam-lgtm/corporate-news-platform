import { NextResponse, type NextRequest } from 'next/server'

/**
 * Dev only. Chrome treats plain-HTTP LAN addresses (http://192.168.x.x) as insecure, so it sends
 * neither `Origin` (on GET) nor `Sec-Fetch-Site`, and Payload's CSRF check then drops the session
 * cookie. Give those requests the CMS origin so cookie auth works when testing over the local network.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return NextResponse.next()
  if (request.headers.get('origin') || request.headers.get('sec-fetch-site')) return NextResponse.next()

  const headers = new Headers(request.headers)
  headers.set('origin', `${request.nextUrl.protocol}//${request.headers.get('host')}`)
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/admin/:path*', '/api/:path*'] }
