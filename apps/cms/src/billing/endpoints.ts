import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { isReader } from '../access/roles'
import { writeAudit } from '../lib/audit'
import { enabledProviders, getProvider, isProviderName } from './registry'
import { upsertSubscription } from './sync'
import { ProviderError, WebhookSignatureError, type PlanLike, type ProviderName } from './types'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

const webUrl = (path: string) => new URL(path, process.env.WEB_URL || 'http://localhost:3000').toString()

/** GET /api/billing/providers — which payment providers are configured (for the subscribe page). */
const providersEndpoint: Endpoint = {
  path: '/billing/providers',
  method: 'get',
  handler: async () => {
    const providers = enabledProviders()
    return json({ providers, default: providers[0] ?? null })
  },
}

/** POST /api/billing/checkout { plan: code, provider? } — reader-authenticated; returns a hosted checkout URL. */
const checkoutEndpoint: Endpoint = {
  path: '/billing/checkout',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!isReader(req.user)) return json({ error: 'Sign in to subscribe.' }, 401)
    await addDataAndFileToRequest(req)
    const body = (req.data ?? {}) as { plan?: string; provider?: string }

    const enabled = enabledProviders()
    const providerName: ProviderName | undefined = isProviderName(body.provider) ? body.provider : enabled[0]
    if (!providerName || !enabled.includes(providerName)) return json({ error: 'Payment provider unavailable.' }, 400)
    if (typeof body.plan !== 'string') return json({ error: 'Choose a plan.' }, 400)

    const { docs } = await req.payload.find({
      collection: 'plans',
      where: { and: [{ code: { equals: body.plan } }, { active: { equals: true } }] },
      limit: 1,
      overrideAccess: true,
      req,
    })
    const plan = docs[0] as unknown as PlanLike | undefined
    if (!plan) return json({ error: 'Unknown plan.' }, 400)

    const reader = req.user as unknown as { id: number | string; email: string }

    // Reuse an existing Stripe customer so readers don't get duplicates.
    const prior = await req.payload.find({
      collection: 'subscriptions',
      where: { and: [{ reader: { equals: reader.id } }, { provider: { equals: providerName } }] },
      sort: '-createdAt',
      limit: 1,
      overrideAccess: true,
      req,
    })
    const priorSub = prior.docs[0] as any
    if (priorSub && ['active', 'trialing', 'past_due'].includes(priorSub.status)) {
      return json({ error: 'You already have an active subscription. Manage it from your account page.' }, 409)
    }

    try {
      const provider = getProvider(providerName)
      const result = await provider.createCheckout({
        plan,
        reader,
        successUrl: webUrl('/account?checkout=success'),
        cancelUrl: webUrl('/subscribe?checkout=cancelled'),
        existingCustomerId: priorSub?.providerCustomerId ?? null,
      })
      if (result.pending) {
        await upsertSubscription(req.payload, { ...result.pending, readerId: String(reader.id) }, req)
      }
      return json({ url: result.url, provider: providerName })
    } catch (err) {
      req.payload.logger.error({ err }, 'checkout failed')
      const message = err instanceof ProviderError ? err.message : 'Checkout could not be started.'
      return json({ error: message }, 502)
    }
  },
}

/** POST /api/billing/cancel { subscription: id } — cancels at period end with the provider. */
const cancelEndpoint: Endpoint = {
  path: '/billing/cancel',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!isReader(req.user)) return json({ error: 'Sign in first.' }, 401)
    await addDataAndFileToRequest(req)
    const id = (req.data as { subscription?: string | number } | undefined)?.subscription
    if (id === undefined) return json({ error: 'Missing subscription.' }, 400)

    const sub = (await req.payload
      .findByID({ collection: 'subscriptions', id, depth: 0, overrideAccess: true, req })
      .catch(() => null)) as any
    const ownerId = sub && (typeof sub.reader === 'object' ? sub.reader.id : sub.reader)
    if (!sub || String(ownerId) !== String(req.user.id)) return json({ error: 'Not found.' }, 404)
    if (!['active', 'trialing', 'past_due'].includes(sub.status)) return json({ error: 'Subscription is not active.' }, 409)

    try {
      const updated = await getProvider(sub.provider).cancelAtPeriodEnd(sub.providerSubscriptionId)
      const { entitlement } = await upsertSubscription(
        req.payload,
        { ...updated, cancelAtPeriodEnd: true, readerId: String(ownerId) },
        req,
      )
      return json({ ok: true, entitlement })
    } catch (err) {
      req.payload.logger.error({ err }, 'cancel failed')
      return json({ error: 'Could not cancel right now. Please try again or contact support.' }, 502)
    }
  },
}

/**
 * POST /api/billing/webhooks/:provider
 * 1. verify signature over the raw body  2. de-duplicate by provider event id
 * 3. re-fetch the subscription from the provider (never trust event ordering) 4. upsert + recompute entitlement
 * Returns 5xx on processing failure so the provider retries.
 */
const webhookEndpoint: Endpoint = {
  path: '/billing/webhooks/:provider',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const providerName = req.routeParams?.provider
    if (!isProviderName(providerName)) return json({ error: 'Unknown provider' }, 404)
    const provider = getProvider(providerName)
    if (!provider.isConfigured()) return json({ error: 'Provider not configured' }, 404)

    const rawBody = req.text ? await req.text() : ''
    let event
    try {
      event = provider.parseWebhook(rawBody, req.headers)
    } catch (err) {
      if (err instanceof WebhookSignatureError) return json({ error: 'Invalid signature' }, 400)
      return json({ error: 'Malformed payload' }, 400)
    }

    const key = `${providerName}:${event.id}`
    const seen = await req.payload.find({
      collection: 'payment-events',
      where: { key: { equals: key } },
      limit: 1,
      overrideAccess: true,
      req,
    })
    let record = seen.docs[0] as any
    if (record?.processedAt) return json({ received: true, duplicate: true })
    if (!record) {
      try {
        record = await req.payload.create({
          collection: 'payment-events',
          data: { key, provider: providerName, eventType: event.type, subscriptionId: event.subscriptionId ?? undefined },
          overrideAccess: true,
          req,
        })
      } catch {
        // concurrent delivery of the same event — the other request is handling it
        return json({ received: true, duplicate: true })
      }
    }

    try {
      if (event.subscriptionId) {
        const sub = await provider.fetchSubscription(event.subscriptionId)
        const { subscription } = await upsertSubscription(req.payload, sub, req)
        await writeAudit(req, {
          action: `subscription.${sub.status}`,
          entityType: 'subscriptions',
          entityId: String(subscription.id),
          actorLabel: `webhook:${providerName}`,
          metadata: { event: event.type, eventId: event.id },
        })
      }
      await req.payload.update({
        collection: 'payment-events',
        id: record.id,
        data: { processedAt: new Date().toISOString(), error: null },
        overrideAccess: true,
        req,
      })
      return json({ received: true })
    } catch (err) {
      req.payload.logger.error({ err, key }, 'webhook processing failed')
      await req.payload
        .update({
          collection: 'payment-events',
          id: record.id,
          data: { error: err instanceof Error ? err.message.slice(0, 500) : 'unknown error' },
          overrideAccess: true,
        })
        .catch(() => undefined)
      return json({ error: 'Processing failed' }, 500)
    }
  },
}

export const billingEndpoints: Endpoint[] = [providersEndpoint, checkoutEndpoint, cancelEndpoint, webhookEndpoint]
