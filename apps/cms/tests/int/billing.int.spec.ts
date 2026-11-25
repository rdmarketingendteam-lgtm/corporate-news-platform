import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { billingEndpoints } from '../../src/billing/endpoints'
import { createRazorpayProvider } from '../../src/billing/razorpay'
import { setProviderOverrides } from '../../src/billing/registry'
import { hmacSha256Hex } from '../../src/billing/signatures'
import { createStripeProvider } from '../../src/billing/stripe'
import { bootPayload, endpointReq } from './helpers'

const STRIPE_WH = 'whsec_int'
const RZP_WH = 'rzp_wh_int'
const endpoint = (path: string) => billingEndpoints.find((e) => e.path === path)!

let payload: Payload
let reader: any
const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400

// --- fake provider APIs -------------------------------------------------------
const stripeSubs = new Map<string, any>()
const stripeFetch = vi.fn(async (url: string, init: any) => {
  const u = new URL(url)
  if (u.pathname === '/v1/checkout/sessions') return Response.json({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' })
  const m = u.pathname.match(/^\/v1\/subscriptions\/(.+)$/)
  if (m) {
    const sub = stripeSubs.get(decodeURIComponent(m[1]!))
    if (!sub) return Response.json({ error: { message: 'No such subscription' } }, { status: 404 })
    if (init?.method === 'POST') sub.cancel_at_period_end = new URLSearchParams(init.body).get('cancel_at_period_end') === 'true'
    return Response.json(sub)
  }
  return Response.json({ error: { message: 'unexpected' } }, { status: 400 })
})

const rzpSubs = new Map<string, any>()
const rzpFetch = vi.fn(async (url: string, init: any) => {
  const u = new URL(url)
  if (u.pathname === '/v1/subscriptions' && init.method === 'POST') {
    const body = JSON.parse(init.body)
    const sub = { id: 'sub_RZP1', status: 'created', plan_id: body.plan_id, notes: body.notes, short_url: 'https://rzp.test/i/abc' }
    rzpSubs.set(sub.id, sub)
    return Response.json(sub)
  }
  const m = u.pathname.match(/^\/v1\/subscriptions\/([^/]+)(\/cancel)?$/)
  if (m) return Response.json(rzpSubs.get(m[1]!))
  return Response.json({}, { status: 400 })
})

const stripeWebhook = async (event: object) => {
  const raw = JSON.stringify(event)
  const t = Math.floor(Date.now() / 1000)
  const req = await endpointReq(payload, {
    url: 'http://cms.test/api/billing/webhooks/stripe',
    method: 'POST',
    body: raw,
    routeParams: { provider: 'stripe' },
    headers: { 'stripe-signature': `t=${t},v1=${hmacSha256Hex(STRIPE_WH, `${t}.${raw}`)}` },
  })
  return endpoint('/billing/webhooks/:provider').handler(req)
}

const readerUser = async () => ({ ...(await payload.findByID({ collection: 'readers', id: reader.id })), collection: 'readers' })

beforeAll(async () => {
  payload = await bootPayload()
  setProviderOverrides({
    stripe: createStripeProvider({ secretKey: 'sk_test', webhookSecret: STRIPE_WH }, stripeFetch as any),
    razorpay: createRazorpayProvider({ keyId: 'rzp_k', keySecret: 'rzp_s', webhookSecret: RZP_WH }, rzpFetch as any),
  })
  await payload.create({
    collection: 'plans',
    data: { name: 'Digital Monthly', code: 'digital-monthly', priceMinor: 19900, currency: 'INR', interval: 'month', adFree: true, stripePriceId: 'price_M', razorpayPlanId: 'plan_M' },
  })
  reader = await payload.create({ collection: 'readers', data: { email: 'pay@reader.test', password: 'Passw0rd!Passw0rd' } as any })
})

afterAll(async () => {
  setProviderOverrides({})
  await payload?.destroy()
})

describe('billing', () => {
  it('lists configured providers', async () => {
    const res = await endpoint('/billing/providers').handler(await endpointReq(payload, { url: 'http://cms.test/api/billing/providers' }))
    expect((await res.json()).providers.sort()).toEqual(['razorpay', 'stripe'])
  })

  it('requires a signed-in reader for checkout', async () => {
    const res = await endpoint('/billing/checkout').handler(
      await endpointReq(payload, { url: 'http://cms.test/api/billing/checkout', method: 'POST', body: JSON.stringify({ plan: 'digital-monthly' }) }),
    )
    expect(res.status).toBe(401)
  })

  it('creates a Stripe hosted checkout', async () => {
    const res = await endpoint('/billing/checkout').handler(
      await endpointReq(payload, {
        url: 'http://cms.test/api/billing/checkout',
        method: 'POST',
        user: await readerUser(),
        body: JSON.stringify({ plan: 'digital-monthly', provider: 'stripe' }),
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ url: 'https://checkout.stripe.test/cs_1', provider: 'stripe' })
  })

  it('rejects webhooks with a bad signature', async () => {
    const req = await endpointReq(payload, {
      url: 'http://cms.test/api/billing/webhooks/stripe',
      method: 'POST',
      body: '{"id":"evt_x"}',
      routeParams: { provider: 'stripe' },
      headers: { 'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=${'a'.repeat(64)}` },
    })
    expect((await endpoint('/billing/webhooks/:provider').handler(req)).status).toBe(400)
  })

  it('activates the subscription from a signed webhook and grants entitlement', async () => {
    stripeSubs.set('sub_S1', {
      id: 'sub_S1',
      object: 'subscription',
      status: 'active',
      customer: 'cus_1',
      cancel_at_period_end: false,
      metadata: { readerId: String(reader.id), planCode: 'digital-monthly' },
      items: { data: [{ current_period_end: periodEnd, price: { id: 'price_M' } }] },
    })
    // event payload deliberately stale ("incomplete") — handler must re-fetch the live object
    const res = await stripeWebhook({
      id: 'evt_1',
      type: 'customer.subscription.created',
      data: { object: { object: 'subscription', id: 'sub_S1', status: 'incomplete' } },
    })
    expect(res.status).toBe(200)

    const r = await readerUser()
    expect(r.entitlement).toMatchObject({ status: 'active', planCode: 'digital-monthly', adFree: true })
    const subs = await payload.find({ collection: 'subscriptions', where: { providerSubscriptionId: { equals: 'sub_S1' } } })
    expect(subs.docs[0]).toMatchObject({ status: 'active', provider: 'stripe', providerCustomerId: 'cus_1' })
  })

  it('is idempotent for repeated deliveries', async () => {
    const calls = stripeFetch.mock.calls.length
    const res = await stripeWebhook({ id: 'evt_1', type: 'customer.subscription.created', data: { object: { object: 'subscription', id: 'sub_S1' } } })
    expect(await res.json()).toMatchObject({ duplicate: true })
    expect(stripeFetch.mock.calls.length).toBe(calls)
  })

  it('blocks a second checkout while a subscription is active', async () => {
    const res = await endpoint('/billing/checkout').handler(
      await endpointReq(payload, {
        url: 'http://cms.test/api/billing/checkout',
        method: 'POST',
        user: await readerUser(),
        body: JSON.stringify({ plan: 'digital-monthly', provider: 'stripe' }),
      }),
    )
    expect(res.status).toBe(409)
  })

  it('readers see only their own subscriptions', async () => {
    const other = await payload.create({ collection: 'readers', data: { email: 'other@reader.test', password: 'Passw0rd!Passw0rd' } as any })
    const theirs = await payload.find({ collection: 'subscriptions', user: { ...other, collection: 'readers' }, overrideAccess: false })
    expect(theirs.totalDocs).toBe(0)
    const mine = await payload.find({ collection: 'subscriptions', user: await readerUser(), overrideAccess: false })
    expect(mine.totalDocs).toBe(1)
  })

  it('cancels at period end, keeping access until then', async () => {
    const sub = (await payload.find({ collection: 'subscriptions', where: { providerSubscriptionId: { equals: 'sub_S1' } } })).docs[0]!
    const res = await endpoint('/billing/cancel').handler(
      await endpointReq(payload, {
        url: 'http://cms.test/api/billing/cancel',
        method: 'POST',
        user: await readerUser(),
        body: JSON.stringify({ subscription: sub.id }),
      }),
    )
    expect(res.status).toBe(200)
    const r = await readerUser()
    expect(r.entitlement?.status).toBe('active')
    expect(new Date(r.entitlement!.activeUntil!).getTime()).toBe(periodEnd * 1000) // no renewal grace once cancelled
  })

  it('revokes entitlement when the provider reports the subscription ended', async () => {
    stripeSubs.get('sub_S1').status = 'canceled'
    await stripeWebhook({ id: 'evt_2', type: 'customer.subscription.deleted', data: { object: { object: 'subscription', id: 'sub_S1' } } })
    expect((await readerUser()).entitlement?.status).toBe('none')
  })

  it('runs the Razorpay flow: hosted link → signed webhook → active', async () => {
    const res = await endpoint('/billing/checkout').handler(
      await endpointReq(payload, {
        url: 'http://cms.test/api/billing/checkout',
        method: 'POST',
        user: await readerUser(),
        body: JSON.stringify({ plan: 'digital-monthly', provider: 'razorpay' }),
      }),
    )
    expect(await res.json()).toMatchObject({ url: 'https://rzp.test/i/abc', provider: 'razorpay' })
    let pending = await payload.find({ collection: 'subscriptions', where: { providerSubscriptionId: { equals: 'sub_RZP1' } } })
    expect(pending.docs[0]?.status).toBe('incomplete')

    Object.assign(rzpSubs.get('sub_RZP1'), { status: 'active', current_end: periodEnd, customer_id: 'cust_9' })
    const raw = JSON.stringify({ event: 'subscription.activated', payload: { subscription: { entity: { id: 'sub_RZP1' } } } })
    const hook = await endpoint('/billing/webhooks/:provider').handler(
      await endpointReq(payload, {
        url: 'http://cms.test/api/billing/webhooks/razorpay',
        method: 'POST',
        body: raw,
        routeParams: { provider: 'razorpay' },
        headers: { 'x-razorpay-signature': hmacSha256Hex(RZP_WH, raw), 'x-razorpay-event-id': 'evt_rzp_1' },
      }),
    )
    expect(hook.status).toBe(200)
    pending = await payload.find({ collection: 'subscriptions', where: { providerSubscriptionId: { equals: 'sub_RZP1' } } })
    expect(pending.docs[0]).toMatchObject({ status: 'active', providerCustomerId: 'cust_9' })
    expect((await readerUser()).entitlement?.status).toBe('active')
  })
})
