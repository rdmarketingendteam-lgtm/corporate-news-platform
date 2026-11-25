'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ShellWrapper({
  header,
  footer,
  consent,
  children,
}: {
  header: React.ReactNode
  footer: React.ReactNode
  consent: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname() || '/'
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/admin-panel')

  // Automatic real-time visitor analytics tracking on consumer pages
  useEffect(() => {
    if (isAdminRoute) return
    try {
      const visitorId = localStorage.getItem('visitor_id') || Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('visitor_id', visitorId)

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          visitorId,
          referrer: document.referrer || 'Direct / Bookmark',
          screen: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
    } catch {
      // Ignore background analytics logging errors
    }
  }, [pathname, isAdminRoute])

  if (isAdminRoute) {
    // Dedicated Standalone Administrative Layout (Completely isolated from Consumer Newspaper UI)
    return (
      <div
        className="admin-suite-shell"
        style={{
          minHeight: '100vh',
          backgroundColor: '#0a0e17',
          color: '#e2e8f0',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </div>
    )
  }

  // Consumer Newspaper Web Layout
  return (
    <div className="body-inner">
      {header}
      <div id="main">{children}</div>
      {footer}
      {consent}
    </div>
  )
}
