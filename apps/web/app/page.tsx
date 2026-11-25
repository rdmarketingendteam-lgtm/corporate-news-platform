import { JsonLd } from '../components/JsonLd'
import { NewsletterForm } from '../components/NewsletterForm'
import { AspiriAdBanner } from '../components/AspiriAdBanner'
import { ApprovedBacklinksDirectory } from '../components/ApprovedBacklinksDirectory'
import {
  getCategories,
  getLatestArticles,
  getArticlesSummary,
  getCategoryDistribution,
  ArticleCard,
} from '../lib/cms'
import { absoluteUrl, site } from '../lib/site'

export const revalidate = 120

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'
const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80'

function getStoryImage(story?: ArticleCard | null, fallback = FALLBACK_THUMB): string {
  if (!story) return fallback
  return story.featuredMedia?.url || fallback
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Recent'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recent'
  }
}

function getCategoryClass(slug?: string): string {
  const clean = (slug || '').toLowerCase()
  if (clean.includes('tech')) return 'cat-technology'
  if (clean.includes('ent')) return 'cat-entertainment'
  if (clean.includes('sport')) return 'cat-sports'
  if (clean.includes('biz') || clean.includes('bus')) return 'cat-business'
  if (clean.includes('world')) return 'cat-world'
  if (clean.includes('india')) return 'cat-india'
  if (clean.includes('life')) return 'cat-lifestyle'
  return ''
}

