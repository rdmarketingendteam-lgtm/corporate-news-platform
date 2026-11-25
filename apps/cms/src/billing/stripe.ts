import { verifyStripeSignature } from './signatures'
import {
  ProviderError,
  WebhookSignatureError,
  type CheckoutInput,
  type NormalizedSubscription,
  type PaymentProvider,
  type SubscriptionStatus,
  type WebhookEvent,
} from './types'

const API = 'https://api.stripe.com/v1'
/** Pinned so response shapes don't change under us. Subscription periods live on items since this version. */
export const STRIPE_API_VERSION = '2025-03-31.basil'

type FetchLike = typeof fetch

/** Stripe expects application/x-www-form-urlencoded with bracket notation for nested params. */
export function toFormBody(params: Record<string, unknown>, prefix = ''): URLSearchParams {
  const out = new URLSearchParams()
  const add = (key: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) value.forEach((v, i) => add(`${key}[${i}]`, v))
    else if (typeof value === 'object') Object.entries(value as object).forEach(([k, v]) => add(`${key}[${k}]`, v))
    else out.append(key, String(value))
  }
  Object.entries(params).forEach(([k, v]) => add(prefix ? `${prefix}[${k}]` : k, v))
  return out
}

export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'paused':
      return 'paused'
    case 'canceled':
      return 'cancelled'
    case 'unpaid':
    case 'incomplete_expired':
      return 'expired'
    default:
      return 'incomplete'
  }
}

export function normalizeStripeSubscription(sub: any): NormalizedSubscription {
  const item = sub?.items?.data?.[0]
  // Since 2025-03-31.basil the billing period lives on the subscription item; fall back for older versions.
  const periodEnd: number | undefined = item?.current_period_end ?? sub?.current_period_end
  return {
    provider: 'stripe',
    providerSubscriptionId: String(sub.id),
    providerCustomerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
    status: mapStripeStatus(String(sub.status)),
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    readerId: sub.metadata?.readerId ?? null,
    planCode: sub.metadata?.planCode ?? null,
    providerPlanId: item?.price?.id ?? null,
  }
}

/** Find the subscription id an event refers to, across event object types and API versions. */
export function stripeEventSubscriptionId(event: any): string | null {
  const obj = event?.data?.object
  if (!obj) return null
  if (obj.object === 'subscription') return String(obj.id)
  if (obj.object === 'checkout.session') return obj.subscription ? String(obj.subscription) : null
  if (obj.object === 'invoice') {
    const id = obj.subscription ?? obj.parent?.subscription_details?.subscription
    return id ? String(typeof id === 'string' ? id : id.id) : null
  }
  return null
}

export function createStripeProvider(
  env: { secretKey?: string; webhookSecret?: string } = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  fetchImpl: FetchLike = (...args) => fetch(...args),
): PaymentProvider {
  const call = async (method: 'GET' | 'POST', path: string, params?: Record<string, unknown>) => {
    if (!env.secretKey) throw new ProviderError('Stripe is not configured')
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${env.secretKey}`,
        'stripe-version': STRIPE_API_VERSION,
        ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' && params ? toFormBody(params).toString() : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) throw new ProviderError(json?.error?.message ?? `Stripe HTTP ${res.status}`, res.status)
    return json
  }

  return {
    name: 'stripe',
    isConfigured: () => Boolean(env.secretKey && env.webhookSecret),

    async createCheckout({ plan, reader, successUrl, cancelUrl, existingCustomerId }: CheckoutInput) {
      if (!plan.stripePriceId) throw new ProviderError(`Plan "${plan.code}" has no Stripe price ID`)
      const metadata = { readerId: String(reader.id), planCode: plan.code }
      const session = await call('POST', '/checkout/sessions', {
        mode: 'subscription',
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: String(reader.id),
        ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: reader.email }),
        allow_promotion_codes: true,
        metadata,
        subscription_data: { metadata },
      })
      if (!session.url) throw new ProviderError('Stripe did not return a checkout URL')
      return { url: String(session.url) }
    },

    parseWebhook(rawBody: string, headers: Headers): WebhookEvent {
      if (!verifyStripeSignature(rawBody, headers.get('stripe-signature'), env.webhookSecret ?? '')) {
        throw new WebhookSignatureError()
      }
      const event = JSON.parse(rawBody)
      return { id: String(event.id), type: String(event.type), subscriptionId: stripeEventSubscriptionId(event) }
    },

    async fetchSubscription(id: string) {
      return normalizeStripeSubscription(await call('GET', `/subscriptions/${encodeURIComponent(id)}`))
    },

    async cancelAtPeriodEnd(id: string) {
      return normalizeStripeSubscription(
        await call('POST', `/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: true }),
      )
    },
  }
}
