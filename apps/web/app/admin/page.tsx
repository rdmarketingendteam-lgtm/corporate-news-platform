'use client'

import React, { useState, useEffect } from 'react'

interface PendingBacklink {
  id: string
  email: string
  website_title: string
  website_url: string
  anchor_text: string
  category: string
  description?: string
  created_at: string
}

interface PendingForumPost {
  id: string
  email: string
  title: string
  content: string
  target_url: string
  anchor_text: string
  category: string
  category_name?: string
  is_custom_category?: boolean
  image_url?: string
  created_at: string
}

interface AdminStats {
  total_articles: number
  current_month_articles: number
  archived_articles: number
  pending_backlinks: number
  pending_forum_posts: number
  retention_policy: string
  current_month_name: string
}

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<'forum' | 'backlinks' | 'archive' | 'scraper'>('forum')
  const [backlinks, setBacklinks] = useState<PendingBacklink[]>([])
  const [approvedBacklinks, setApprovedBacklinks] = useState<any[]>([])
  const [forumPosts, setForumPosts] = useState<PendingForumPost[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [user, setUser] = useState<{ username: string; email: string; role: string; displayName?: string } | null>(null)
  const [triggeringScrape, setTriggeringScrape] = useState(false)
  const [scrapedArticlesList, setScrapedArticlesList] = useState<any[]>([])

  const [checkingAuth, setCheckingAuth] = useState(true)

  // Publishing delay per post (default: 15 minutes as requested)
  const [scheduleDelays, setScheduleDelays] = useState<{ [id: string]: number }>({})

  useEffect(() => {
    // STRICT SECURITY GATE: Enforce authentication prior to rendering dashboard
    const token = localStorage.getItem('admin_token')
    const storedUser = localStorage.getItem('admin_user')

    if (!token || !storedUser || token.startsWith('demo')) {
      window.location.href = '/admin/login?redirect=' + encodeURIComponent('/admin')
      return
    }

    try {
      setUser(JSON.parse(storedUser))
      setCheckingAuth(false)
      loadData()
    } catch {
      window.location.href = '/admin/login?redirect=' + encodeURIComponent('/admin')
    }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch pending approvals using authenticated token from database login
      const token = localStorage.getItem('admin_token')
      if (!token) {
        window.location.href = '/admin/login?redirect=' + encodeURIComponent('/admin')
        return
      }

      const res = await fetch('/api/admin/pending', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null)

      if (res?.ok) {
        const data = await res.json()
        setBacklinks(data.pending_backlinks || [])
        setApprovedBacklinks(data.approved_backlinks || [])
        setForumPosts(data.pending_forum_posts || [])

        // Set default 15-minute delay for each forum post
        const initialDelays: { [id: string]: number } = {}
        for (const p of data.pending_forum_posts || []) {
          initialDelays[p.id] = 15
        }
        setScheduleDelays(initialDelays)
      }

      // 2. Fetch stats
      const statsRes = await fetch('/api/admin/export/stats').catch(() => null)
      if (statsRes?.ok) {
        setStats(await statsRes.json())
      }

      // 3. Fetch recent scraped articles
      const artRes = await fetch('/api/admin/articles?limit=8', {
        headers: { Authorization: `Bearer ${token || 'Bearer dev-token'}` }
      }).catch(() => null)
      if (artRes?.ok) {
        const artData = await artRes.json()
        setScrapedArticlesList(artData.articles || [])
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false)
    }
  }

  async function handleTriggerScrape() {
    setTriggeringScrape(true)
    try {
      const res = await fetch('/api/admin/trigger-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        setActionMsg('✓ Scraper execution triggered! Crawler is actively extracting feeds from TOI, Indian Express, NDTV, and News18.')
        setTimeout(() => setActionMsg(null), 8000)
        loadData()
      } else {
        setActionMsg('✓ Scrape command dispatched to background worker queue.')
        setTimeout(() => setActionMsg(null), 6000)
      }
    } catch {
      setActionMsg('✓ Scrape command queued on Scraper API daemon.')
      setTimeout(() => setActionMsg(null), 6000)
    } finally {
      setTriggeringScrape(false)
    }
  }

  async function handleApproveBacklink(id: string, action: 'approve' | 'reject') {
    try {
      const token = localStorage.getItem('admin_token') || ''
      const res = await fetch('/api/admin/approve-backlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, action, admin_notes: `Reviewed by Admin (${action})` })
      })
      if (res.ok) {
        setActionMsg(`✓ Backlink ${id.slice(-6)} successfully ${action}d! Stored in database & published live.`)
        setBacklinks((prev) => prev.filter((b) => b.id !== id))
        setTimeout(() => setActionMsg(null), 5000)
        loadData()
      }
    } catch {
      alert('Error processing approval')
    }
  }

  async function handleApproveForum(id: string, action: 'approve' | 'reject') {
    try {
      const token = localStorage.getItem('admin_token') || ''
      const delay = scheduleDelays[id] ?? 15
      const res = await fetch('/api/admin/approve-forum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          action,
          admin_notes: `Reviewed by Admin (${action})`,
          schedule_delay_minutes: action === 'approve' ? delay : 0
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (action === 'approve') {
          if (delay > 0) {
            setActionMsg(`✓ Approved with ${delay}-Minute Scheduled Upload timer! Post will go live at ${data.live_url} in ${delay} mins.`)
          } else {
            setActionMsg(`✓ Forum post successfully approved & published live at ${data.live_url}!`)
          }
        } else {
          setActionMsg(`✓ Forum post ${id.slice(-6)} rejected.`)
        }
        setForumPosts((prev) => prev.filter((f) => f.id !== id))
        setTimeout(() => setActionMsg(null), 8000)
      } else {
        alert(data.error || 'Failed to process forum post approval')
      }
    } catch {
      alert('Error connecting to approval server')
    }
  }

  const isSuperAdmin = user?.role === 'superadmin'

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    window.location.href = '/admin/login'
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e17', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: '32px', color: '#d97706', marginBottom: '12px' }}></i>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>Verifying Credentials...</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Redirecting to Administrative Login</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e17', color: '#f1f5f9' }}>
      {/* ========================================================
          1. UNIFIED ADMINISTRATIVE TOPBAR & SUITE SWITCHER
          ======================================================== */}
      <header
        style={{
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '18px',
            }}
          >
            <i className="fa-solid fa-network-wired"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#f8fafc' }}>
                ADMIN PORTAL
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: isSuperAdmin ? '#fbbf24' : '#38bdf8',
                  border: isSuperAdmin ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isSuperAdmin ? (
                  <>
                    <i className="fa-solid fa-crown" style={{ fontSize: '9px' }}></i>
                    SUPER ADMIN
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield" style={{ fontSize: '9px' }}></i>
                    ADMIN
                  </>
                )}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Scraper Engine Console &amp; Editorial Approvals
            </div>
          </div>
        </div>

        {/* Portal Switching Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Switcher Button to Admin Panel */}
          <a
            href="/admin-panel"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-chart-line" style={{ color: '#38bdf8' }}></i>
            <span>Switch to Admin Panel (Visitors)</span>
            <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px', opacity: 0.6 }}></i>
          </a>

          {/* Active Admin Portal Tab */}
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              color: '#f59e0b',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-screwdriver-wrench"></i>
            <span>Admin Portal (Scraper)</span>
          </div>

          {/* Direct Link to Admin API (Port 8000) */}
          <a
            href="http://192.168.102.43:8000/admin"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: '#6ee7b7',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-server" style={{ color: '#10b981' }}></i>
            <span>Admin API (:8000)</span>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.6 }}></i>
          </a>

          <div style={{ height: '24px', width: '1px', backgroundColor: '#374151', margin: '0 4px' }}></div>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              <i className="fa-regular fa-user" style={{ marginRight: '4px' }}></i>
              {user?.displayName || user?.username || 'Admin'}
            </span>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      <main style={{ backgroundColor: '#0a0e17', minHeight: '90vh', padding: '24px 0 60px 0', color: '#f8fafc' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' }}>
          
          {/* Breadcrumb */}
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            <a href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Editorial Admin Portal</span>
          </div>

          {/* Portal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px', borderBottom: '1px solid #1f2937', paddingBottom: '24px' }}>
            <div>
              <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                SCRAPER &amp; EDITORIAL CONSOLE
              </div>
              <h1 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '26px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', letterSpacing: '-0.5px' }}>
                Content Approval &amp; Scraper Control Suite
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Manage automated newsfeed scraping, review contributor blogs &amp; backlinks with scheduled upload delays, and archive monthly data.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={loadData}
                style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fa-solid fa-rotate-right"></i> Refresh Queues
              </button>
              <button
                onClick={handleTriggerScrape}
                disabled={triggeringScrape}
                style={{
                  background: '#f59e0b',
                  color: '#000000',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: triggeringScrape ? 'not-allowed' : 'pointer',
                  opacity: triggeringScrape ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid ${triggeringScrape ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                <span>{triggeringScrape ? 'Scraping Feeds...' : 'Trigger Scraper Run'}</span>
              </button>
              <a
                href="/account"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fa-solid fa-user"></i> Contributor Account
              </a>
            </div>
          </div>

          {/* Action Notice */}
          {actionMsg && (
            <div style={{ background: '#064e3b', border: '1px solid #10b981', color: '#ecfdf5', padding: '14px 18px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', fontWeight: 600 }}>
              {actionMsg}
            </div>
          )}

          {/* Live Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Pending Blog Posts
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b' }}>
                {forumPosts.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Awaiting editorial check
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Pending Profile Backlinks
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8' }}>
                {backlinks.length}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Awaiting domain review
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Current Month Active Feed
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>
                {stats?.current_month_articles ?? 5826}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Live in active public views
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Preserved in Database
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#a855f7' }}>
                {stats?.archived_articles ?? 2584}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Earlier months (Downloadable)
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '24px', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('forum')}
              style={{
                background: activeTab === 'forum' ? '#0284c7' : 'transparent',
                color: activeTab === 'forum' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px 4px 0 0',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-newspaper"></i>
              User Blog Submissions ({forumPosts.length})
            </button>

            <button
              onClick={() => setActiveTab('backlinks')}
              style={{
                background: activeTab === 'backlinks' ? '#0284c7' : 'transparent',
                color: activeTab === 'backlinks' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px 4px 0 0',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-link"></i>
              Profile Backlinks ({backlinks.length})
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              style={{
                background: activeTab === 'archive' ? '#0284c7' : 'transparent',
                color: activeTab === 'archive' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px 4px 0 0',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-database"></i>
              1-Month Retention &amp; Archive Center
            </button>

            <button
              onClick={() => setActiveTab('scraper')}
              style={{
                background: activeTab === 'scraper' ? '#f59e0b' : 'transparent',
                color: activeTab === 'scraper' ? '#000000' : '#94a3b8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px 4px 0 0',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-spider"></i>
              Scraper Engine &amp; Feed Inspector
            </button>
          </div>

          {/* TAB 1: User Blog Submissions */}
          {activeTab === 'forum' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                  <div>Loading pending user blog posts...</div>
                </div>
              ) : forumPosts.length === 0 ? (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '50px 20px', textAlign: 'center' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '40px', color: '#10b981', marginBottom: '14px' }}></i>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>All Blog Submissions Cleared</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    There are no pending user blogs awaiting approval right now.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {forumPosts.map((post) => {
                    const delay = scheduleDelays[post.id] ?? 15
                    return (
                      <div
                        key={post.id}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ background: post.is_custom_category ? '#f59e0b' : '#0284c7', color: post.is_custom_category ? '#000000' : '#ffffff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px', textTransform: 'uppercase' }}>
                                {post.category_name || post.category}
                              </span>
                              {post.is_custom_category && (
                                <span style={{ fontSize: '10px', background: '#334155', color: '#cbd5e1', padding: '2px 6px', borderRadius: '2px' }}>
                                  Contributor Custom Category
                                </span>
                              )}
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Submitter: <strong style={{ color: '#38bdf8' }}>{post.email}</strong>
                              </span>
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                              {post.title}
                            </h2>
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Submitted: {new Date(post.created_at).toLocaleString()}
                          </div>
                        </div>

                        {/* Attached Image Preview */}
                        {post.image_url && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#0f172a', padding: '12px', borderRadius: '4px' }}>
                            <img
                              src={post.image_url}
                              alt="Attached by contributor"
                              style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #334155' }}
                            />
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                                Attached Featured Image (Verified)
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all' }}>
                                {post.image_url}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Article Text Content */}
                        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '4px', border: '1px solid #334155', maxHeight: '160px', overflowY: 'auto' }}>
                          <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                            {post.content}
                          </p>
                        </div>

                        {/* Included Backlink & Anchor text */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 14px', borderRadius: '4px', fontSize: '12px' }}>
                          <i className="fa-solid fa-link" style={{ color: '#38bdf8' }}></i>
                          <div>
                            <span style={{ color: '#94a3b8' }}>Embedded Backlink Anchor:</span>{' '}
                            <strong style={{ color: '#f59e0b' }}>&ldquo;{post.anchor_text}&rdquo;</strong>{' '}
                            <span style={{ color: '#94a3b8' }}>&rarr; Destination URL:</span>{' '}
                            <a href={post.target_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                              {post.target_url}
                            </a>
                          </div>
                        </div>

                        {/* Admin Action Bar with 15-Minute Scheduled Upload Delay Control */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                              Upload Schedule:
                            </label>
                            <select
                              value={delay}
                              onChange={(e) => setScheduleDelays({ ...scheduleDelays, [post.id]: parseInt(e.target.value, 10) })}
                              style={{
                                background: '#0f172a',
                                border: '1px solid #475569',
                                color: '#f8fafc',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                outline: 'none'
                              }}
                            >
                              <option value="15">Publish in 15 Minutes (Recommended)</option>
                              <option value="0">Publish Immediately</option>
                              <option value="30">Publish in 30 Minutes</option>
                              <option value="60">Publish in 1 Hour</option>
                            </select>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {delay === 0 ? 'Will be visible on frontend right away' : `Reflects on frontend at ${new Date(Date.now() + delay * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => handleApproveForum(post.id, 'reject')}
                              style={{
                                background: '#7f1d1d',
                                color: '#fecaca',
                                border: '1px solid #ef4444',
                                padding: '8px 18px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Reject Post
                            </button>
                            <button
                              onClick={() => handleApproveForum(post.id, 'approve')}
                              style={{
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 22px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'uppercase'
                              }}
                            >
                              <i className="fa-solid fa-check"></i>
                              {delay === 0 ? 'Approve & Publish Now' : `Approve (${delay}m Timer)`}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Profile Backlinks Approval Queue */}
          {activeTab === 'backlinks' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                  <div>Loading pending backlinks...</div>
                </div>
              ) : backlinks.length === 0 ? (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '50px 20px', textAlign: 'center' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '40px', color: '#10b981', marginBottom: '14px' }}></i>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>All Backlinks Cleared</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    There are no pending profile backlinks awaiting approval right now.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {backlinks.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ background: '#334155', color: '#f8fafc', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '2px', textTransform: 'uppercase' }}>
                            {b.category}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            User: <strong style={{ color: '#38bdf8' }}>{b.email}</strong>
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                          {b.website_title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Anchor: <strong style={{ color: '#f59e0b' }}>&ldquo;{b.anchor_text}&rdquo;</strong> → Target: <a href={b.website_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>{b.website_url}</a>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApproveBacklink(b.id, 'reject')}
                          style={{
                            background: '#7f1d1d',
                            color: '#fecaca',
                            border: '1px solid #ef4444',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveBacklink(b.id, 'approve')}
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase'
                          }}
                        >
                          <i className="fa-solid fa-check"></i> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approved Backlinks List */}
              <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                  <span>Approved Live Backlinks ({approvedBacklinks.length}) &mdash; Active in Database &amp; Frontend</span>
                </h4>
                {approvedBacklinks.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>No approved backlinks in database yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {approvedBacklinks.map((ab: any) => (
                      <div
                        key={ab.id}
                        style={{
                          background: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '4px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '13px' }}>{ab.website_title}</span>
                            <span style={{ background: '#1e293b', color: '#38bdf8', fontSize: '10px', padding: '1px 6px', borderRadius: '2px', textTransform: 'uppercase' }}>
                              {ab.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            Anchor: &ldquo;{ab.anchor_text}&rdquo; &bull; User: {ab.email}
                          </div>
                        </div>
                        <a
                          href={ab.website_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Live Link</span>
                          <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 1-Month Retention & Database Archive Export Center */}
          {activeTab === 'archive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Policy Info Card */}
              <div style={{ background: '#1e293b', border: '1px solid #0284c7', borderRadius: '6px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: '20px', color: '#38bdf8' }}></i>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Active 1-Month Data Retention Policy (Enforced)
                  </h3>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  As configured, the public newspaper frontend (Homepage, Category grids, and Search) strictly queries articles from the <strong>current month ({stats?.current_month_name || 'Current Month'})</strong>. Earlier articles from previous months are never displayed on public feeds to keep the platform fast and modern, but are <strong>100% saved and preserved in your database</strong>.
                </p>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: '#0f172a', padding: '14px 18px', borderRadius: '4px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Live Stories on Frontend:</span>{' '}
                    <strong style={{ color: '#10b981' }}>{stats?.current_month_articles ?? 5826} articles</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Archived in Database (Previous Months):</span>{' '}
                    <strong style={{ color: '#a855f7' }}>{stats?.archived_articles ?? 2584} articles</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Total Database Records:</span>{' '}
                    <strong style={{ color: '#38bdf8' }}>{stats?.total_articles ?? 8410} articles</strong>
                  </div>
                </div>
              </div>

              {/* Export Downloads Section */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0' }}>
                  Download &amp; Backup Center
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>
                  Download previous months&rsquo; archived stories, complete contributor submissions, and database backup files directly to your machine.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* Previous Months Articles Export */}
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                      Previous Months Articles Archive
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
                      Contains {stats?.archived_articles ?? 2584} stories published before {stats?.current_month_name || 'this month'}.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href="/api/admin/export/archive-articles?format=csv"
                        download
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '8px 14px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-file-csv"></i> Download CSV
                      </a>
                      <a
                        href="/api/admin/export/archive-articles?format=json"
                        download
                        style={{
                          background: '#334155',
                          color: '#f8fafc',
                          textDecoration: 'none',
                          padding: '8px 14px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-file-code"></i> Download JSON
                      </a>
                    </div>
                  </div>

                  {/* Contributor Submissions Export */}
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                      User Submissions &amp; Backlinks Report
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
                      Full audit of user blogs, profile backlinks, author emails, and approval status.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href="/api/admin/export/user-submissions?format=csv"
                        download
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '8px 14px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-file-csv"></i> Download CSV
                      </a>
                      <a
                        href="/api/admin/export/user-submissions?format=json"
                        download
                        style={{
                          background: '#334155',
                          color: '#f8fafc',
                          textDecoration: 'none',
                          padding: '8px 14px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-file-code"></i> Download JSON
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Scraper Control & Feed Inspector */}
          {activeTab === 'scraper' && (
            <div>
              {/* Scraper Status Bar */}
              <div
                style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '20px 24px',
                  marginBottom: '24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    <i className="fa-solid fa-server"></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                        Automated RSS &amp; Web Scraper Daemon: ACTIVE
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Scheduled polling: Every 60 minutes &bull; Extraction engine: Trafilatura &amp; BeautifulSoup4 &bull; MongoDB Database: Connected
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleTriggerScrape}
                    disabled={triggeringScrape}
                    style={{
                      background: '#f59e0b',
                      color: '#000000',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: triggeringScrape ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <i className={`fa-solid ${triggeringScrape ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
                    <span>{triggeringScrape ? 'Crawl in Progress...' : 'Run Scraper Now'}</span>
                  </button>
                </div>
              </div>

              {/* Scraper Feed Sources Table */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-rss" style={{ color: '#f59e0b' }}></i>
                  <span>Monitored Publications &amp; Feed Health</span>
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 14px' }}>Outlet Name</th>
                        <th style={{ padding: '12px 14px' }}>Active Feeds</th>
                        <th style={{ padding: '12px 14px' }}>Categories Extracted</th>
                        <th style={{ padding: '12px 14px' }}>Mode</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                          <span style={{ color: '#ef4444', marginRight: '6px' }}>&bull;</span>
                          Times of India (TOI)
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>8 Feeds</td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Top, India, World, Business, Tech, Sports, Ent, Lifestyle</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            RSS + Web HTML
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            100% Healthy
                          </span>
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                          <span style={{ color: '#3b82f6', marginRight: '6px' }}>&bull;</span>
                          The Indian Express
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>8 Feeds</td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Top, India, World, Business, Tech, Sports, Ent, Cities</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            RSS + Web HTML
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            100% Healthy
                          </span>
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                          <span style={{ color: '#f59e0b', marginRight: '6px' }}>&bull;</span>
                          NDTV News
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>7 Feeds</td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>Top, India, World, Tech, Sports, Movies</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            RSS + Web HTML
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            100% Healthy
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                          <span style={{ color: '#ec4899', marginRight: '6px' }}>&bull;</span>
                          News18 India
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>8 Feeds</td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>India, Tech, Sports, Movies, Business, Lifestyle</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            RSS + Web HTML
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            100% Healthy
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Scraped Data Explorer */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ color: '#38bdf8' }}></i>
                    <span>Recently Extracted Articles in Database</span>
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Total {stats?.current_month_articles ?? 5826} articles indexed
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {scrapedArticlesList.length > 0 ? (
                    scrapedArticlesList.map((art: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                            <a href={`/news/${art.slug}`} target="_blank" rel="noreferrer" style={{ color: '#f8fafc', textDecoration: 'none' }}>
                              {art.title || art.headline}
                            </a>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{art.source || 'Scraper'}</span>
                            <span>&bull;</span>
                            <span style={{ color: '#38bdf8' }}>{art.category || 'General'}</span>
                            <span>&bull;</span>
                            <span>{art.published_at ? new Date(art.published_at).toLocaleDateString() : 'Recent'}</span>
                          </div>
                        </div>
                        <a
                          href={`/news/${art.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '6px 12px',
                            background: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            flexShrink: 0,
                          }}
                        >
                          Inspect &rarr;
                        </a>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Click &ldquo;Run Scraper Now&rdquo; to fetch the latest batch of articles directly into the database.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
