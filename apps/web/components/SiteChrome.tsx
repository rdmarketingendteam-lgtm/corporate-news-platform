import { getCategoryDistribution, getLatestArticles, getArticlesSummary, getCategories, ArticleCard } from '../lib/cms'
import { site } from '../lib/site'
import { HeaderAuthLinks } from './HeaderAuthLinks'
import { HeaderSearch } from './HeaderSearch'
import { NewsletterForm } from './NewsletterForm'
import { TrendingTicker } from './TrendingTicker'
import { AspiriAdBanner } from './AspiriAdBanner'

export async function SiteHeader() {
  const [distributionRes, latestArticles, summary, allCategories] = await Promise.all([
    getCategoryDistribution({ limitPerCategory: 4 }),
    getLatestArticles({ limit: 8 }),
    getArticlesSummary(),
    getCategories(),
  ])

  const breakingStories = latestArticles.docs.slice(0, 5)
  const mainBreaking = breakingStories[0]

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  // Categories list
  const apiCategories = distributionRes.categories.length > 0
    ? distributionRes.categories
    : allCategories.map((c) => ({
        slug: c.slug,
        name: c.name,
        total_articles: 100,
        count: 0,
        articles: [] as ArticleCard[],
      }))

  const priorityOrder = ['top', 'india', 'world', 'business', 'technology', 'sports', 'entertainment', 'lifestyle']
  const sortedCategories = [...apiCategories].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.slug)
    const idxB = priorityOrder.indexOf(b.slug)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return b.total_articles - a.total_articles
  })

  const totalCollected = summary.total > 0 ? summary.total.toLocaleString() : '8,100+'

  return (
    <header className="td-header-wrap">
      {/* 1. TOP BAR */}
      <div className="td-top-bar">
        <div className="container d-flex justify-content-between align-items-center" style={{ maxWidth: '1200px' }}>
          {/* Left: Weather, Date, Live Scraper Stats */}
          <div className="d-flex align-items-center" style={{ gap: '14px' }}>
            <div className="td-weather-box">
              <i className="fa-solid fa-cloud-sun" style={{ color: '#4db2ec' }}></i>
              <span className="td-weather-temp">24.2°C</span>
              <span>New Delhi</span>
            </div>
            <div className="td-top-date d-none d-md-block">
              <i className="fa-regular fa-calendar mr-1" style={{ marginRight: '5px', color: '#999' }}></i>
              {todayStr}
            </div>
            <div className="d-none d-xl-flex align-items-center" style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              <span>{totalCollected} Articles Live</span>
            </div>
          </div>

          {/* Right: User links & Socials */}
          <div className="d-flex align-items-center" style={{ gap: '18px' }}>
            <div className="d-flex align-items-center" style={{ gap: '12px', fontSize: '11px', fontWeight: 600 }}>
              <a href="/subscribe" style={{ color: '#4db2ec', fontWeight: 700 }}>
                <i className="fa-solid fa-bolt mr-1" style={{ marginRight: '4px' }}></i> Subscribe
              </a>
              <span style={{ color: '#ccc' }}>|</span>
              <HeaderAuthLinks />
            </div>

            <div className="td-top-socials d-none d-lg-inline-flex">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter"><i className="fa-brands fa-x-twitter"></i></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube"><i className="fa-brands fa-youtube"></i></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram"><i className="fa-brands fa-instagram"></i></a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Newspaper Logo + 728x90 Header Leaderboard) */}
      <div className="td-header-wrapper">
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="row align-items-center">
            {/* Logo */}
            <div className="col-lg-4 col-md-12 text-center text-lg-left">
              <a href="/" style={{ display: 'inline-flex', flexDirection: 'column', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '42px', fontWeight: 900, color: '#111', letterSpacing: '-1.5px', lineHeight: 1 }}>
                    NEWSPAPER
                  </span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4db2ec', display: 'inline-block', marginLeft: '3px' }}></span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#888', marginTop: '4px' }}>
                  DISCOVER THE WORLD&apos;S LEADING STORIES
                </span>
              </a>
            </div>

            {/* 728x90 Header Sponsor Spot (Aspiri Fine Jewels) */}
            <div className="col-lg-8 col-md-12 td-header-ad-box d-flex justify-content-end align-items-center">
              <AspiriAdBanner variant="header-728" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION BAR (Sticky Black Bar with Active States & Interactive Search) */}
      <nav className="td-main-nav-wrap">
        <div className="container d-flex justify-content-between align-items-center" style={{ maxWidth: '1200px' }}>
          <ul className="td-main-menu" style={{ overflowX: 'auto', flex: 1 }}>
            <li className="active">
              <a href="/">HOME</a>
            </li>
            {sortedCategories.slice(0, 7).map((cat) => (
              <li key={cat.slug}>
                <a href={`/category/${cat.slug}`}>{cat.name.toUpperCase()}</a>
              </li>
            ))}
          </ul>

          {/* Interactive Live Search Component */}
          <div className="d-flex align-items-center">
            <HeaderSearch />
          </div>
        </div>
      </nav>

      {/* 4. TRENDING NOW TICKER */}
      <div className="container" style={{ maxWidth: '1200px' }}>
        <TrendingTicker stories={latestArticles.docs.slice(0, 8)} />
      </div>
    </header>
  )
}

