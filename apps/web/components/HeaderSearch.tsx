'use client'

import { useEffect, useRef, useState } from 'react'

type SearchItem = {
  id: string
  headline: string
  slug: string
  publishedAt?: string
  source?: string
  category?: string
  categorySlug?: string
  image?: string
}

const TRENDING_TAGS = [
  'Cricket',
  'Stock Market',
  'Artificial Intelligence',
  'Economy',
  'Elections',
  'Technology',
  'Bollywood',
  'Automobile',
]

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global keyboard shortcuts (Ctrl+K or / to open, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))) {
        e.preventDefault()
        setIsOpen(true)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Debounced live search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setTotal(data.total || 0)
        }
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [query])

  const handleTagClick = (tag: string) => {
    setQuery(tag)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search Toggle Button in Nav */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="td-header-search-btn"
        title="Search (Ctrl + K)"
        aria-label="Toggle Search"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: isOpen ? '#4db2ec' : 'transparent',
          color: '#ffffff',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        <i className={isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-magnifying-glass'}></i>
        <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 700 }} className="d-none d-xl-inline">
          {isOpen ? 'CLOSE' : 'SEARCH'}
        </span>
      </button>

      {/* Dropdown Live Search Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: 'min(92vw, 560px)',
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 36px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
            borderTop: '3px solid #4db2ec',
            borderBottom: '1px solid #e0e0e0',
            zIndex: 9999,
            padding: '20px',
            borderRadius: '0 0 4px 4px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Form */}
          <form
            action="/search"
            method="GET"
            onSubmit={() => setIsOpen(false)}
            style={{ display: 'flex', gap: '8px', position: 'relative' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888',
                  fontSize: '14px',
                }}
              ></i>
              <input
                ref={inputRef}
                name="q"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search headlines, topics, sources..."
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  fontSize: '14px',
                  fontFamily: 'Open Sans, sans-serif',
                  border: '2px solid #e2e8f0',
                  borderRadius: '3px',
                  outline: 'none',
                  color: '#111',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                  title="Clear search"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: '#4db2ec',
                color: '#ffffff',
                border: 'none',
                padding: '0 20px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              SEARCH
            </button>
          </form>

          {/* Quick Trending Tags Bar */}
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>
              <i className="fa-solid fa-fire mr-1" style={{ color: '#e53e3e', marginRight: '4px' }}></i>
              TRENDING:
            </span>
            {TRENDING_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTagClick(t)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#334155',
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                #{t}
              </button>
            ))}
          </div>

          {/* Results Status / Spinner */}
          {isLoading && (
            <div style={{ padding: '16px 0 8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <i className="fa-solid fa-circle-notch fa-spin mr-2" style={{ marginRight: '8px', color: '#4db2ec' }}></i>
              Searching 8,100+ live articles...
            </div>
          )}

          {/* Instant Search Results List */}
          {!isLoading && results.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  MATCHING HEADLINES ({total})
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Press <kbd style={{ background: '#eee', padding: '1px 4px', borderRadius: '2px' }}>Enter</kbd> for all results
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map((item) => (
                  <a
                    key={item.id}
                    href={`/news/${item.slug}`}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: '3px',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        style={{
                          width: '64px',
                          height: '46px',
                          minWidth: '64px',
                          objectFit: 'cover',
                          borderRadius: '2px',
                          background: '#111',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '46px',
                          minWidth: '64px',
                          background: '#e2e8f0',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: '16px',
                        }}
                      >
                        <i className="fa-solid fa-newspaper"></i>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span className="td-post-category" style={{ padding: '2px 6px', fontSize: '9px', marginBottom: 0 }}>
                          {item.category || 'News'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Editorial Desk</span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'Roboto, sans-serif',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1e293b',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.headline}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* View all results button */}
              <a
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#4db2ec',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '9px',
                  borderRadius: '3px',
                  marginTop: '12px',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                View all {total} results for &ldquo;{query}&rdquo; →
              </a>
            </div>
          )}

          {/* No results message */}
          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b' }}>
              <i className="fa-regular fa-face-frown" style={{ fontSize: '24px', marginBottom: '8px', color: '#94a3b8' }}></i>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>No stories matched &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Try searching for broader keywords like <em>cricket</em>, <em>market</em>, <em>tech</em>, or <em>minister</em>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
