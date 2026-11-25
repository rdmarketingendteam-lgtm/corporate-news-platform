import type { Metadata } from 'next'

import { CMS_URL, getPlans } from '../../lib/cms'
import { formatPrice } from '../../lib/site'

export const metadata: Metadata = { title: 'Subscribe to PressPoint', description: 'Unlimited access to independent journalism.' }
export const revalidate = 3600

const PROVIDER_LABELS: Record<string, string> = {
  razorpay: 'UPI, Cards & Netbanking (Razorpay)',
  stripe: 'International Cards (Stripe)',
}

async function getProviders(): Promise<string[]> {
  try {
    const res = await fetch(new URL('/api/billing/providers', CMS_URL), { next: { revalidate: 3600, tags: ['plans'] } })
    return res.ok ? ((await res.json()) as { providers: string[] }).providers : ['razorpay', 'stripe']
  } catch {
    return ['razorpay']
  }
}

type Props = { searchParams: Promise<{ error?: string; checkout?: string }> }

export default async function SubscribePage({ searchParams }: Props) {
  const [{ error, checkout }, plans, providers] = await Promise.all([searchParams, getPlans(), getProviders()])

  return (
    <main>
      <section className="hero-area" style={{ padding: '40px 0 60px' }}>
        <div className="w-layout-blockcontainer container w-container" style={{ maxWidth: '880px' }}>
          <div className="hero-area-content-wrapper" style={{ textAlign: 'center', margin: '0 auto 40px' }}>
            <div className="rectangle" style={{ margin: '0 auto 12px' }}></div>
            <div className="div-block" style={{ justifyContent: 'center' }}>
              <h1 className="hero-title">Membership &amp;</h1>
              <h1 className="hero-title">Subscription</h1>
            </div>
            <p className="hero-subtext authors" style={{ maxWidth: '580px', margin: '14px auto 0' }}>
              Support trusted, independent reporting with unlimited digital access on any device. Cancel anytime.
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '14px 18px', borderRadius: '4px', marginBottom: '24px' }}>
              {error.slice(0, 200)}
            </div>
          )}
          {checkout === 'cancelled' && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '14px 18px', borderRadius: '4px', marginBottom: '24px' }}>
              Checkout was cancelled. You have not been charged.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
            {plans.map((p) => (
              <form
                key={p.id}
                action="/api/subscribe"
                method="post"
                style={{
                  background: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>{p.name}</h3>
                  <div style={{ fontSize: '36px', fontWeight: 800, margin: '16px 0 10px', color: '#000000' }}>
                    {formatPrice(p.priceMinor, p.currency)}{' '}
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>/ {p.interval}</span>
                  </div>
                  {p.description && <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '16px' }}>{p.description}</p>}

                  {!!p.features?.length && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '14px', lineHeight: 2 }}>
                      {p.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span> {f.text}
                        </li>
                      ))}
                      {p.adFree && (
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span> Ad-free reading experience
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div>
                  <input type="hidden" name="plan" value={p.code} />
                  {providers.length > 1 ? (
                    <fieldset style={{ border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: '4px', margin: '18px 0' }}>
                      <legend style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', padding: '0 4px' }}>
                        Payment Gateway
                      </legend>
                      {providers.map((prov, i) => (
                        <label key={prov} style={{ display: 'block', fontSize: '13px', margin: '4px 0', cursor: 'pointer' }}>
                          <input type="radio" name="provider" value={prov} defaultChecked={i === 0} style={{ marginRight: '6px' }} />
                          {PROVIDER_LABELS[prov] ?? prov}
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <input type="hidden" name="provider" value={providers[0]} />
                  )}

                  <button
                    type="submit"
                    className="header-btn header-btn-primary"
                    style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Select Plan →
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