export async function SiteFooter() {
  const [distributionRes, latestArticles, allCategories] = await Promise.all([
    getCategoryDistribution({ limitPerCategory: 3 }),
    getLatestArticles({ limit: 4 }),
    getCategories(),
  ])

  return (
    <footer className="td-footer-wrapper">
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div className="row">
          {/* Col 1: About Us & Editorial Mission */}
          <div className="col-lg-4 col-md-6 mb-4">
            <div className="td-footer-about">
              <div className="mb-3">
                <a href="/" style={{ display: 'inline-flex', flexDirection: 'column', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '32px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>
                      NEWSPAPER
                    </span>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4db2ec', display: 'inline-block', marginLeft: '3px' }}></span>
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#999', marginTop: '3px' }}>
                    NEWSPAPER PRO MAGAZINE THEME
                  </span>
                </a>
              </div>
              <p style={{ color: '#aaaaaa', fontSize: '13px', lineHeight: 1.6 }}>
                Newspaper is your premier digital news, business, technology, and sports hub, delivering real-time coverage, verified investigations, and global editorial reporting around the clock.
              </p>
              <div style={{ color: '#aaaaaa', fontSize: '12px', marginTop: '14px', lineHeight: 1.8 }}>
                <div><i className="fa-regular fa-envelope mr-1" style={{ color: '#4db2ec', marginRight: '6px' }}></i> <strong>Editorial Desk:</strong> newsroom@newspaper.com</div>
                <div><i className="fa-solid fa-location-dot mr-1" style={{ color: '#4db2ec', marginRight: '6px' }}></i> <strong>Bureau:</strong> Central Newsroom · PressPoint Edition</div>
              </div>
              <div className="d-flex align-items-center mt-3" style={{ gap: '10px' }}>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ width: '34px', height: '34px', background: '#1c1c1c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', transition: 'background 0.2s' }}>
                  <i className="fa-brands fa-facebook-f"></i>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ width: '34px', height: '34px', background: '#1c1c1c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', transition: 'background 0.2s' }}>
                  <i className="fa-brands fa-x-twitter"></i>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" style={{ width: '34px', height: '34px', background: '#1c1c1c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', transition: 'background 0.2s' }}>
                  <i className="fa-brands fa-youtube"></i>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ width: '34px', height: '34px', background: '#1c1c1c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', transition: 'background 0.2s' }}>
                  <i className="fa-brands fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Editor Picks / Trending Articles */}
          <div className="col-lg-4 col-md-6 mb-4">
            <div className="td-footer-title">EDITOR PICKS</div>
            <div className="td-footer-picks">
              {latestArticles.docs.slice(0, 3).map((item) => (
                <div key={item.id} className="td-footer-item">
                  <div className="td-footer-thumb">
                    <a href={`/news/${item.slug}`}>
                      <img
                        src={item.featuredMedia?.url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80'}
                        alt={item.headline}
                      />
                    </a>
                  </div>
                  <div className="td-footer-content">
                    <h5 className="td-footer-item-title">
                      <a href={`/news/${item.slug}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.headline}
                      </a>
                    </h5>
                    <div style={{ fontSize: '11px', color: '#777777', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-regular fa-clock" style={{ fontSize: '10px' }}></i>
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 3: Popular Categories & Newsletter */}
          <div className="col-lg-4 col-md-12 mb-4">
            <div className="td-footer-title">POPULAR CATEGORIES</div>
            <div className="td-footer-cat-pills" style={{ marginBottom: '24px' }}>
              {allCategories.slice(0, 10).map((c) => (
                <a key={c.id} href={`/category/${c.slug}`} className="td-footer-cat-pill">
                  <span>{c.name}</span>
                </a>
              ))}
            </div>

            {/* Newsletter Subscription Box in Footer */}
            <div style={{ background: '#1c1c1c', padding: '18px', borderRadius: '3px', border: '1px solid #282828' }}>
              <div style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: '13px', color: '#fff', textTransform: 'uppercase', marginBottom: '6px' }}>
                <i className="fa-solid fa-paper-plane mr-2" style={{ color: '#4db2ec', marginRight: '6px' }}></i>
                NEWSLETTER BRIEFING
              </div>
              <p style={{ fontSize: '11px', color: '#888', lineHeight: 1.5, marginBottom: '10px' }}>
                Join 50,000+ subscribers who get our daily morning digest directly in their inbox.
              </p>
              <NewsletterForm variant="inline" placeholder="Your email..." buttonText="JOIN" />
            </div>
          </div>
        </div>

        {/* Sub-Footer */}
        <div className="td-sub-footer">
          <div className="row align-items-center">
            <div className="col-md-6 text-center text-md-left">
              © {new Date().getFullYear()} Newspaper Pro Edition. All Rights Reserved.
            </div>
            <div className="col-md-6 text-center text-md-right mt-2 mt-md-0">
              <div className="td-sub-footer-links">
                <a href="/">Home</a>
                <a href="/category/india">India</a>
                <a href="/category/world">World</a>
                <a href="/category/sports">Sports</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/disclaimer">Disclaimer</a>
                <a href="/subscribe">Subscription</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
