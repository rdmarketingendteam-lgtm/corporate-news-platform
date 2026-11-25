import type { ArticleCard } from '../lib/cms'
import { formatDate } from '../lib/site'

export const DEFAULT_IMAGES = [
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbc29_Rectangle_8_2-1bh3sr9.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbc4b_Rectangle_9_4-49q3m7.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbc7b_Rectangle_9_5-1dism4t.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbc99_Rectangle_9_6-6i860r.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbcae_Rectangle_9_7-1e1tvq6.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbd04_Rectangle_9_9-1dy7fxz.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbcf3_Rectangle_9_10-19m8t3t.png',
  '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbd24_Rectangle_15-1a0x3tc.png',
]

export function getStoryImage(story: ArticleCard, fallbackIndex = 0) {
  return (
    story.featuredMedia?.sizes?.hero?.url ??
    story.featuredMedia?.sizes?.card?.url ??
    story.featuredMedia?.url ??
    DEFAULT_IMAGES[fallbackIndex % DEFAULT_IMAGES.length]
  )
}

/** Hero Section Primary Broadsheet Card (news-card-v1) */
export function HeroCardV1({ story }: { story: ArticleCard }) {
  const img = getStoryImage(story, 0)
  const categoryName = story.category?.name ?? 'Headlines'
  const categorySlug = story.category?.slug ?? 'india'
  const authorName = story.author?.displayName ?? 'News Desk'

  return (
    <div className="news-card-v1">
      <a href={`/news/${story.slug}`} className="image-wrap w-inline-block">
        <img src={img} alt={story.headline} className="news-image-v1" />
        <div className="news-card-shape-v1"></div>
      </a>
      <div className="news-content-wrapper-v1">
        <a href={`/category/${categorySlug}`} className="news-category-text-v1">
          {categoryName}
          {story.accessLevel === 'subscribers' && <span className="badge-subscriber">Subscriber</span>}
        </a>
        <a href={`/news/${story.slug}`} className="news-title-v1">
          {story.headline}
        </a>
        <div className="news-category-text-wrap">
          <span className="date-text-v1">{authorName}</span>
          <div className="dot-01"></div>
          <time className="date-text-v1" dateTime={story.publishedAt ?? undefined}>
            {formatDate(story.publishedAt)}
          </time>
        </div>
      </div>
    </div>
  )
}

/** Hero Secondary Card (news-card-v2) with "Read full story" button */
export function HeroCardV2({ story }: { story: ArticleCard }) {
  const authorName = story.author?.displayName ?? 'Editorial Staff'

  return (
    <div className="news-card-v2">
      <div className="news-tag-button-v2">
        <div className="news-tags-wrap-v2">
          <span className="author-name-v2">{authorName}</span>
          <p className="author-name-v2">|</p>
          <time className="author-name-v2" dateTime={story.publishedAt ?? undefined}>
            {formatDate(story.publishedAt)}
          </time>
        </div>
        <a href={`/news/${story.slug}`} className="line-button w-inline-block">
          <div className="line-button-text-wrap">
            <div className="line-button-area">
              <p className="line-button-text">Read full story</p>
            </div>
            <div className="line"></div>
          </div>
          <div className="arrow-icon-wrap">
            <img
              src="/_external/cdn.prod.website-files.com/692401e8be8549a781fdbb92/692401e8be8549a781fdbcaa_arrow_1-g2r5ng.svg"
              alt=""
              className="arrow-icon-right"
            />
          </div>
        </a>
      </div>
      <div className="news-title-wrap-v2">
        <a href={`/news/${story.slug}`} className="news-title-v2">
          {story.headline}
        </a>
        {story.dek && <p className="news-card-description-v2">{story.dek}</p>}
      </div>
    </div>
  )
}

/** Standard Grid Card (world-news-card) */
export function StoryCard({ story, index = 0 }: { story: ArticleCard; showImage?: boolean; index?: number }) {
  const img = getStoryImage(story, index)
  const authorName = story.author?.displayName ?? (story.category?.name || 'News')

  return (
    <div className="world-news-card">
      <a href={`/news/${story.slug}`} className="world-news-image-wrap w-inline-block">
        <img src={img} alt={story.headline} className="world-news-image" />
      </a>
      <div className="world-news-content-wrap">
        <div className="news-tags-wrap-v2">
          <span className="author-name-v2">{authorName}</span>
          <p className="author-name-v2">|</p>
          <time className="author-name-v2" dateTime={story.publishedAt ?? undefined}>
            {formatDate(story.publishedAt)}
          </time>
          {story.accessLevel === 'subscribers' && <span className="badge-subscriber">Subscriber</span>}
        </div>
        <a href={`/news/${story.slug}`} className="world-news-title">
          {story.headline}
        </a>
      </div>
    </div>
  )
}

