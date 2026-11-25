/** Consent state stored in a first-party cookie. Client-side helpers (safe to import in client components). */
export type ConsentChoice = 'all' | 'essential'
export const CONSENT_COOKIE = 'consent_v1'
export const CONSENT_EVENT = 'consent:change'
export const OPEN_CONSENT_EVENT = 'consent:open'

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

export function getConsent(): ConsentChoice | null {
  const v = readCookie(CONSENT_COOKIE)
  return v === 'all' || v === 'essential' ? v : null
}

export function setConsent(choice: ConsentChoice) {
  const maxAge = 60 * 60 * 24 * 180 // re-ask after ~6 months
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }))
}

export const hasReaderFlag = (flag: 'in' | 'sub' | 'adfree') => (readCookie('reader_flags') ?? '').split(',').includes(flag)