export default async function HomePage() {
  const [
    latestRes,
    distributionRes,
    categories,
    summary,
  ] = await Promise.all([
    getLatestArticles({ limit: 24 }),
    getCategoryDistribution({ limitPerCategory: 8 }),
    getCategories(),
    getArticlesSummary(),
  ])

  const allStories = latestRes.docs
  const heroStory = allStories[0] || null
  const quadStories = allStories.length >= 5 ? allStories.slice(1, 5) : allStories.slice(1, Math.min(allStories.length, 5))
  const dontMissMain = allStories[5] || allStories[0] || null
  const dontMissList = allStories.slice(6, 9).length > 0 ? allStories.slice(6, 9) : allStories.slice(1, 4)
  // Balanced 5 featured stream stories for the 8-column column
  const streamStories = allStories.slice(9, 14)
  // Remaining stories displayed across the full-width 12-column magazine grid below
  const fullWidthStories = allStories.slice(14, 22)

  const catMap = distributionRes.categories_map || {}
  const rawEnt = catMap['entertainment']?.articles || []
  const rawTech = catMap['technology']?.articles || []
  const rawSports = catMap['sports']?.articles || []
  const rawBiz = catMap['business']?.articles || []

  // Dynamic fallback: If one part/category is short, fill it dynamically from another part on the homepage!
  const entStories = rawEnt.length >= 2 ? rawEnt : [...rawEnt, ...allStories.filter(s => s.category?.slug !== 'technology')].slice(0, 4)
  const techStories = rawTech.length >= 3 ? rawTech : [...rawTech, ...allStories.filter(s => s.category?.slug !== 'entertainment')].slice(0, 3)
  const sportsStories = rawSports.length >= 3 ? rawSports : [...rawSports, ...allStories.filter(s => s.category?.slug !== 'business')].slice(0, 3)
  const bizStories = rawBiz.length >= 3 ? rawBiz : [...rawBiz, ...allStories.filter(s => s.category?.slug !== 'sports')].slice(0, 3)

  // Top 5 popular stories for sidebar
  const popularStories = allStories.slice(0, 5)
  // Editor's picks for sidebar depth balancing
  const editorsPicks = allStories.slice(5, 9)

  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.name,
          url: site.url,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${absoluteUrl('/search')}?q={query}`,
            'query-input': 'required name=query',
          },
        }}
      />

      {/* ========================================================
          1. TAGDIV BIG GRID FLEX 5 (Signature 5-Story Hero Grid)
          ======================================================== */}
      <section className="container">
        <div className="td-big-grid-flex-5">
          {/* Main Massive Card (Left) */}
          <div className="td-big-grid-main td-grid-item">
            {heroStory && (
              <>
                <img
                  src={getStoryImage(heroStory, FALLBACK_HERO)}
                  alt={heroStory.headline}
                />
                <div className="td-grid-overlay">
                  <span className={`td-post-category ${getCategoryClass(heroStory.category?.slug)}`}>
                    {heroStory.category?.name || 'General'}
                  </span>
                  <h2 className="td-grid-main-title">
                    <a href={`/news/${heroStory.slug}`} style={{ color: '#ffffff' }}>
                      {heroStory.headline}
                    </a>
                  </h2>
                  <div className="td-grid-meta">
                    <span className="td-grid-author">{heroStory.author?.displayName || 'Editorial Staff'}</span>
                    <span>-</span>
                    <span className="td-grid-date">{formatDate(heroStory.publishedAt)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quad Grid Cards (Right 2x2) */}
          <div className="td-big-grid-quad">
            {quadStories.map((story) => (
              <div key={story.id} className="td-grid-item">
                <img
                  src={getStoryImage(story)}
                  alt={story.headline}
                />
                <div className="td-grid-overlay" style={{ padding: '14px' }}>
                  <span className={`td-post-category ${getCategoryClass(story.category?.slug)}`}>
                    {story.category?.name || 'News'}
                  </span>
                  <h3 className="td-grid-sub-title">
                    <a href={`/news/${story.slug}`} style={{ color: '#ffffff' }}>
                      {story.headline}
                    </a>
                  </h3>
                  <div className="td-grid-meta" style={{ fontSize: '10px' }}>
                    <span className="td-grid-date">{formatDate(story.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          2. MAIN MAGAZINE CONTENT & SIDEBAR (8 cols + 4 cols)
          ======================================================== */}
      <div className="container">
        <div className="row">
          {/* LEFT 8 COLUMNS: MAGAZINE BLOCKS */}
          <div className="col-lg-8 col-md-12">
            {/* BLOCK 1: DON'T MISS */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title blue-accent">Don&apos;t Miss</h4>
                <div className="td-pulldown-subcat d-none d-sm-block">
                  <a href="/category/lifestyle" className="active">All</a>
                  <a href="/category/technology">Technology</a>
                  <a href="/category/business">Business</a>
                  <a href="/category/sports">Sports</a>
                </div>
              </div>

              <div className="row">
                {/* Left Featured Post */}
                <div className="col-md-6 mb-3 mb-md-0">
                  {dontMissMain && (
                    <div>
                      <div className="td-module-thumb" style={{ height: '220px' }}>
                        <a href={`/news/${dontMissMain.slug}`}>
                          <img src={getStoryImage(dontMissMain)} alt={dontMissMain.headline} />
                        </a>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <span className={`td-post-category ${getCategoryClass(dontMissMain.category?.slug)}`}>
                          {dontMissMain.category?.name || 'Features'}
                        </span>
                        <h3 className="td-post-title" style={{ fontSize: '18px', lineHeight: '1.3' }}>
                          <a href={`/news/${dontMissMain.slug}`}>{dontMissMain.headline}</a>
                        </h3>
                        <div className="td-meta-info">
                          <span className="td-post-author">{dontMissMain.author?.displayName || 'Editorial Staff'}</span>
                          <span>-</span>
                          <span className="td-post-date">{formatDate(dontMissMain.publishedAt)}</span>
                        </div>
                        <p className="td-excerpt" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {dontMissMain.dek || 'Read the full in-depth report on our dedicated newsroom portal.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 3 Compact Posts */}
                <div className="col-md-6">
                  {dontMissList.map((item) => (
                    <div key={item.id} className="td-list-item">
                      <div className="td-list-thumb">
                        <a href={`/news/${item.slug}`}>
                          <img src={getStoryImage(item)} alt={item.headline} />
                        </a>
                      </div>
                      <div className="td-list-content">
                        <h4 className="td-list-title">
                          <a href={`/news/${item.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.headline}
                          </a>
                        </h4>
                        <div className="td-meta-info" style={{ margin: 0 }}>
                          <span className="td-post-date">{formatDate(item.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BLOCK 2: LIFESTYLE & ENTERTAINMENT (2-Column Grid) */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Lifestyle News</h4>
                <div className="td-pulldown-subcat d-none d-sm-block">
                  <a href="/category/entertainment">Entertainment</a>
                  <a href="/category/sports">Sports</a>
                </div>
              </div>

              <div className="row">
                {entStories.slice(0, 2).map((item) => (
                  <div key={item.id} className="col-md-6 mb-3">
                    <div className="td-module-thumb" style={{ height: '170px' }}>
                      <a href={`/news/${item.slug}`}>
                        <img src={getStoryImage(item)} alt={item.headline} />
                      </a>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className={`td-post-category ${getCategoryClass(item.category?.slug)}`}>
                        {item.category?.name || 'Entertainment'}
                      </span>
                      <h4 className="td-post-title" style={{ fontSize: '15px', lineHeight: '1.3' }}>
                        <a href={`/news/${item.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.headline}
                        </a>
                      </h4>
                      <div className="td-meta-info">
                        <span className="td-post-date">{formatDate(item.publishedAt)}</span>
                      </div>
                      <p className="td-excerpt" style={{ fontSize: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.dek || 'Explore full analysis and verified commentary on this developing topic.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MID-PAGE ADVERTISEMENT (Aspiri Fine Jewels 728x90 Showcase) */}
            <div className="my-4 d-flex justify-content-center">
              <AspiriAdBanner variant="midpage-728" />
            </div>

            {/* BLOCK 3: TECHNOLOGY HIGHLIGHTS (3-Column Grid) */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Gadgets &amp; Technology</h4>
              </div>

              <div className="row">
                {techStories.slice(0, 3).map((item) => (
                  <div key={item.id} className="col-md-4 mb-3">
                    <div className="td-module-thumb" style={{ height: '130px' }}>
                      <a href={`/news/${item.slug}`}>
                        <img src={getStoryImage(item)} alt={item.headline} />
                      </a>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span className="td-post-category cat-technology">Tech</span>
                      <h5 className="td-post-title" style={{ fontSize: '13px', lineHeight: '1.35', fontWeight: 700 }}>
                        <a href={`/news/${item.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.headline}
                        </a>
                      </h5>
                      <div className="td-meta-info" style={{ fontSize: '10px' }}>
                        <span>{formatDate(item.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOCK 4: SPORTS SPOTLIGHT (3-Column Grid) */}
            {sportsStories.length > 0 && (
              <div className="mb-4">
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title">Sports Arena</h4>
                  <div className="td-pulldown-subcat d-none d-sm-block">
                    <a href="/category/sports" className="active">All Sports</a>
                    <a href="/category/sports">Cricket</a>
                    <a href="/category/sports">Football</a>
                  </div>
                </div>

                <div className="row">
                  {sportsStories.slice(0, 3).map((item) => (
                    <div key={item.id} className="col-md-4 mb-3">
                      <div className="td-module-thumb" style={{ height: '130px' }}>
                        <a href={`/news/${item.slug}`}>
                          <img src={getStoryImage(item)} alt={item.headline} />
                        </a>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <span className="td-post-category cat-sports">Sports</span>
                        <h5 className="td-post-title" style={{ fontSize: '13px', lineHeight: '1.35', fontWeight: 700 }}>
                          <a href={`/news/${item.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.headline}
                          </a>
                        </h5>
                        <div className="td-meta-info" style={{ fontSize: '10px' }}>
                          <span>{formatDate(item.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BLOCK 5: LATEST ARTICLES (Horizontal Stream Modules) */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Latest Articles</h4>
              </div>

              <div className="td-stream-list">
                {streamStories.map((story) => (
                  <div key={story.id} className="td-stream-item">
                    <div className="td-stream-thumb">
                      <a href={`/news/${story.slug}`}>
                        <img src={getStoryImage(story)} alt={story.headline} />
                      </a>
                    </div>
                    <div className="td-stream-content">
                      <span className={`td-post-category ${getCategoryClass(story.category?.slug)}`}>
                        {story.category?.name || 'News'}
                      </span>
                      <h3 className="td-stream-title">
                        <a href={`/news/${story.slug}`}>{story.headline}</a>
                      </h3>
                      <div className="td-meta-info">
                        <span className="td-post-author">{story.author?.displayName || 'Editorial Staff'}</span>
                        <span>-</span>
                        <span className="td-post-date">{formatDate(story.publishedAt)}</span>
                      </div>
                      <p className="td-stream-excerpt">
                        {story.dek || 'Full coverage and updates available on our continuous newsfeed.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: NEWSPAPER PRO SIDEBAR */}
          <div className="col-lg-4 col-md-12 td-sidebar">
            {/* WIDGET 1: STAY CONNECTED (Social Counter) */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Stay Connected</h4>
              </div>
              <div className="td-social-counter">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="td-social-btn td-social-facebook">
                  <i className="fa-brands fa-facebook-f"></i>
                  <div>
                    <div>22,550</div>
                    <div style={{ fontSize: '9px', fontWeight: 500 }}>Fans</div>
                  </div>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="td-social-btn td-social-twitter">
                  <i className="fa-brands fa-x-twitter"></i>
                  <div>
                    <div>15,200</div>
                    <div style={{ fontSize: '9px', fontWeight: 500 }}>Followers</div>
                  </div>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="td-social-btn td-social-youtube">
                  <i className="fa-brands fa-youtube"></i>
                  <div>
                    <div>35,800</div>
                    <div style={{ fontSize: '9px', fontWeight: 500 }}>Subscribers</div>
                  </div>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="td-social-btn td-social-instagram">
                  <i className="fa-brands fa-instagram"></i>
                  <div>
                    <div>42,100</div>
                    <div style={{ fontSize: '9px', fontWeight: 500 }}>Followers</div>
                  </div>
                </a>
              </div>
            </div>

            {/* WIDGET 2: ASPIRI LUXURY JEWELRY 300x250 SIDEBAR SPOT */}
            <div className="mb-4 d-flex justify-content-center">
              <AspiriAdBanner variant="sidebar-300" />
            </div>

            {/* WIDGET 3: MOST POPULAR (Numbered 1-5 Ranking) */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Most Popular</h4>
              </div>
              <div className="td-popular-list">
                {popularStories.map((story, idx) => (
                  <div key={story.id} className="td-popular-item">
                    <div className={`td-popular-rank top-${idx + 1}`}>{idx + 1}</div>
                    <div className="td-popular-thumb">
                      <a href={`/news/${story.slug}`}>
                        <img src={getStoryImage(story)} alt={story.headline} />
                      </a>
                    </div>
                    <div className="td-popular-content">
                      <h5 className="td-popular-title">
                        <a href={`/news/${story.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {story.headline}
                        </a>
                      </h5>
                      <div className="td-meta-info" style={{ margin: 0, fontSize: '10px' }}>
                        <span>{formatDate(story.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WIDGET 4: POPULAR CATEGORIES */}
            <div className="mb-4">
              <div className="td-block-title-wrap">
                <h4 className="td-block-title">Popular Categories</h4>
              </div>
              <ul className="td-category-list">
                {categories.map((c) => (
                  <li key={c.id} className="td-category-item">
                    <a
                      href={`/category/${c.slug}`}
                      style={{ outline: 'none', border: 'none', textDecoration: 'none', boxShadow: 'none' }}
                    >
                      {c.name}
                    </a>
                    <span className="td-cat-count">
                      {summary.categories[c.slug] || 150}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* WIDGET 5: EDITOR'S TOP PICKS (Balancing Widget) */}
            {editorsPicks.length > 0 && (
              <div className="mb-4">
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title blue-accent">Editor&apos;s Choice</h4>
                </div>
                <div className="td-popular-list">
                  {editorsPicks.map((story) => (
                    <div key={story.id} className="td-popular-item">
                      <div className="td-popular-thumb" style={{ width: '80px', height: '60px', flexShrink: 0 }}>
                        <a href={`/news/${story.slug}`}>
                          <img src={getStoryImage(story)} alt={story.headline} />
                        </a>
                      </div>
                      <div className="td-popular-content">
                        <h5 className="td-popular-title" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                          <a href={`/news/${story.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {story.headline}
                          </a>
                        </h5>
                        <div className="td-meta-info" style={{ margin: 0, fontSize: '10px' }}>
                          <span>{formatDate(story.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WIDGET 5.5: APPROVED CONTRIBUTOR BACKLINKS DIRECTORY */}
            <ApprovedBacklinksDirectory variant="sidebar" />

            {/* WIDGET 6: NEWSLETTER BOX */}
            <div className="mb-4 p-4" style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', color: '#4db2ec', marginBottom: '8px' }}>
                <i className="fa-regular fa-envelope"></i>
              </div>
              <h4 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                Subscribe to Newspaper
              </h4>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                Get the best news delivered straight to your inbox daily. No spam, ever.
              </p>
              <NewsletterForm variant="stacked" placeholder="Your email address" buttonText="Subscribe" />
            </div>

            {/* WIDGET 7: STICKY DESKTOP SIDEBAR CONTAINER (Permanently eliminates any blank space) */}
            <div
              className="td-sticky-bottom-sidebar"
              style={{
                position: 'sticky',
                top: '90px',
                marginTop: '20px',
                zIndex: 20,
              }}
            >
              {/* Aspiri Luxury Ad Banner */}
              <div className="mb-4 d-flex justify-content-center">
                <AspiriAdBanner variant="sidebar-300" />
              </div>

              {/* Sticky Trending Digest / Quick Links */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#0284c7',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fa-solid fa-bolt"></i>
                  <span>Trending Continuous Newsfeed</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <a href="/category/world" style={{ color: '#334155', textDecoration: 'none', fontWeight: 600 }}>
                    &bull; Global Geopolitics &amp; World Updates &rarr;
                  </a>
                  <a href="/category/business" style={{ color: '#334155', textDecoration: 'none', fontWeight: 600 }}>
                    &bull; Market Indexes &amp; Financial Markets &rarr;
                  </a>
                  <a href="/category/technology" style={{ color: '#334155', textDecoration: 'none', fontWeight: 600 }}>
                    &bull; AI, Innovations &amp; Emerging Tech &rarr;
                  </a>
                  <a href="https://aspiri.in" target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 700 }}>
                    &bull; Discover Aspiri Fine Jewels &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. FULL-WIDTH 12-COLUMN DISCOVERY GRID (Balanced Layout)
          ======================================================== */}
      {fullWidthStories.length > 0 && (
        <section className="container my-5">
          <div className="td-block-title-wrap">
            <h4 className="td-block-title">In-Depth Reports &amp; Trending Features</h4>
            <div className="td-pulldown-subcat d-none d-sm-block">
              <a href="/category/world" className="active">All Topics</a>
              <a href="/category/technology">Technology</a>
              <a href="/category/business">Business</a>
              <a href="/category/sports">Sports</a>
              <a href="/category/entertainment">Entertainment</a>
            </div>
          </div>

          <div className="row">
            {fullWidthStories.map((story) => (
              <div key={story.id} className="col-lg-3 col-md-6 mb-4">
                <div style={{ background: '#ffffff', border: '1px solid #f0f0f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div className="td-module-thumb" style={{ height: '160px', position: 'relative' }}>
                    <a href={`/news/${story.slug}`}>
                      <img src={getStoryImage(story)} alt={story.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                    <span
                      className={`td-post-category ${getCategoryClass(story.category?.slug)}`}
                      style={{ position: 'absolute', bottom: '8px', left: '8px', margin: 0 }}
                    >
                      {story.category?.name || 'News'}
                    </span>
                  </div>
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, lineHeight: '1.35', marginBottom: '8px', flex: 1 }}>
                      <a href={`/news/${story.slug}`} style={{ color: '#222222', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {story.headline}
                      </a>
                    </h4>
                    <div className="td-meta-info" style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                      <span className="td-post-author" style={{ color: '#666', fontWeight: 600 }}>{story.author?.displayName || 'Editorial Staff'}</span>
                      <span style={{ margin: '0 4px' }}>-</span>
                      <span className="td-post-date">{formatDate(story.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-3">
            <a
              href="/category/latest"
              className="header-btn header-btn-primary"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: '2px',
              }}
            >
              Browse All Newsroom Archives →
            </a>
          </div>
        </section>
      )}
    </main>
  )
}
