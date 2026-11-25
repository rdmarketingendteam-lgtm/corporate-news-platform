import type { Metadata } from 'next'

import { site } from '../../lib/site'

export const metadata: Metadata = { title: 'Privacy policy' }

// PLACEHOLDER: replace with the policy approved by your legal counsel before launch.
export default function PrivacyPage() {
  return (
    <main className="site-shell narrow prose">
      <h1 className="listing-title">Privacy policy</h1>
      <p className="alert alert-error">Placeholder — publish your lawyer-approved privacy policy here before launch.</p>
      <h2>What this site stores</h2>
      <ul>
        <li>
          <strong>Essential cookies</strong>: your sign-in session and your cookie choice.
        </li>
        <li>
          <strong>Advertising (only with your consent)</strong>: {site.name} uses Google Ad Manager. If you choose &ldquo;Essential only&rdquo;, ads are
          requested as non-personalised.
        </li>
        <li>
          <strong>Payments</strong>: handled by Razorpay or Stripe on their own secure pages. We store only the subscription status, plan and renewal
          date — never card or bank details.
        </li>
      </ul>
    </main>
  )
}
