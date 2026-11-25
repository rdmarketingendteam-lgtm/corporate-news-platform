'use client'

import React from 'react'

interface AspiriAdBannerProps {
  variant?: 'header-728' | 'midpage-728' | 'sidebar-300'
}

export function AspiriAdBanner({ variant = 'header-728' }: AspiriAdBannerProps) {
  const ASPIRI_URL = 'https://aspiri.in/'
  const FEATURED_RING_IMG = 'https://cdn.shopify.com/s/files/1/0993/0820/8409/files/LR14336AF_01Y.webp?v=1790858881'
  const OVAL_RING_IMG = 'https://cdn.shopify.com/s/files/1/0993/0820/8409/files/LR14339AF_01Y.webp?v=1790858878'
  const ASPIRI_LOGO = 'https://cdn.shopify.com/s/files/1/0993/0820/8409/files/LOGO_2_-_Copy_1.png'

  if (variant === 'sidebar-300') {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '320px',
          margin: '0 auto',
          boxSizing: 'border-box',
          background: 'linear-gradient(145deg, #0b0f19 0%, #172033 60%, #0d1322 100%)',
          border: '1px solid rgba(212, 175, 55, 0.45)',
          borderRadius: '4px',
          padding: '20px 18px',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Gold Luxury Shimmer Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #996515, #f5d77f, #d4af37, #f5d77f, #996515)',
          }}
        />

        {/* Sponsor Tag */}
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '2px',
            color: '#d4af37',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          OFFICIAL LUXURY JEWELRY SPONSOR
        </div>

        {/* Brand Name / Logo */}
        <a
          href={ASPIRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          <div
            style={{
              fontSize: '24px',
              fontFamily: 'serif',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#ffffff',
              marginBottom: '2px',
              textTransform: 'uppercase',
            }}
          >
            ASPIRI
          </div>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '3px',
              color: '#d4af37',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            HAUTE JOAILLERIE &amp; GOLD
          </div>
        </a>

        {/* Real Product Image from aspiri.in */}
        <a
          href={ASPIRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '130px',
            height: '130px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(212, 175, 55, 0.6)',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.25)',
            background: '#ffffff',
            transition: 'transform 0.3s ease',
          }}
        >
          <img
            src={FEATURED_RING_IMG}
            alt="Aspiri Verona Step Cut Solitaire Diamond Ring"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
            loading="lazy"
          />
        </a>

        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5d77f', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Verona Step Cut Solitaire
        </div>

        <p
          style={{
            fontSize: '11px',
            color: '#cbd5e1',
            lineHeight: 1.5,
            margin: '0 0 16px 0',
            fontStyle: 'italic',
          }}
        >
          &ldquo;Bespoke handcrafted 22K gold &amp; certified solitaire diamond creations. Experience timeless luxury.&rdquo;
        </p>

        {/* CTA Button directly to aspiri.in */}
        <a
          href={ASPIRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d77f 50%, #aa7c11 100%)',
            color: '#0b0f19',
            fontWeight: 800,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '10px 22px',
            borderRadius: '2px',
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)',
            transition: 'opacity 0.2s ease',
          }}
        >
          EXPLORE AT ASPIRI.IN →
        </a>
      </div>
    )
  }

  // 728x90 Header / Midpage Banner
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '728px',
        minHeight: '86px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #090d16 0%, #141c2e 50%, #0d1424 100%)',
        border: '1px solid rgba(212, 175, 55, 0.45)',
        borderRadius: '3px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Gold Border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #996515, #f5d77f, #d4af37, #f5d77f, #996515)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Real Product Thumbnail from aspiri.in */}
        <a
          href={ASPIRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid #d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)',
            flexShrink: 0,
          }}
        >
          <img
            src={OVAL_RING_IMG}
            alt="Aspiri Solitaire Diamond Ring"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }}
            loading="lazy"
          />
        </a>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '18px',
                fontFamily: 'serif',
                fontWeight: 900,
                letterSpacing: '2px',
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              ASPIRI
            </span>
            <span
              style={{
                fontSize: '10px',
                color: '#d4af37',
                letterSpacing: '1px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              FINE JEWELS
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Handcrafted 22K Gold &amp; Certified Solitaire Masterpieces
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right', display: 'none' }} className="d-md-block">
          <div style={{ fontSize: '10px', color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            OFFICIAL PARTNER
          </div>
          <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
            aspiri.in
          </div>
        </div>
        <a
          href={ASPIRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d77f 50%, #aa7c11 100%)',
            color: '#0b0f19',
            fontWeight: 800,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '8px 16px',
            borderRadius: '2px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
          }}
        >
          DISCOVER AT ASPIRI.IN ↗
        </a>
      </div>
    </div>
  )
}