/** Global Stories Horizontal Card (global-stories-card) */
export function GlobalStoryCard({ story, index = 0 }: { story: ArticleCard; index?: number }) {
  const img = getStoryImage(story, index + 3)
  const categoryName = story.category?.name ?? 'Report'
  const categorySlug = story.category?.slug ?? 'india'

  return (
    <div className="global-stories-card">
      <a href={`/news/${story.slug}`} className="global-stories-card-image-wrap w-inline-block">
        <img src={img} alt={story.headline} className="global-stories-card-image" />
      </a>
      <div className="global-stories-content-wrap">
        <div className="news-category-text-wrap">
          <a href={`/category/${categorySlug}`} className="global-stories-category-text">
            {categoryName}
          </a>
          <div className="dot-01"></div>
          <time className="global-stories-category-text" dateTime={story.publishedAt ?? undefined}>
            {formatDate(story.publishedAt)}
          </time>
        </div>
        <a href={`/news/${story.slug}`} className="world-news-title">
          {story.headline}
        </a>
      </div>
    </div>
  )
}

/** Health / Economy Section Card (health-card) */
export function CategoryFeatureCard({ story, index = 0 }: { story: ArticleCard; index?: number }) {
  const img = getStoryImage(story, index + 5)
  const categoryName = story.category?.name ?? 'Finance'
  const categorySlug = story.category?.slug ?? 'business'

  return (
    <div className="health-card">
      <a href={`/news/${story.slug}`} className="health-image-wrap w-inline-block">
        <img src={img} alt={story.headline} className="health-image" />
      </a>
      <div className="health-content-wrap">
        <div className="news-category-text-wrap _02">
          <a href={`/category/${categorySlug}`} className="global-stories-category-text">
            {categoryName}
          </a>
          <div className="dot-01"></div>
          <time className="global-stories-category-text" dateTime={story.publishedAt ?? undefined}>
            {formatDate(story.publishedAt)}
          </time>
        </div>
        <a href={`/news/${story.slug}`} className="world-news-title">
          {story.headline}
        </a>
      </div>
    </div>
  )
}

/** Sports & Entertainment Card (sports-card) */
export function SportsCard({ story, index = 0 }: { story: ArticleCard; index?: number }) {
  const img = getStoryImage(story, index + 7)
  const categoryName = story.category?.name ?? 'Sports'
  const categorySlug = story.category?.slug ?? 'sports'

  return (
    <div className="sports-card">
      <a href={`/news/${story.slug}`} className="w-inline-block">
        <img src={img} alt={story.headline} className="sports-image" />
        <div className="news-card-shape-v1"></div>
      </a>
      <div className="sports-content-wrap">
        <a href={`/category/${categorySlug}`} className="health-service-tag">
          {categoryName}
        </a>
        <a href={`/news/${story.slug}`} className="sports-title">
          {story.headline}
        </a>
      </div>
    </div>
  )
}

/** Story List Component for Listings and Search */
export function StoryList({ stories, empty }: { stories: ArticleCard[]; empty?: string }) {
  if (!stories.length) return <p style={{ padding: '32px 0', color: '#6b7280', textAlign: 'center' }}>{empty ?? 'No stories yet.'}</p>
  return (
    <div className="w-dyn-list">
      <div role="list" className="news-collection-list-v1 w-dyn-items">
        {stories.map((s, idx) => (
          <div key={s.id} role="listitem" className="w-dyn-item">
            <StoryCard story={s} index={idx} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function parsePage(raw?: string): number {
  const p = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(p) && p > 0 ? p : 1
}

export function Pagination({ basePath, page, hasNext, query = {} }: { basePath: string; page: number; hasNext: boolean; query?: Record<string, string> }) {
  const href = (p: number) => {
    const params = new URLSearchParams({ ...query, ...(p > 1 ? { page: String(p) } : {}) })
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }
  if (page <= 1 && !hasNext) return null
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', margin: '40px 0' }} aria-label="Pagination">
      {page > 1 ? (
        <a href={href(page - 1)} className="header-btn header-btn-secondary" rel="prev">
          ← Newer
        </a>
      ) : null}
      <span style={{ fontWeight: 600, fontSize: '14px' }}>Page {page}</span>
      {hasNext ? (
        <a href={href(page + 1)} className="header-btn header-btn-secondary" rel="next">
          Older →
        </a>
      ) : null}
    </nav>
  )
}
