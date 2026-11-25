import type { Metadata } from 'next'
import { getCurrentUser } from '../../lib/session'
import { AccountClientView } from '../../components/AccountClientView'

export const metadata: Metadata = {
  title: 'Contributor & Backlink Dashboard - Newspaper Pro',
  description: 'Manage your profile backlinks, guest forum articles, and contributor privileges.',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await getCurrentUser()

  return (
    <main style={{ backgroundColor: '#f8fafc', minHeight: '85vh', padding: '40px 0 60px 0' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="td-crumb-container" style={{ marginBottom: '24px' }}>
          <a href="/">Home</a>
          <span className="td-crumb-sep">›</span>
          <span style={{ color: '#999999' }}>Contributor Portal &amp; Backlink Dashboard</span>
        </nav>

        <AccountClientView initialUser={user} />
      </div>
    </main>
  )
}
