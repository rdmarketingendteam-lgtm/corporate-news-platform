'use client'

import React, { useState, useEffect } from 'react'
import { GmailOtpAuth } from './GmailOtpAuth'
import { BacklinkDashboard } from './BacklinkDashboard'

interface AccountClientViewProps {
  initialUser: { email: string; displayName?: string; role?: string } | null
}

export function AccountClientView({ initialUser }: AccountClientViewProps) {
  const [user, setUser] = useState(initialUser)

  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('contributor_user')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed?.email) {
            setUser({
              email: parsed.email,
              displayName: parsed.display_name || parsed.email.split('@')[0],
              role: 'member'
            })
            // Re-sync cookie in case it was missing
            const userPayload = encodeURIComponent(JSON.stringify({
              email: parsed.email,
              displayName: parsed.display_name || parsed.email.split('@')[0],
              role: 'member'
            }))
            document.cookie = `newspaper_user=${userPayload}; path=/; max-age=2592000; SameSite=Lax`
          }
        }
      } catch (e) {
        console.error('Storage check error:', e)
      }
    }
  }, [user])

  if (user) {
    return <BacklinkDashboard email={user.email} />
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-block',
          background: '#e0f2fe',
          color: '#0369a1',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '10px'
        }}>
          Pre-Launch Contributor Access
        </div>
        <h1 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
          Sign In to Create Profile &amp; Forum Backlinks
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '580px', margin: '0 auto' }}>
          Access our high-authority contributor network. Sign in or register with your verified <strong>@gmail.com</strong> address using instant security OTP.
        </p>
      </div>

      <GmailOtpAuth nextUrl="/account" />
    </div>
  )
}
