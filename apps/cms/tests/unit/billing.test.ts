import { describe, expect, it, vi } from 'vitest'

import { createRazorpayProvider, mapRazorpayStatus, normalizeRazorpaySubscription } from '../../src/billing/razorpay'
import { hmacSha256Hex, verifyRazorpaySignature, verifyStripeSignature } from '../../src/billing/signatures'
import {
  createStripeProvider,
  mapStripeStatus,
  normalizeStripeSubscription,
  stripeEventSubscriptionId,
  toFormBody,
} from '../../src/billing/stripe'
import { computeEntitlement } from '../../src/billing/sync'
import { WebhookSignatureError } from '../../src/billing/types'

const SECRET = 'whsec_test_secret'

const stripeHeader = (body: string, t = Math.floor(Date.now() / 1000), secret = SECRET) =>
  `t=${t},v1=${hmacSha256Hex(secret, `${t}.${body}`)}`

describe('Stripe signature verification', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' })

  it('accepts a valid signature', () => {
    expect(verifyStripeSignature(body, stripeHeader(body), SECRET)).toBe(true)
  })
  it('accepts when any of several v1 signatures matches (secret rotation)', () => {
    const t = Math.floor(Date.now() / 1000)
    const header = `t=${t},v1=${'0'.repeat(64)},v1=${hmacSha256Hex(SECRET, `${t}.${body}`)}`
    expect(verifyStripeSignature(body, header, SECRET)).toBe(true)
  })
  it('rejects a tampered body', () => {
    expect(verifyStripeSignature(body + ' ', stripeHeader(body), SECRET)).toBe(false)
  })
  it('rejects the wrong secret', () => {
    expect(verifyStripeSignature(body, stripeHeader(body, undefined, 'other'), SECRET)).toBe(false)
  })
  it('rejects stale timestamps (replay protection)', () => {
    const old = Math.floor(Date.now() / 1000) - 3600
    expect(verifyStripeSignature(body, stripeHeader(body, old), SECRET)).toBe(false)
  })
  it('rejects malformed headers', () => {
    expect(verifyStripeSignature(body, null, SECRET)).toBe(false)
    expect(verifyStripeSignature(body, 'garbage', SECRET)).toBe(false)
    expect(verifyStripeSignature(body, 't=abc,v1=zz', SECRET)).toBe(false)
  })
})

describe('Razorpay signature verification', () => {
  const body = '{"event":"subscription.charged"}'
  it('accepts hex HMAC-SHA256 of the raw body', () => {
    expect(verifyRazorpaySignature(body, hmacSha256Hex(SECRET, body), SECRET)).toBe(true)
  })
  it('rejects mismatches and empty input', () => {
    expect(verifyRazorpaySignature(body, hmacSha256Hex(SECRET, body + 'x'), SECRET)).toBe(false)
    expect(verifyRazorpaySignature(body, '', SECRET)).toBe(false)
    expect(verifyRazorpaySignature(body, hmacSha256Hex(SECRET, body), '')).toBe(false)
  })
})

