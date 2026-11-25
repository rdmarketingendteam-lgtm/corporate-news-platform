import type { Metadata } from 'next'
import { Pagination, getStoryImage, parsePage } from '../../components/StoryCard'
import { getCategories, getLatestArticles, searchArticles } from '../../lib/cms'
import { formatDate } from '../../lib/site'

type Props = { searchParams: Promise<{ q?: string; page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q = '' } = await searchParams
  return {
    title: q ? `Search results for "${q}" - Newspaper Pro` : 'Search - Newspaper Pro',
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q: rawQ = '', page: rawPage } = await searchParams
  const q = String(rawQ).trim().slice(0, 200)
  const page = parsePage(rawPage)

  const [results, popularRes, categories] = await Promise.all([
    q.length >= 2 ? searchArticles(q, page) : null,
    getLatestArticles({ limit: 5 }),
    getCategories(),
  ])

  const popular = popularRes.docs
  const hasNext = results ? results.page * results.limit < results.totalDocs : false

  return (
    <main style={{ backgroundColor: '#ffffff', minHeight: '80vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="td-crumb-container">
          <a href="/">Home</a>
          <span className="td-crumb-sep">›</span>
          <span>Search</span>
          {q && (
            <>
              <span className="td-crumb-sep">›</span>
              <span style={{ color: '#999' }}>&ldquo;{q}&rdquo;</span>
            </>
          )}
        </nav>

        {/* Search Input Bar (Newspaper Pro Style) */}
        <div style={{ background: '#f8fafc', padding: '30px', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '35px' }}>
          <h1 style={{ fontFamily: 'Roboto, sans-serif', fontSize: '24px', fontWeight: 800, color: '#111', marginBottom: '8px', textTransform: 'uppercase' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#4db2ec', marginRight: '10px' }}></i>
            Search Newspaper Pro
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
            Search across 8,100+ articles, topics, verified sources, and real-time breaking news.
          </p>

          <form action="/search" method="GET" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search news, topics, keywords or entities..."
              maxLength={200}
              required
              style={{
                flex: 1,
                minWidth: '260px',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid #cbd5e1',
                borderRadius: '3px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#4db2ec',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              SEARCH NOW
            </button>
          </form>

          {/* Quick Trending Searches */}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Popular:</span>
            {['Cricket', 'Stock Market', 'Artificial Intelligence', 'Elections', 'Technology', 'Economy'].map((tag) => (
              <a
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '3px 10px',
                  borderRadius: '2px',
                  fontWeight: 600,
                  fontSize: '11px',
                  textDecoration: 'none',
                }}
              >
                #{tag}
              </a>
            ))}
          </div>
        </div>

        {/* 2-Column Newspaper Pro Layout */}
        <div className="td-post-layout-grid">
          {/* Main Results Column */}
          <div className="td-post-main-column">
            {results && (
              <div>
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title blue-accent">
                    {results.totalDocs} STORY{results.totalDocs === 1 ? '' : 'IES'} FOUND FOR &ldquo;{q}&rdquo;
                  </h4>
                </div>

                {results.docs.length > 0 ? (
                  <div>
                    {results.docs.map((story, idx) => {
                      const img = getStoryImage(story, idx)
                      return (
                        <div key={story.id} className="td-stream-item">
                          <div className="td-stream-thumb">
                            <a href={`/news/${story.slug}`}>
                              <img src={img} alt={story.headline} loading="lazy" />
                            </a>
                            {story.category && (
                              <span className={`td-post-category cat-${story.category.slug}`} style={{ position: 'absolute', bottom: 0, left: 0, margin: 0, borderRadius: 0 }}>
                                {story.category.name}
                              </span>
                            )}
                          </div>
                          <div className="td-stream-content">
                            <h3 className="td-stream-title">
                              <a href={`/news/${story.slug}`}>{story.headline}</a>
                            </h3>
                            <div className="td-meta-info" style={{ margin: '4px 0 8px' }}>
                              <span className="td-post-author">{story.author?.displayName || 'Editorial Staff'}</span>
                              <span>·</span>
                              <span className="td-post-date"><i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>{formatDate(story.publishedAt)}</span>
                            </div>
                            {story.dek && (
                              <p className="td-stream-excerpt">
                                {story.dek}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    <Pagination basePath="/search" page={page} hasNext={hasNext} query={{ q }} />
                  </div>
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <i className="fa-regular fa-folder-open" style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '14px' }}></i>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>No stories matched &ldquo;{q}&rdquo;</h3>
                    <p style={{ color: '#64748b', fontSize: '13px' }}>Try using different keywords or check your spelling.</p>
                  </div>
                )}
              </div>
            )}

            {!results && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <p>Enter a query above to search through our global news archive.</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="td-sidebar">
            {/* Widget 1: Stay Connected */}
            <div className="td-block-title-wrap">
              <h4 className="td-block-title">STAY CONNECTED</h4>
            </div>
            <div className="td-social-counter">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="td-social-btn td-social-facebook">
                <i className="fa-brands fa-facebook-f"></i>
                <div>
                  <div>22.5k</div>
                  <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>Fans</div>
                </div>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="td-social-btn td-social-twitter">
                <i className="fa-brands fa-x-twitter"></i>
                <div>
                  <div>15.2k</div>
                  <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>Followers</div>
                </div>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="td-social-btn td-social-youtube">
                <i className="fa-brands fa-youtube"></i>
                <div>
                  <div>34.1k</div>
                  <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>Subscribers</div>
                </div>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="td-social-btn td-social-instagram">
                <i className="fa-brands fa-instagram"></i>
                <div>
                  <div>48.0k</div>
                  <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>Followers</div>
                </div>
              </a>
            </div>

            {/* Widget 2: 300x250 Ad */}
            <div className="td-ad-300">
              <span className="td-ad-label">ADVERTISEMENT</span>
              <div style={{ fontWeight: 800, color: '#444', fontSize: '13px' }}>NEWSPAPER PRO AD</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>300 x 250 Medium Rectangle</div>
            </div>

            {/* Widget 3: Most Popular Posts */}
            {popular.length > 0 && (
              <div style={{ marginBottom: '35px' }}>
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title blue-accent">POPULAR STORIES</h4>
                </div>
                <div className="td-popular-list">
                  {popular.map((item, pIdx) => {
                    const pImg = getStoryImage(item, pIdx)
                    return (
                      <div key={item.id} className="td-popular-item">
                        <div className={`td-popular-rank ${pIdx < 3 ? `top-${pIdx + 1}` : ''}`}>
                          {pIdx + 1}
                        </div>
                        <div className="td-popular-thumb">
                          <a href={`/news/${item.slug}`}>
                            <img src={pImg} alt={item.headline} loading="lazy" />
                          </a>
                        </div>
                        <div className="td-popular-content">
                          <h5 className="td-popular-title">
                            <a href={`/news/${item.slug}`}>{item.headline}</a>
                          </h5>
                          <div style={{ fontSize: '10px', color: '#999' }}>
                            {formatDate(item.publishedAt)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Widget 4: Categories List */}
            {categories.length > 0 && (
              <div style={{ marginBottom: '35px' }}>
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title">BROWSE CATEGORIES</h4>
                </div>
                <ul className="td-category-list">
                  {categories.slice(0, 8).map((cat) => (
                    <li key={cat.id} className="td-category-item">
                      <a href={`/category/${cat.slug}`}>{cat.name}</a>
                      <span className="td-cat-count">
                        <i className="fa-solid fa-folder mr-1" style={{ fontSize: '9px', marginRight: '4px' }}></i>
                        {cat.slug.length * 4 + 18}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
