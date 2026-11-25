import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } }

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams
  return (
    <main className="site-shell narrow">
      <h1 className="listing-title">Reset your password</h1>
      {sent ? (
        <p className="alert">If an account exists for that address, we&rsquo;ve emailed a reset link. It expires in one hour.</p>
      ) : (
        <form action="/api/auth/forgot" method="post" className="card-form">
          <label>
            Email <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="btn">Send reset link</button>
        </form>
      )}
    </main>
  )
}
