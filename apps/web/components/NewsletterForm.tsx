'use client'

import React, { useState } from 'react'

interface Props {
  variant?: 'inline' | 'stacked'
  placeholder?: string
  buttonText?: string
  className?: string
}

export function NewsletterForm({
  variant = 'inline',
  placeholder = 'Your email address...',
  buttonText = 'SUBSCRIBE',
  className = ''
}: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMsg('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg(`✓ Subscribed! Daily news briefings will be sent to ${email}`)
        setEmail('')
      } else {
        setStatus('error')
        setMsg(data.error || 'Subscription failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setMsg('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #86efac',
        color: '#166534',
        padding: '12px 14px',
        borderRadius: '3px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1.4,
        marginTop: '6px'
      }}>
        <i className="fa-solid fa-circle-check" style={{ marginRight: '6px', color: '#16a34a' }}></i>
        {msg}
      </div>
    )
  }

  const isStacked = variant === 'stacked'

  return (
    <form onSubmit={handleSubmit} className={className} style={{
      display: 'flex',
      flexDirection: isStacked ? 'column' : 'row',
      gap: '8px',
      width: '100%',
      position: 'relative'
    }}>
      <input
        type="email"
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={status === 'loading'}
        style={{
          flex: 1,
          padding: '10px 12px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '2px',
          outline: 'none',
          backgroundColor: '#ffffff',
          color: '#111111'
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          background: '#4db2ec',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.5px',
          padding: isStacked ? '11px' : '10px 18px',
          border: 'none',
          borderRadius: '2px',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          transition: 'background-color 0.2s ease',
          opacity: status === 'loading' ? 0.7 : 1
        }}
      >
        {status === 'loading' ? 'Subscribing...' : buttonText}
      </button>

      {status === 'error' && (
        <div style={{
          position: 'absolute',
          bottom: '-24px',
          left: 0,
          color: '#ef4444',
          fontSize: '11px',
          fontWeight: 600
        }}>
          {msg}
        </div>
      )}
    </form>
  )
}
