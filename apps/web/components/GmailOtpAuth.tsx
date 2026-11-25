'use client'

import React, { useState, useEffect } from 'react'

export function GmailOtpAuth({ nextUrl = '/account' }: { nextUrl?: string }) {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [timeLeft, setTimeLeft] = useState(300)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  useEffect(() => {
    let timer: any
    if (step === 'otp' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [step, timeLeft])

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail.endsWith('@gmail.com')) {
      setStatus('error')
      setMsg('Security Check: Only genuine @gmail.com addresses are permitted for member login.')
      return
    }

    setStatus('loading')
    setMsg('')

    try {
      const res = await fetch('/api/auth/gmail/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })

      const data = await res.json()
      if (res.ok) {
        setStep('otp')
        setStatus('idle')
        setTimeLeft(data.expires_in_seconds || 300)
        if (data.dev_otp) setDevOtp(data.dev_otp)
      } else {
        setStatus('error')
        setMsg(data.error || 'Failed to send OTP. Please check your address.')
      }
    } catch {
      setStatus('error')
      setMsg('Network communication error. Please try again.')
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanOtp = otp.trim()
    if (cleanOtp.length < 6) {
      setStatus('error')
      setMsg('Please enter the complete 6-digit OTP code.')
      return
    }

    setStatus('loading')
    setMsg('')

    try {
      const res = await fetch('/api/auth/gmail/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanOtp })
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg('✓ Verification successful! Entering dashboard...')

        try {
          const userPayload = encodeURIComponent(JSON.stringify({
            email: email.trim().toLowerCase(),
            displayName: data.user?.display_name || email.trim().split('@')[0],
            role: 'member'
          }))
          document.cookie = `newspaper_user=${userPayload}; path=/; max-age=2592000; SameSite=Lax`
          if (data.token) {
            document.cookie = `reader_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`
          }
          localStorage.setItem('contributor_user', JSON.stringify(data.user || {
            email: email.trim().toLowerCase(),
            display_name: email.trim().split('@')[0]
          }))
          if (data.token) {
            localStorage.setItem('contributor_token', data.token)
          }
        } catch (storageErr) {
          console.error('Storage sync error:', storageErr)
        }

        setTimeout(() => {
          window.location.href = nextUrl
          window.location.reload()
        }, 500)
      } else {
        setStatus('error')
        setMsg(data.error || 'Invalid OTP code. Please retry.')
      }
    } catch {
      setStatus('error')
      setMsg('Verification failed. Please retry.')
    }
  }

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      overflow: 'hidden'
    }}>
      {/* Header Banner */}
      <div style={{
        background: '#111827',
        color: '#ffffff',
        padding: '24px 20px',
        textAlign: 'center',
        borderBottom: '3px solid #4db2ec'
      }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#4db2ec', fontWeight: 800, marginBottom: '6px' }}>
          NEWSPAPER PRO MEMBER PORTAL
        </div>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '20px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
          Gmail OTP Authentication
        </h2>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
          Strict Security Verification for Backlink & Contributor Access
        </div>
      </div>

      <div style={{ padding: '28px 24px' }}>
        {status === 'error' && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 14px',
            borderRadius: '3px',
            fontSize: '12px',
            lineHeight: 1.5,
            marginBottom: '20px'
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
            {msg}
          </div>
        )}

        {status === 'success' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '14px',
            borderRadius: '3px',
            fontSize: '13px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
            {msg}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px' }}>
                Gmail Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 36px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '2px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <i className="fa-regular fa-envelope" style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }}></i>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: '#16a34a' }}></i>
                  Must be <strong>@gmail.com</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setEmail('contributor.demo@gmail.com')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '2px',
                    fontSize: '10px',
                    color: '#0284c7',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontWeight: 700
                  }}
                >
                  Quick Demo Email
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                background: '#4db2ec',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                padding: '12px',
                border: 'none',
                borderRadius: '2px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                transition: 'background 0.2s',
                opacity: status === 'loading' ? 0.7 : 1
              }}
            >
              {status === 'loading' ? 'Generating Secure OTP...' : 'Send Security OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Verification code dispatched to:
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', margin: '4px 0' }}>
                {email}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Code expires in: <strong style={{ color: '#ef4444' }}>{formatTimer(timeLeft)}</strong>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 14px',
              borderRadius: '4px',
              fontSize: '12px',
              lineHeight: 1.5,
              textAlign: 'center',
              marginBottom: '14px'
            }}>
              <i className="fa-solid fa-envelope-circle-check" style={{ marginRight: '6px', fontSize: '14px', color: '#16a34a' }}></i>
              A 6-digit security OTP has been sent directly to <strong>{email}</strong>.
            </div>

            {devOtp && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px dashed #22c55e',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#15803d',
                  textAlign: 'center',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <i className="fa-solid fa-key" style={{ color: '#16a34a' }}></i>
                <span>Generated Code: <strong>{devOtp}</strong> (or test code <strong>123456</strong>)</span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Auto-Fill
                </button>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#374151', marginBottom: '6px', textAlign: 'center' }}>
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '22px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontWeight: 800,
                  border: '2px solid #4db2ec',
                  borderRadius: '3px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                padding: '12px',
                border: 'none',
                borderRadius: '2px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                opacity: status === 'loading' ? 0.7 : 1,
                marginBottom: '12px'
              }}
            >
              {status === 'loading' ? 'Verifying Code...' : 'Verify OTP & Enter Dashboard →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <button
                type="button"
                onClick={() => { setStep('email'); setStatus('idle'); setMsg('') }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={timeLeft > 240}
                style={{
                  background: 'none',
                  border: 'none',
                  color: timeLeft > 240 ? '#94a3b8' : '#4db2ec',
                  cursor: timeLeft > 240 ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
      </div>

      <div style={{ background: '#f8fafc', padding: '12px 20px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
        <i className="fa-solid fa-lock" style={{ marginRight: '4px', color: '#16a34a' }}></i>
        Protected by 256-bit rate-limited security & anti-abuse verification
      </div>
    </div>
  )
}
