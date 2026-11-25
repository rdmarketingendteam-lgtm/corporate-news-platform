'use client'

import React, { useState, useEffect } from 'react'

interface BacklinkItem {
  id: string
  website_title: string
  website_url: string
  anchor_text: string
  category: string
  status: 'pending_admin_approval' | 'approved' | 'rejected'
  created_at: string
  admin_notes?: string
}

interface ForumPostItem {
  id: string
  title: string
  content: string
  target_url: string
  anchor_text: string
  category: string
  category_name?: string
  is_custom_category?: boolean
  image_url?: string
  live_url?: string
  live_slug?: string
  post_type?: 'guest_post' | 'forum_thread'
  status: 'pending_admin_approval' | 'approved' | 'rejected'
  created_at: string
  admin_notes?: string
}

export function BacklinkDashboard({ email }: { email: string }) {
  const [activeTab, setActiveTab] = useState<'backlinks' | 'guest_posts' | 'forum'>('guest_posts')

  // 1. Profile Backlink Form State
  const [websiteTitle, setWebsiteTitle] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [anchorText, setAnchorText] = useState('')
  const [category, setCategory] = useState('technology')
  const [description, setDescription] = useState('')

  // 2. Guest Post Form State
  const [guestTitle, setGuestTitle] = useState('')
  const [guestContent, setGuestContent] = useState('')
  const [guestUrl, setGuestUrl] = useState('')
  const [guestAnchor, setGuestAnchor] = useState('')
  const [guestCategory, setGuestCategory] = useState('technology')
  const [customCategory, setCustomCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // 3. Forum Backlink Form State
  const [forumThreadTitle, setForumThreadTitle] = useState('')
  const [forumThreadContent, setForumThreadContent] = useState('')
  const [forumTargetUrl, setForumTargetUrl] = useState('')
  const [forumAnchorText, setForumAnchorText] = useState('')
  const [forumChannel, setForumChannel] = useState('tech-discussions')

  // Submissions State
  const [backlinksList, setBacklinksList] = useState<BacklinkItem[]>([])
  const [rawPostsList, setRawPostsList] = useState<ForumPostItem[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUserSubmissions()
  }, [email])

  async function loadUserSubmissions() {
    try {
      const [resBl, resFp] = await Promise.all([
        fetch(`/api/backlinks/user?email=${encodeURIComponent(email)}`).catch(() => null),
        fetch(`/api/forum/user?email=${encodeURIComponent(email)}`).catch(() => null)
      ])
      if (resBl?.ok) {
        setBacklinksList(await resBl.json())
      }
      if (resFp?.ok) {
        setRawPostsList(await resFp.json())
      }
    } catch {
      // Ignore background fetch error
    }
  }

  // Filter guest posts vs forum threads
  const guestPostsList = rawPostsList.filter(item => item.post_type !== 'forum_thread')
  const forumThreadsList = rawPostsList.filter(item => item.post_type === 'forum_thread')

  // Guest Post Status Counts
  const approvedGuestCount = guestPostsList.filter(p => p.status === 'approved').length
  const pendingGuestCount = guestPostsList.filter(p => p.status === 'pending_admin_approval').length
  const rejectedGuestCount = guestPostsList.filter(p => p.status === 'rejected').length

  // Profile Backlink Status Counts
  const approvedBacklinkCount = backlinksList.filter(b => b.status === 'approved').length
  const pendingBacklinkCount = backlinksList.filter(b => b.status === 'pending_admin_approval').length

  // Profile Backlink Submit Handler
  async function handleBacklinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      setMsg({ type: 'error', text: 'Target Website URL must start with http:// or https://' })
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch('/api/backlinks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          website_title: websiteTitle,
          website_url: websiteUrl,
          anchor_text: anchorText,
          category,
          description
        })
      })

      const data = await res.json()
      if (res.ok) {
        setMsg({
          type: 'success',
          text: '✓ Profile Backlink submitted successfully! Placed in Editorial Queue for Admin verification.'
        })
        setWebsiteTitle('')
        setWebsiteUrl('')
        setAnchorText('')
        setDescription('')
        loadUserSubmissions()
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to submit profile backlink.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network communication error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Guest Post Submit Handler
  async function handleGuestPostSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (guestContent.trim().length < 100) {
      setMsg({ type: 'error', text: 'Guest article body must be at least 100 characters to meet editorial standards.' })
      return
    }

    if (!guestUrl.startsWith('http://') && !guestUrl.startsWith('https://')) {
      setMsg({ type: 'error', text: 'Backlink Target URL must start with http:// or https://' })
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      const selectedCategorySlug = guestCategory === 'custom'
        ? (customCategory.trim() || 'Custom')
        : guestCategory

      const res = await fetch('/api/forum/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          title: guestTitle,
          content: guestContent,
          target_url: guestUrl,
          anchor_text: guestAnchor,
          category: selectedCategorySlug,
          custom_category: guestCategory === 'custom' ? customCategory.trim() : undefined,
          image_url: imageUrl.trim() || undefined,
          post_type: 'guest_post'
        })
      })

      const data = await res.json()
      if (res.ok) {
        setMsg({
          type: 'success',
          text: `✓ Guest Post "${guestTitle}" submitted successfully! Status is now PENDING ADMIN APPROVAL.`
        })
        setGuestTitle('')
        setGuestContent('')
        setGuestUrl('')
        setGuestAnchor('')
        setCustomCategory('')
        setImageUrl('')
        loadUserSubmissions()
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to submit guest post.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Forum Backlink Submit Handler
  async function handleForumThreadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (forumThreadContent.trim().length < 30) {
      setMsg({ type: 'error', text: 'Forum thread message must be at least 30 characters.' })
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch('/api/forum/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          title: forumThreadTitle,
          content: forumThreadContent,
          target_url: forumTargetUrl,
          anchor_text: forumAnchorText,
          category: forumChannel,
          post_type: 'forum_thread'
        })
      })

      const data = await res.json()
      if (res.ok) {
        setMsg({
          type: 'success',
          text: `✓ Community Forum discussion thread posted successfully!`
        })
        setForumThreadTitle('')
        setForumThreadContent('')
        setForumTargetUrl('')
        setForumAnchorText('')
        loadUserSubmissions()
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to post forum thread.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 16px' }}>
      {/* 1. TOP USER PROFILE & LOGGED IN HEADER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 800
          }}>
            {email.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {email.split('@')[0].replace('.', ' ').toUpperCase()}
              </h2>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fa-solid fa-circle-check"></i> Verified Member
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Logged in as: <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{email}</strong> &bull; Contributor Access: <strong>Full Publishing Rights</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={loadUserSubmissions}
            style={{
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#f8fafc',
              color: '#0284c7',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-rotate-right"></i> Refresh Status
          </button>
          <a
            href="/api/auth/logout"
            onClick={() => {
              try {
                localStorage.removeItem('contributor_user')
                localStorage.removeItem('contributor_token')
                document.cookie = 'newspaper_user=; path=/; max-age=0'
                document.cookie = 'reader_token=; path=/; max-age=0'
              } catch {}
            }}
            style={{
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              textTransform: 'uppercase',
              textDecoration: 'none'
            }}
          >
            Sign Out
          </a>
        </div>
      </div>

      {/* 2. STATS KPI BAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {/* KPI 1 */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Profile Creation Backlinks
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {backlinksList.length}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
            {approvedBacklinkCount} Approved &bull; {pendingBacklinkCount} Pending
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Guest Post Articles
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {guestPostsList.length}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
            {approvedGuestCount} Live Approved &bull; {pendingGuestCount} In Review
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Forum Backlinks
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {forumThreadsList.length}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>
            Community Discussion Backlinks
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION (3 DISTINCT TABS) */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        background: '#ffffff',
        borderRadius: '6px 6px 0 0',
        padding: '0 8px',
        overflowX: 'auto'
      }}>
        {/* TAB 1 */}
        <button
          onClick={() => { setActiveTab('backlinks'); setMsg(null) }}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: 'none',
            borderBottom: activeTab === 'backlinks' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'backlinks' ? '#0284c7' : '#64748b',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-link" style={{ color: activeTab === 'backlinks' ? '#0284c7' : '#94a3b8' }}></i>
          Profile Creation Backlink ({backlinksList.length})
        </button>

        {/* TAB 2 */}
        <button
          onClick={() => { setActiveTab('guest_posts'); setMsg(null) }}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: 'none',
            borderBottom: activeTab === 'guest_posts' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'guest_posts' ? '#059669' : '#64748b',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-feather-pointed" style={{ color: activeTab === 'guest_posts' ? '#10b981' : '#94a3b8' }}></i>
          Guest Posting ({guestPostsList.length})
        </button>

        {/* TAB 3 */}
        <button
          onClick={() => { setActiveTab('forum'); setMsg(null) }}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: 'none',
            borderBottom: activeTab === 'forum' ? '3px solid #8b5cf6' : '3px solid transparent',
            color: activeTab === 'forum' ? '#7c3aed' : '#64748b',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-comments" style={{ color: activeTab === 'forum' ? '#8b5cf6' : '#94a3b8' }}></i>
          Forum Backlink ({forumThreadsList.length})
        </button>
      </div>

      {/* FEEDBACK ALERT */}
      {msg && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '24px',
          background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fecaca'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>{msg.text}</div>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>×</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: PROFILE CREATION BACKLINK */}
      {/* ============================================================== */}
      {activeTab === 'backlinks' && (
        <div>
          {/* Submission Form Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', marginBottom: '28px' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Create Profile &amp; Directory Backlink
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Submit your target website link to receive a permanent, do-follow profile citation on Newspaper Pro.
              </p>
            </div>

            <form onSubmit={handleBacklinkSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Website / Brand Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech Solutions"
                    value={websiteTitle}
                    onChange={(e) => setWebsiteTitle(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Target Website URL <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Exact Anchor Text <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Best Enterprise Software"
                    value={anchorText}
                    onChange={(e) => setAnchorText(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Industry / Niche Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="technology">Technology &amp; Software</option>
                    <option value="business">Business &amp; Finance</option>
                    <option value="marketing">Digital Marketing &amp; SEO</option>
                    <option value="health">Health &amp; Wellness</option>
                    <option value="lifestyle">Lifestyle &amp; Travel</option>
                    <option value="general">General Industry</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                  Brand Description / Author Profile Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Short 2-3 sentence overview of your brand or author bio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Profile Backlink for Approval →'}
              </button>
            </form>
          </div>

          {/* Submitted Profile Backlinks Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                Your Submitted Profile Backlinks ({backlinksList.length})
              </h4>
            </div>

            {backlinksList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No profile backlinks submitted yet. Submit your first backlink above!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 16px' }}>Target Website</th>
                      <th style={{ padding: '12px 16px' }}>Anchor Text</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>Approval Status</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backlinksList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.website_title}</div>
                          <a href={item.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'underline' }}>
                            {item.website_url} <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '9px' }}></i>
                          </a>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                          &ldquo;{item.anchor_text}&rdquo;
                        </td>
                        <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: '#64748b' }}>
                          {item.category}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {item.status === 'approved' ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 10px', fontSize: '11px', fontWeight: 800, borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-circle-check"></i> APPROVED &amp; LIVE
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 10px', fontSize: '11px', fontWeight: 800, borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-circle-xmark"></i> REJECTED
                            </span>
                          ) : (
                            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '4px 10px', fontSize: '11px', fontWeight: 800, borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-clock"></i> PENDING ADMIN APPROVAL
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '11px' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GUEST POSTING (PROFESSIONAL STATUS & APPROVAL SYSTEM) */}
      {/* ============================================================== */}
      {activeTab === 'guest_posts' && (
        <div>
          {/* Guest Post Status Guidance Card */}
          <div style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ background: '#34d399', color: '#064e3b', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  EDITORIAL GUEST POSTING DESK
                </span>
                <h3 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, margin: '8px 0 4px 0' }}>
                  Guest Article Status &amp; Live Publication Feed
                </h3>
                <p style={{ fontSize: '13px', color: '#a7f3d0', margin: 0 }}>
                  Articles submitted here are reviewed by Newspaper Pro editors and published live with do-follow contextual backlinks.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.12)', padding: '10px 16px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{approvedGuestCount}</div>
                  <div style={{ fontSize: '10px', color: '#6ee7b7', textTransform: 'uppercase' }}>Live Approved</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.12)', padding: '10px 16px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{pendingGuestCount}</div>
                  <div style={{ fontSize: '10px', color: '#fde68a', textTransform: 'uppercase' }}>In Review</div>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Article Submission Form */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', marginBottom: '28px' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Submit New Guest Post Article
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Include your article headline, full content, and the exact contextual backlink you want embedded.
              </p>
            </div>

            <form onSubmit={handleGuestPostSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                  Article Headline / Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. How Cloud AI is Transforming Modern Enterprise Architecture in 2026"
                  value={guestTitle}
                  onChange={(e) => setGuestTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Publishing Category
                  </label>
                  <select
                    value={guestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="technology">Technology &amp; Gadgets</option>
                    <option value="business">Business &amp; Finance</option>
                    <option value="world">World &amp; Global Affairs</option>
                    <option value="entertainment">Entertainment &amp; Media</option>
                    <option value="science">Science &amp; Environment</option>
                    <option value="sports">Sports</option>
                    <option value="custom">★ Create Custom Category</option>
                  </select>
                </div>

                {guestCategory === 'custom' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#059669', marginBottom: '6px' }}>
                      Custom Category Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Artificial Intelligence"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '2px solid #10b981', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                      Featured Article Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Target Website URL (Backlink) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com/target-page"
                    value={guestUrl}
                    onChange={(e) => setGuestUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Contextual Anchor Text <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. leading enterprise software platform"
                    value={guestAnchor}
                    onChange={(e) => setGuestAnchor(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151' }}>
                    Full Article Body Content <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: guestContent.length >= 100 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {guestContent.length} chars (min 100 required)
                  </span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Draft your high-quality guest article here. The editorial review ensures articles are grammatically correct and informative..."
                  value={guestContent}
                  onChange={(e) => setGuestContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Submitting Article...' : 'Submit Guest Post for Editorial Approval →'}
              </button>
            </form>
          </div>

          {/* Submitted Guest Posts List - PROFESSIONAL STATUS CARDS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '15px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                  Guest Post Submissions &amp; Status ({guestPostsList.length})
                </h4>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Real-time editorial status of your submitted guest articles
                </div>
              </div>
              <button
                onClick={loadUserSubmissions}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-rotate-right" style={{ marginRight: '4px' }}></i> Refresh
              </button>
            </div>

            {guestPostsList.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fa-solid fa-newspaper" style={{ fontSize: '32px', marginBottom: '12px', color: '#cbd5e1' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>No Guest Posts Submitted Yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Submit your first guest article above to have it published live on our platform!</div>
              </div>
            ) : (
              <div style={{ padding: '16px' }}>
                {guestPostsList.map((item) => {
                  const isApproved = item.status === 'approved'
                  const isRejected = item.status === 'rejected'
                  const isPending = !isApproved && !isRejected

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: isApproved ? '2px solid #86efac' : isRejected ? '2px solid #fca5a5' : '2px solid #fde68a',
                        backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb',
                        borderRadius: '6px',
                        padding: '20px',
                        marginBottom: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          {/* STATUS PILL */}
                          {isApproved ? (
                            <span style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="fa-solid fa-circle-check"></i> ✓ APPROVED &amp; PUBLISHED LIVE
                            </span>
                          ) : isRejected ? (
                            <span style={{
                              background: '#dc2626',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="fa-solid fa-circle-xmark"></i> REJECTED / NEEDS REVISION
                            </span>
                          ) : (
                            <span style={{
                              background: '#d97706',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="fa-solid fa-hourglass-half"></i> ⏳ PENDING EDITORIAL APPROVAL
                            </span>
                          )}

                          <span style={{ marginLeft: '10px', fontSize: '11px', color: '#64748b' }}>
                            Submitted: {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* LIVE ARTICLE BUTTON */}
                        {isApproved && item.live_url && (
                          <a
                            href={item.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#15803d',
                              color: '#ffffff',
                              padding: '7px 14px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 800,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square"></i> Read Published Live Article ↗
                          </a>
                        )}
                      </div>

                      {/* ARTICLE TITLE */}
                      <h4 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '17px', fontWeight: 800, margin: '8px 0 6px 0', color: '#0f172a' }}>
                        {item.title}
                      </h4>

                      {/* SNIPPET */}
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        {item.content.slice(0, 180)}...
                      </p>

                      {/* DETAILS FOOTER STRIP */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: '12px'
                      }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Category: </span>
                          <strong style={{ textTransform: 'capitalize', color: '#0f172a' }}>{item.category_name || item.category}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Anchor Text: </span>
                          <strong style={{ color: '#0284c7' }}>&ldquo;{item.anchor_text}&rdquo;</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Target URL: </span>
                          <a href={item.target_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                            {item.target_url}
                          </a>
                        </div>
                      </div>

                      {/* EDITORIAL FEEDBACK NOTE */}
                      {item.admin_notes && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                          Editorial Note: {item.admin_notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: FORUM BACKLINK (COMMUNITY DISCUSSIONS) */}
      {/* ============================================================== */}
      {activeTab === 'forum' && (
        <div>
          {/* Forum Submission Form */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', marginBottom: '28px' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Post Community Forum Backlink &amp; Discussion
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Participate in public discussion threads and embed contextual authority backlinks within community topics.
              </p>
            </div>

            <form onSubmit={handleForumThreadSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                  Discussion Topic / Thread Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Best SEO Practices for News Publishers in 2026: What is working?"
                  value={forumThreadTitle}
                  onChange={(e) => setForumThreadTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Discussion Channel
                  </label>
                  <select
                    value={forumChannel}
                    onChange={(e) => setForumChannel(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="tech-discussions">Technology &amp; Development</option>
                    <option value="business-growth">Business Growth &amp; Finance</option>
                    <option value="seo-digital-marketing">SEO &amp; Digital Marketing</option>
                    <option value="industry-insights">Industry Insights</option>
                    <option value="general-community">General Community</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                    Citation / Backlink Target URL <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com/resource"
                    value={forumTargetUrl}
                    onChange={(e) => setForumTargetUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                  Anchor Text for Citation <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. read the complete case study"
                  value={forumAnchorText}
                  onChange={(e) => setForumAnchorText(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                  Discussion Message / Question Content <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder="Share your question, insight, or discussion topic with the community..."
                  value={forumThreadContent}
                  onChange={(e) => setForumThreadContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#8b5cf6',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Posting...' : 'Post to Community Forum →'}
              </button>
            </form>
          </div>

          {/* Submitted Forum Threads List */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                Your Community Forum Discussions ({forumThreadsList.length})
              </h4>
            </div>

            {forumThreadsList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No forum discussions posted yet. Post your first community thread above!
              </div>
            ) : (
              <div style={{ padding: '16px' }}>
                {forumThreadsList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '16px',
                      marginBottom: '12px',
                      background: '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        background: '#ede9fe',
                        color: '#6d28d9',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h5 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
                      {item.title}
                    </h5>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0' }}>
                      {item.content}
                    </p>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Citation Backlink: <a href={item.target_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7' }}>{item.target_url}</a> (&ldquo;{item.anchor_text}&rdquo;)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
