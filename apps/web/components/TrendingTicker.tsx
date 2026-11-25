'use client'

import React, { useState, useEffect } from 'react'
import type { ArticleCard } from '../lib/cms'

export function TrendingTicker({ stories }: { stories: ArticleCard[] }) {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!stories || stories.length <= 1 || isPaused) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % stories.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [stories, isPaused])

  if (!stories || stories.length === 0) {
    return null
  }

  const current = stories[index] || stories[0]

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + stories.length) % stories.length)
  }

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % stories.length)
  }

  return (
    <div
      className="td-trending-now-wrap"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="td-trending-title">
        <i className="fa-solid fa-bolt mr-1" style={{ marginRight: '6px' }}></i> TRENDING NOW
      </div>
      <div className="td-trending-posts">
        <a href={`/news/${current.slug}`} className="td-trending-post-link">
          {current.headline}
        </a>
      </div>
      <div className="td-trending-nav">
        <button
          type="button"
          className="td-trending-nav-btn"
          aria-label="Previous story"
          onClick={handlePrev}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button
          type="button"
          className="td-trending-nav-btn"
          aria-label="Next story"
          onClick={handleNext}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  )
}
