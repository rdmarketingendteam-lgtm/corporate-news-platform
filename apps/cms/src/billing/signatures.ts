import { createHmac, timingSafeEqual } from 'node:crypto'

const safeEqualHex = (a: string, b: string): boolean => {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

export const hmacSha256Hex = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload, 'utf8').digest('hex')

/**
 * Stripe: header `Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>]`, signed payload `${t}.${rawBody}`.
 * Rejects timestamps outside the tolerance window to block replays.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  { toleranceSeconds = 300, now = Date.now() }: { toleranceSeconds?: number; now?: number } = {},
): boolean {
  if (!header || !secret) return false
  const parts = header.split(',').map((p) => p.trim().split('=') as [string, string])
  const timestamp = parts.find(([k]) => k === 't')?.[1]
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > toleranceSeconds) return false
  const expected = hmacSha256Hex(secret, `${timestamp}.${rawBody}`)
  return signatures.some((sig) => safeEqualHex(sig, expected))
}

/** Razorpay: header `X-Razorpay-Signature` = hex HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyRazorpaySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false
  return safeEqualHex(header.trim(), hmacSha256Hex(secret, rawBody))
}
