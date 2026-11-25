import type { Payload, PayloadRequest } from 'payload'

import { ENTITLED_STATUSES, type NormalizedSubscription, type SubscriptionStatus } from './types'

/** Extra access after the period end while a renewal charge/webhook is in flight. */
const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000

type SubRow = {
  id: number | string
  status: SubscriptionStatus
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean | null
  plan?: { code?: string; adFree?: boolean } | number | string | null
}

/** Pure: compute a reader's entitlement from all of their subscriptions. */
export function computeEntitlement(subs: SubRow[], now = new Date()) {
  let best: { status: SubscriptionStatus; activeUntil: Date; planCode: string | null; adFree: boolean } | null = null
  for (const s of subs) {
    if (!ENTITLED_STATUSES.includes(s.status) || !s.currentPeriodEnd) continue
    const end = new Date(s.currentPeriodEnd).getTime() + (s.cancelAtPeriodEnd ? 0 : RENEWAL_GRACE_MS)
    if (end <= now.getTime()) continue
    if (!best || end > best.activeUntil.getTime()) {
      const plan = typeof s.plan === 'object' && s.plan ? s.plan : null
      best = { status: s.status, activeUntil: new Date(end), planCode: plan?.code ?? null, adFree: Boolean(plan?.adFree) }
    }
  }
  return best
    ? { status: best.status, activeUntil: best.activeUntil.toISOString(), planCode: best.planCode, adFree: best.adFree }
    : { status: 'none' as const, activeUntil: null, planCode: null, adFree: false }
}

export async function recomputeEntitlement(payload: Payload, readerId: number | string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'subscriptions',
    where: { reader: { equals: readerId } },
    depth: 1,
    limit: 50,
    overrideAccess: true,
    req,
  })
  const entitlement = computeEntitlement(docs as unknown as SubRow[])
  await payload.update({
    collection: 'readers',
    id: readerId,
    data: { entitlement },
    overrideAccess: true,
    req,
  })
  return entitlement
}

/** Insert or update our copy of a provider subscription, then refresh the reader's entitlement. */
export async function upsertSubscription(payload: Payload, sub: NormalizedSubscription, req?: PayloadRequest) {
  const existing = await payload.find({
    collection: 'subscriptions',
    where: { providerSubscriptionId: { equals: sub.providerSubscriptionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const current = existing.docs[0] as any

  const readerId = sub.readerId ?? (current ? String(typeof current.reader === 'object' ? current.reader.id : current.reader) : null)
  if (!readerId) throw new Error(`Cannot map ${sub.provider} subscription ${sub.providerSubscriptionId} to a reader`)

  const planField = sub.provider === 'stripe' ? 'stripePriceId' : 'razorpayPlanId'
  const planWhere = sub.providerPlanId
    ? { [planField]: { equals: sub.providerPlanId } }
    : sub.planCode
      ? { code: { equals: sub.planCode } }
      : null
  const plan = planWhere
    ? (await payload.find({ collection: 'plans', where: planWhere, limit: 1, depth: 0, overrideAccess: true, req })).docs[0]
    : undefined

  const data = {
    reader: Number.isNaN(Number(readerId)) ? readerId : Number(readerId),
    plan: plan?.id ?? current?.plan ?? undefined,
    provider: sub.provider,
    providerSubscriptionId: sub.providerSubscriptionId,
    providerCustomerId: sub.providerCustomerId ?? current?.providerCustomerId ?? undefined,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : (current?.currentPeriodEnd ?? null),
    // Razorpay doesn't echo cancel_at_cycle_end; keep our local flag once set.
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd || Boolean(current?.cancelAtPeriodEnd && sub.provider === 'razorpay'),
    lastSyncedAt: new Date().toISOString(),
  }

  const saved = current
    ? await payload.update({ collection: 'subscriptions', id: current.id, data: data as any, overrideAccess: true, req })
    : await payload.create({ collection: 'subscriptions', data: data as any, overrideAccess: true, req })

  const entitlement = await recomputeEntitlement(payload, data.reader, req)
  return { subscription: saved, entitlement }
}

