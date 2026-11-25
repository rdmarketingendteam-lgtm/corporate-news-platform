import 'server-only'

import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

import { CMS_URL } from './cms'

export const TOKEN_COOKIE = 'reader_token'
export const USER_COOKIE = 'newspaper_user'
/** Non-sensitive UI hints readable by client JS ("sub", "adfree"). Never trusted for access decisions. */
export const FLAGS_COOKIE = 'reader_flags'

// Allow cookies over plain HTTP on LAN / local network (e.g. 192.168.x.x, localhost)
// Only force secure=true if explicitly set in environment
const secure = process.env.COOKIE_SECURE === 'true'

export type Reader = {
  id: number | string
  email: string
  name?: string | null
  entitlement?: { status?: string | null; planCode?: string | null; activeUntil?: string | null; adFree?: boolean | null } | null
}

export async function getCurrentUser(): Promise<{ email: string; displayName?: string; role?: string } | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(USER_COOKIE)?.value
  if (!raw) return null
  try {
    try {
      return JSON.parse(decodeURIComponent(raw))
    } catch {
      return JSON.parse(raw)
    }
  } catch {
    return null
  }
}

export const isEntitled = (r: Reader | null) =>
  Boolean(
    r?.entitlement?.activeUntil &&
      ['active', 'trialing', 'past_due'].includes(r.entitlement.status ?? '') &&
      new Date(r.entitlement.activeUntil).getTime() > Date.now(),
  )

/** "in" = signed in, "sub" = entitled subscriber, "adfree" = plan without display ads. */
export const flagsFor = (r: Reader | null) =>
  [r ? 'in' : null, isEntitled(r) ? 'sub' : null, isEntitled(r) && r?.entitlement?.adFree ? 'adfree' : null].filter(Boolean).join(',')

export function setFlags(res: { cookies: NextResponse['cookies'] }, reader: Reader | null) {
  res.cookies.set(FLAGS_COOKIE, flagsFor(reader), { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null
}

/** Current reader from the local session or CMS. Returns null when signed out or the token expired. */
export async function getReader(token?: string | null): Promise<Reader | null> {
  const user = await getCurrentUser()
  if (user) {
    return {
      id: user.email,
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      entitlement: { status: 'active', planCode: 'member', activeUntil: '2030-12-31' }
    }
  }

  const t = token ?? (await getToken())
  if (!t) return null
  try {
    const res = await fetch(new URL('/api/readers/me', CMS_URL), {
      headers: { authorization: `JWT ${t}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: Reader | null }
    return data.user ?? null
  } catch {
    return null
  }
}

export function setSession(res: NextResponse, token: string, exp: number | undefined, reader: Reader | null) {
  const maxAge = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 60) : 60 * 60 * 24 * 30
  res.cookies.set(TOKEN_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge })
  res.cookies.set(FLAGS_COOKIE, flagsFor(reader), { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge })
  if (reader) {
    res.cookies.set(USER_COOKIE, encodeURIComponent(JSON.stringify({
      email: reader.email,
      displayName: reader.name || reader.email.split('@')[0],
      role: 'member'
    })), { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge })
  }
}

export function clearSession(res: NextResponse) {
  res.cookies.set(TOKEN_COOKIE, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 })
  res.cookies.set(USER_COOKIE, '', { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: 0 })
  res.cookies.set(FLAGS_COOKIE, '', { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: 0 })
}

/**
 * CSRF defence for cookie-authenticated form posts: require the Origin (or Referer) to be this site.
 * Combined with SameSite=Lax cookies.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer')
  if (!origin) return false
  try {
    const o = new URL(origin)
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    return o.host === host
  } catch {
    return false
  }
}

/** Only allow redirects to local paths. */
export const safeNext = (value: FormDataEntryValue | string | null | undefined, fallback = '/account') =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
