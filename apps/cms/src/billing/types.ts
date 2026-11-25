export const PROVIDERS = ['stripe', 'razorpay'] as const
export type ProviderName = (typeof PROVIDERS)[number]

/** Our provider-neutral subscription statuses. */
export const SUBSCRIPTION_STATUSES = [
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired',
] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** Statuses that grant access while the current period hasn't ended. */
export const ENTITLED_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export type NormalizedSubscription = {
  provider: ProviderName
  providerSubscriptionId: string
  providerCustomerId?: string | null
  status: SubscriptionStatus
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd: boolean
  readerId?: string | null
  /** Provider-side identifier of the plan/price, used to map back to our `plans` collection. */
  providerPlanId?: string | null
  planCode?: string | null
}

export type PlanLike = {
  id: number | string
  code: string
  name: string
  interval: 'month' | 'year'
  stripePriceId?: string | null
  razorpayPlanId?: string | null
  razorpayTotalCount?: number | null
}

export type CheckoutInput = {
  plan: PlanLike
  reader: { id: number | string; email: string }
  successUrl: string
  cancelUrl: string
  existingCustomerId?: string | null
}

export type CheckoutResult = {
  url: string
  /** Set when the provider creates the subscription up-front (Razorpay). */
  pending?: NormalizedSubscription
}

export type WebhookEvent = {
  id: string
  type: string
  /** Subscription the event concerns, if any. */
  subscriptionId: string | null
}

export interface PaymentProvider {
  name: ProviderName
  isConfigured(): boolean
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  /** Verify signature over the raw body and parse. Throws WebhookSignatureError when invalid. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent
  fetchSubscription(id: string): Promise<NormalizedSubscription>
  cancelAtPeriodEnd(id: string): Promise<NormalizedSubscription>
}

export class WebhookSignatureError extends Error {
  constructor(message = 'Invalid webhook signature') {
    super(message)
    this.name = 'WebhookSignatureError'
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
