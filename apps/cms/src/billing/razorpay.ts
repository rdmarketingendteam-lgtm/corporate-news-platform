import { verifyRazorpaySignature } from './signatures'
import {
  ProviderError,
  WebhookSignatureError,
  type CheckoutInput,
  type NormalizedSubscription,
  type PaymentProvider,
  type SubscriptionStatus,
  type WebhookEvent,
} from './types'

const API = 'https://api.razorpay.com/v1'
type FetchLike = typeof fetch

/**
 * Razorpay subscription states: created, authenticated, active, pending, halted, paused,
 * cancelled, completed, expired. `pending` = a charge failed and is being retried;
 * `halted` = retries exhausted (no access until the customer fixes payment).
 */
export function mapRazorpayStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'pending':
      return 'past_due'
    case 'halted':
    case 'paused':
      return 'paused'
    case 'cancelled':
      return 'cancelled'
    case 'completed':
    case 'expired':
      return 'expired'
    default:
      // created / authenticated: payment method set up, first cycle not yet active
      return 'incomplete'
  }
}

export function normalizeRazorpaySubscription(sub: any): NormalizedSubscription {
  return {
    provider: 'razorpay',
    providerSubscriptionId: String(sub.id),
    providerCustomerId: sub.customer_id ?? null,
    status: mapRazorpayStatus(String(sub.status)),
    currentPeriodEnd: sub.current_end ? new Date(Number(sub.current_end) * 1000) : null,
    // Razorpay doesn't expose a cancel-at-cycle-end flag on the entity; we track it locally after cancel requests.
    cancelAtPeriodEnd: false,
    readerId: sub.notes?.readerId ?? null,
    planCode: sub.notes?.planCode ?? null,
    providerPlanId: sub.plan_id ?? null,
  }
}

export function createRazorpayProvider(
  env: { keyId?: string; keySecret?: string; webhookSecret?: string } = {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  fetchImpl: FetchLike = (...args) => fetch(...args),
): PaymentProvider {
  const call = async (method: 'GET' | 'POST', path: string, body?: unknown) => {
    if (!env.keyId || !env.keySecret) throw new ProviderError('Razorpay is not configured')
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: {
        authorization: `Basic ${Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64')}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) throw new ProviderError(json?.error?.description ?? `Razorpay HTTP ${res.status}`, res.status)
    return json
  }

  return {
    name: 'razorpay',
    isConfigured: () => Boolean(env.keyId && env.keySecret && env.webhookSecret),

    async createCheckout({ plan, reader }: CheckoutInput) {
      if (!plan.razorpayPlanId) throw new ProviderError(`Plan "${plan.code}" has no Razorpay plan ID`)
      const sub = await call('POST', '/subscriptions', {
        plan_id: plan.razorpayPlanId,
        total_count: plan.razorpayTotalCount ?? (plan.interval === 'year' ? 10 : 120),
        quantity: 1,
        customer_notify: true,
        notes: { readerId: String(reader.id), planCode: plan.code, email: reader.email },
      })
      if (!sub.short_url) throw new ProviderError('Razorpay did not return a payment link')
      // Razorpay-hosted authorisation page; the subscription becomes active via webhook.
      return { url: String(sub.short_url), pending: normalizeRazorpaySubscription(sub) }
    },

    parseWebhook(rawBody: string, headers: Headers): WebhookEvent {
      if (!verifyRazorpaySignature(rawBody, headers.get('x-razorpay-signature'), env.webhookSecret ?? '')) {
        throw new WebhookSignatureError()
      }
      const event = JSON.parse(rawBody)
      const eventId = headers.get('x-razorpay-event-id')
      if (!eventId) throw new WebhookSignatureError('Missing x-razorpay-event-id header')
      const subId = event?.payload?.subscription?.entity?.id ?? null
      return { id: eventId, type: String(event.event), subscriptionId: subId ? String(subId) : null }
    },

    async fetchSubscription(id: string) {
      return normalizeRazorpaySubscription(await call('GET', `/subscriptions/${encodeURIComponent(id)}`))
    },

    async cancelAtPeriodEnd(id: string) {
      const sub = await call('POST', `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: true })
      return { ...normalizeRazorpaySubscription(sub), cancelAtPeriodEnd: true }
    },
  }
}
