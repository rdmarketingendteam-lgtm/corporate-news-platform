'use client'

import React, { useState, useEffect } from 'react'

interface ApprovedBacklink {
  id: string
  website_title: string
  website_url: string
  anchor_text: string
  category: string
  description?: string
  approved_at?: string
}

export function ApprovedBacklinksDirectory({ variant = 'sidebar' }: { variant?: 'sidebar' | 'grid' }) {
  const [links, setLinks] = useState<ApprovedBacklink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/backlinks/public')
      .then((res) => (res.ok ? res.json() : { backlinks: [] }))
      .then((data) => {
        setLinks(data.backlinks || [])
      })
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading && links.length === 0) return null
  if (links.length === 0) return null

  if (variant === 'sidebar') {
    return (
      <div className="mb-4">
        <div className="td-block-title-wrap">
          <h4 className="td-block-title" style={{ background: '#0f172a' }}>
            <i className="fa-solid fa-link" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
            Verified Partners
          </h4>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {links.slice(0, 5).map((item) => {
            let domain = ''
            try {
              domain = new URL(item.website_url).hostname.replace('www.', '')
            } catch {
              domain = item.website_url
            }

            return (
              <div
                key={item.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <a
                    href={item.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.website_title || item.anchor_text}
                    style={{
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                      lineHeight: 1.3,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{item.anchor_text || item.website_title}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.7 }}></i>
                  </a>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      background: '#f1f5f9',
                      color: '#475569',
                      borderRadius: '2px',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {domain} &bull; <span style={{ color: '#16a34a', fontWeight: 600 }}>Verified &amp; Live</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Grid / Full Section Variant
  return (
    <section className="container my-5">
      <div className="td-block-title-wrap">
        <h4 className="td-block-title">
          <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
          Verified Contributor Directory &amp; Partner Network
        </h4>
      </div>

      <div className="row">
        {links.map((item) => {
          let domain = ''
          try {
            domain = new URL(item.website_url).hostname.replace('www.', '')
          } catch {
            domain = item.website_url
          }

          return (
            <div key={item.id} className="col-lg-4 col-md-6 mb-3">
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '16px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '2px',
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-circle-check"></i> Live Contributor
                    </span>
                  </div>

                  <h5 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px 0' }}>
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0f172a', textDecoration: 'none' }}
                    >
                      {item.website_title}
                    </a>
                  </h5>

                  <a
                    href={item.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0284c7',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                      marginBottom: '6px',
                    }}
                  >
                    <span>&bull; {item.anchor_text}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px' }}></i>
                  </a>

                  {item.description && (
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                      {item.description}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#94a3b8' }}>
                  Target Domain: <strong style={{ color: '#475569' }}>{domain}</strong>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
