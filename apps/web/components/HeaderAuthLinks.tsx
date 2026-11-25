'use client'

import React, { useState, useEffect } from 'react'

export function HeaderAuthLinks() {
  const [user, setUser] = useState<{ email: string; displayName?: string } | null>(null)

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)newspaper_user=([^;]+)/)
      if (match) {
        const parsed = JSON.parse(decodeURIComponent(match[1]))
        if (parsed?.email) {
          setUser(parsed)
          return
        }
      }
      const local = localStorage.getItem('contributor_user')
      if (local) {
        setUser(JSON.parse(local))
      }
    } catch {}
  }, [])

  if (user) {
    return (
      <>
        <a href="/account" style={{ color: '#0284c7', fontWeight: 700 }} title="My Contributor Dashboard">
          <i className="fa-regular fa-circle-user mr-1" style={{ marginRight: '4px' }}></i> {user.displayName || user.email.split('@')[0]}
        </a>
        <span style={{ color: '#ccc' }}>|</span>
        <a href="/api/auth/logout" style={{ color: '#64748b' }} title="Log Out">
          <i className="fa-solid fa-arrow-right-from-bracket mr-1" style={{ marginRight: '4px' }}></i> Logout
        </a>
      </>
    )
  }

  return (
    <a href="/login" style={{ color: '#444' }}>
      <i className="fa-regular fa-user mr-1" style={{ marginRight: '4px' }}></i> Sign in / Join
    </a>
  )
}
