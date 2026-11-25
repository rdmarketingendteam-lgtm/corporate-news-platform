import type { Metadata } from 'next'
import { GmailOtpAuth } from '../../components/GmailOtpAuth'

export const metadata: Metadata = {
  title: 'Create Account with Gmail OTP - Newspaper Pro',
  description: 'Join Newspaper Pro as a verified contributor and unlock high-DA profile backlinks.',
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
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
