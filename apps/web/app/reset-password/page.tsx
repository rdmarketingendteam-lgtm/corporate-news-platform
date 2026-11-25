import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false }, referrer: 'no-referrer' }

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = '', error } = await searchParams
  return (
    <main className="site-shell narrow">
      <h1 className="listing-title">Choose a new password</h1>
      {error && <p className="alert alert-error">{error.slice(0, 200)}</p>}
      {token ? (
        <form action="/api/auth/reset" method="post" className="card-form">
          <input type="hidden" name="token" value={token} />
          <label>
            New password <input name="password" type="password" autoComplete="new-password" minLength={10} required />
          </label>
          <button className="btn">Save password</button>
        </form>
      ) : (
        <p>
          This link is incomplete. <a href="/forgot-password">Request a new one.</a>
        </p>
      )}
    </main>
  )
}
