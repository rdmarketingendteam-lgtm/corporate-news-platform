import type { Metadata } from 'next'
import { GmailOtpAuth } from '../../components/GmailOtpAuth'

export const metadata: Metadata = {
  title: 'Sign In with Gmail OTP - Newspaper Pro',
  description: 'Secure Gmail OTP login and verification for Newspaper Pro contributors and backlink management.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const nextUrl = sp.next || '/account'

  return (
    <main style={{ backgroundColor: '#f8fafc', minHeight: '80vh', padding: '60px 16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <GmailOtpAuth nextUrl={nextUrl} />
      </div>
    </main>
  )
}
