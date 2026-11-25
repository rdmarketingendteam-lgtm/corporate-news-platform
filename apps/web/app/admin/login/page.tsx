'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [destination, setDestination] = useState<string>('/admin-panel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<{ username: string; email: string; role: string; displayName?: string } | null>(null)

  useEffect(() => {
    try {
      const token = localStorage.getItem('admin_token')
      const storedUser = localStorage.getItem('admin_user')
      if (token && storedUser) {
        const u = JSON.parse(storedUser)
        setActiveSession(u)
      }
      const params = new URLSearchParams(window.location.search)
      const r = params.get('redirect')
      if (r) {
        setDestination(r)
      }
    } catch {}
  }, [])

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!identifier || !password) {
      setError('Please provide your username or email and password.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier.trim(),
          identifier: identifier.trim(),
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.token) {
        throw new Error(data.detail || data.error || 'Authentication failed. Please verify your credentials.')
      }

      // Store authenticated admin session
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_user', JSON.stringify({
        username: data.username,
        email: data.email,
        role: data.role || (data.username === 'superadmin' ? 'superadmin' : 'admin'),
        displayName: data.display_name || data.username,
      }))

      // Direct navigation to destination dashboard or requested redirect
      const params = new URLSearchParams(window.location.search)
      const target = params.get('redirect') || destination || '/admin-panel'
      window.location.href = target
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (user: 'superadmin' | 'admin') => {
    if (user === 'superadmin') {
      setIdentifier('superadmin')
      setPassword('superadmin123')
    } else {
      setIdentifier('admin')
      setPassword('admin123')
    }
    setError(null)
  }

  const handleDirectDashboard = (target: string) => {
    window.location.href = target
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0e17',
        backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(77, 178, 236, 0.08), transparent 70%)',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          padding: '36px 30px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
              color: '#ffffff',
              fontSize: '22px',
              marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
            }}
          >
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Administrative Control Suite
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Unified Authentication for Super Admin &amp; Admin
          </p>
        </div>

        {/* ACTIVE SESSION DIRECT DASHBOARD BUTTONS */}
        {activeSession && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <i className="fa-solid fa-circle-check"></i>
              <span>Active Session: {activeSession.displayName || activeSession.username} ({activeSession.role.toUpperCase()})</span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 12px 0' }}>
              You are already logged in. Click below to enter either dashboard directly:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => handleDirectDashboard('/admin-panel')}
                style={{
                  padding: '9px',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Admin Panel &rarr;
              </button>
              <button
                type="button"
                onClick={() => handleDirectDashboard('/admin')}
                style={{
                  padding: '9px',
                  background: '#d97706',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Admin Portal &rarr;
              </button>
            </div>
            <a
              href="http://192.168.102.43:8000/admin"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                padding: '7px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <i className="fa-solid fa-server" style={{ marginRight: '6px' }}></i>
              Open Admin API Console (:8000) &rarr;
            </a>
          </div>
        )}

        {/* Quick Demo Pre-fill Pills */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            1-Click Demo Login
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillCredentials('superadmin')}
              style={{
                padding: '9px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f59e0b',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-crown" style={{ fontSize: '10px' }}></i>
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              style={{
                padding: '9px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-user-shield" style={{ fontSize: '10px' }}></i>
              <span>Editorial Admin</span>
            </button>
          </div>
        </div>

        {/* Destination Choice */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
            Choose Portal Destination:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setDestination('/admin-panel')}
              style={{
                padding: '8px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: destination === '/admin-panel' ? '2px solid #38bdf8' : '1px solid #334155',
                backgroundColor: destination === '/admin-panel' ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                color: destination === '/admin-panel' ? '#38bdf8' : '#94a3b8',
                textAlign: 'center',
              }}
            >
              <i className="fa-solid fa-chart-line" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}></i>
              Admin Panel
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8 }}>(Visitors)</span>
            </button>

            <button
              type="button"
              onClick={() => setDestination('/admin')}
              style={{
                padding: '8px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: destination === '/admin' ? '2px solid #f59e0b' : '1px solid #334155',
                backgroundColor: destination === '/admin' ? 'rgba(245, 158, 11, 0.15)' : '#1e293b',
                color: destination === '/admin' ? '#f59e0b' : '#94a3b8',
                textAlign: 'center',
              }}
            >
              <i className="fa-solid fa-network-wired" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}></i>
              Admin Portal
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8 }}>(Scraper)</span>
            </button>

            <button
              type="button"
              onClick={() => setDestination('http://192.168.102.43:8000/admin')}
              style={{
                padding: '8px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: destination.includes('8000') ? '2px solid #10b981' : '1px solid #334155',
                backgroundColor: destination.includes('8000') ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                color: destination.includes('8000') ? '#10b981' : '#94a3b8',
                textAlign: 'center',
              }}
            >
              <i className="fa-solid fa-server" style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}></i>
              Admin API
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8 }}>(Port 8000)</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '12px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Username or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="superadmin or admin@newspaper.com"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0284c7',
              backgroundImage: 'linear-gradient(135deg, #0284c7, #2563eb)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <span>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Authenticating...
              </span>
            ) : (
              <span>Sign In to Console &rarr;</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
          <a
            href="/"
            style={{
              fontSize: '12px',
              color: '#64748b',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Return to Public Newspaper</span>
          </a>
        </div>
      </div>
    </div>
  )
}
