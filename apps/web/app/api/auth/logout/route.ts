import { type NextRequest, NextResponse } from 'next/server'

import { CMS_URL } from '../../../../lib/cms'
import { back } from '../../../../lib/forms'
import { TOKEN_COOKIE, clearSession, isSameOrigin } from '../../../../lib/session'

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '192.168.102.43:3002'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const cleanHost = host.startsWith('0.0.0.0') ? host.replace('0.0.0.0', 'localhost') : host
  const redirectUrl = `${proto}://${cleanHost}/login`
  const res = NextResponse.redirect(redirectUrl)
  clearSession(res)
  return res
}

export async function POST(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '192.168.102.43:3002'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const cleanHost = host.startsWith('0.0.0.0') ? host.replace('0.0.0.0', 'localhost') : host
  const redirectUrl = `${proto}://${cleanHost}/login`
  const res = NextResponse.redirect(redirectUrl)
  clearSession(res)
  return res
}