describe('Stripe normalisation', () => {
  it('reads the billing period from subscription items (basil+)', () => {
    const n = normalizeStripeSubscription({
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      cancel_at_period_end: false,
      metadata: { readerId: '42', planCode: 'monthly' },
      items: { data: [{ current_period_end: 1767225600, price: { id: 'price_1' } }] },
    })
    expect(n).toMatchObject({
      providerSubscriptionId: 'sub_1',
      providerCustomerId: 'cus_1',
      status: 'active',
      readerId: '42',
      providerPlanId: 'price_1',
    })
    expect(n.currentPeriodEnd?.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })
  it('falls back to the legacy top-level period', () => {
    expect(normalizeStripeSubscription({ id: 's', status: 'trialing', current_period_end: 1767225600 }).currentPeriodEnd).toEqual(
      new Date('2026-01-01T00:00:00Z'),
    )
  })
  it('maps statuses', () => {
    expect(mapStripeStatus('canceled')).toBe('cancelled')
    expect(mapStripeStatus('unpaid')).toBe('expired')
    expect(mapStripeStatus('incomplete')).toBe('incomplete')
    expect(mapStripeStatus('past_due')).toBe('past_due')
  })
  it('finds the subscription id across event object types', () => {
    expect(stripeEventSubscriptionId({ data: { object: { object: 'subscription', id: 'sub_a' } } })).toBe('sub_a')
    expect(stripeEventSubscriptionId({ data: { object: { object: 'checkout.session', subscription: 'sub_b' } } })).toBe('sub_b')
    expect(stripeEventSubscriptionId({ data: { object: { object: 'invoice', subscription: 'sub_c' } } })).toBe('sub_c')
    expect(
      stripeEventSubscriptionId({
        data: { object: { object: 'invoice', parent: { subscription_details: { subscription: 'sub_d' } } } },
      }),
    ).toBe('sub_d')
    expect(stripeEventSubscriptionId({ data: { object: { object: 'charge' } } })).toBeNull()
  })
  it('encodes nested form params with bracket notation', () => {
    const body = toFormBody({ line_items: [{ price: 'p', quantity: 1 }], metadata: { a: 'b' }, skip: undefined })
    expect(body.toString()).toBe('line_items%5B0%5D%5Bprice%5D=p&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Ba%5D=b')
  })
  it('creates a subscription-mode Checkout Session with reader metadata', async () => {
    const fetchMock = vi.fn(async (_url: any, _init: any) => Response.json({ url: 'https://checkout.stripe.com/c/x' }))
    const stripe = createStripeProvider({ secretKey: 'sk_test', webhookSecret: SECRET }, fetchMock as any)
    const res = await stripe.createCheckout({
      plan: { id: 1, code: 'monthly', name: 'Monthly', interval: 'month', stripePriceId: 'price_9' },
      reader: { id: 7, email: 'r@example.com' },
      successUrl: 'https://site/ok',
      cancelUrl: 'https://site/no',
    })
    expect(res.url).toBe('https://checkout.stripe.com/c/x')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions')
    const sent = new URLSearchParams(init.body)
    expect(sent.get('mode')).toBe('subscription')
    expect(sent.get('line_items[0][price]')).toBe('price_9')
    expect(sent.get('subscription_data[metadata][readerId]')).toBe('7')
    expect(sent.get('customer_email')).toBe('r@example.com')
    expect(init.headers['stripe-version']).toBeTruthy()
  })
  it('parseWebhook throws on a bad signature', () => {
    const stripe = createStripeProvider({ secretKey: 'sk', webhookSecret: SECRET })
    expect(() => stripe.parseWebhook('{}', new Headers({ 'stripe-signature': 't=1,v1=00' }))).toThrow(WebhookSignatureError)
  })
})

describe('Razorpay normalisation', () => {
  it('maps lifecycle states', () => {
    expect(mapRazorpayStatus('created')).toBe('incomplete')
    expect(mapRazorpayStatus('authenticated')).toBe('incomplete')
    expect(mapRazorpayStatus('active')).toBe('active')
    expect(mapRazorpayStatus('pending')).toBe('past_due')
    expect(mapRazorpayStatus('halted')).toBe('paused')
    expect(mapRazorpayStatus('completed')).toBe('expired')
  })
  it('normalises the subscription entity', () => {
    const n = normalizeRazorpaySubscription({
      id: 'sub_R',
      status: 'active',
      plan_id: 'plan_1',
      customer_id: 'cust_1',
      current_end: 1767225600,
      notes: { readerId: '9', planCode: 'yearly' },
    })
    expect(n).toMatchObject({ providerSubscriptionId: 'sub_R', status: 'active', readerId: '9', providerPlanId: 'plan_1' })
    expect(n.currentPeriodEnd).toEqual(new Date('2026-01-01T00:00:00Z'))
  })
  it('requires the event id header for idempotency', () => {
    const rp = createRazorpayProvider({ keyId: 'k', keySecret: 's', webhookSecret: SECRET })
    const body = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_X' } } } })
    const sig = hmacSha256Hex(SECRET, body)
    expect(() => rp.parseWebhook(body, new Headers({ 'x-razorpay-signature': sig }))).toThrow()
    expect(rp.parseWebhook(body, new Headers({ 'x-razorpay-signature': sig, 'x-razorpay-event-id': 'evt_9' }))).toEqual({
      id: 'evt_9',
      type: 'subscription.charged',
      subscriptionId: 'sub_X',
    })
  })
  it('cancels at cycle end', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'sub_R', status: 'active', current_end: 1767225600 }))
    const rp = createRazorpayProvider({ keyId: 'k', keySecret: 's', webhookSecret: SECRET }, fetchMock as any)
    const res = await rp.cancelAtPeriodEnd('sub_R')
    expect(res.cancelAtPeriodEnd).toBe(true)
    const [url, init] = (fetchMock.mock.calls[0] as any[])!
    expect(url).toBe('https://api.razorpay.com/v1/subscriptions/sub_R/cancel')
    expect(JSON.parse(init.body)).toEqual({ cancel_at_cycle_end: true })
  })
})

describe('entitlement', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  it('grants access for active subscriptions until period end (+ renewal grace)', () => {
    const e = computeEntitlement(
      [{ id: 1, status: 'active', currentPeriodEnd: '2026-06-10T00:00:00Z', plan: { code: 'm', adFree: true } }],
      now,
    )
    expect(e).toMatchObject({ status: 'active', planCode: 'm', adFree: true })
    expect(e.activeUntil).toBe('2026-06-11T00:00:00.000Z')
  })
  it('no grace when cancelling at period end', () => {
    const e = computeEntitlement([{ id: 1, status: 'active', currentPeriodEnd: '2026-06-10T00:00:00Z', cancelAtPeriodEnd: true }], now)
    expect(e.activeUntil).toBe('2026-06-10T00:00:00.000Z')
  })
  it('denies expired, cancelled and incomplete subscriptions', () => {
    expect(computeEntitlement([{ id: 1, status: 'active', currentPeriodEnd: '2026-05-01T00:00:00Z' }], now).status).toBe('none')
    expect(computeEntitlement([{ id: 1, status: 'cancelled', currentPeriodEnd: '2026-07-01T00:00:00Z' }], now).status).toBe('none')
    expect(computeEntitlement([{ id: 1, status: 'incomplete', currentPeriodEnd: null }], now).status).toBe('none')
  })
  it('picks the longest-running entitled subscription', () => {
    const e = computeEntitlement(
      [
        { id: 1, status: 'active', currentPeriodEnd: '2026-06-10T00:00:00Z', plan: { code: 'monthly' } },
        { id: 2, status: 'active', currentPeriodEnd: '2027-06-01T00:00:00Z', plan: { code: 'yearly' } },
      ],
      now,
    )
    expect(e.planCode).toBe('yearly')
  })
})
