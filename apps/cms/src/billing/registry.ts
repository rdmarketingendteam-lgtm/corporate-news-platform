import { createRazorpayProvider } from './razorpay'
import { createStripeProvider } from './stripe'
import { PROVIDERS, type PaymentProvider, type ProviderName } from './types'

let overrides: Partial<Record<ProviderName, PaymentProvider>> = {}

/** Test hook: swap real providers for fakes. */
export function setProviderOverrides(next: Partial<Record<ProviderName, PaymentProvider>>) {
  overrides = next
}

export function getProvider(name: ProviderName): PaymentProvider {
  if (overrides[name]) return overrides[name]!
  return name === 'stripe' ? createStripeProvider() : createRazorpayProvider()
}

/** Providers with credentials present, in preference order (PAYMENT_DEFAULT_PROVIDER first). */
export function enabledProviders(): ProviderName[] {
  const preferred = process.env.PAYMENT_DEFAULT_PROVIDER as ProviderName | undefined
  const enabled = PROVIDERS.filter((p) => getProvider(p).isConfigured())
  return preferred && enabled.includes(preferred) ? [preferred, ...enabled.filter((p) => p !== preferred)] : enabled
}

export const isProviderName = (v: unknown): v is ProviderName =>
  typeof v === 'string' && (PROVIDERS as readonly string[]).includes(v)
