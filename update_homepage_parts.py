import re

page_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\app\page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Update getLatestArticles limit and fallback logic
old_fetch = """  const [
    latestRes,
    distributionRes,
    categories,
    summary,
  ] = await Promise.all([
    getLatestArticles({ limit: 18 }),
    getCategoryDistribution({ limitPerCategory: 6 }),
    getCategories(),
    getArticlesSummary(),
  ])

  const allStories = latestRes.docs
  const heroStory = allStories[0]
  const quadStories = allStories.slice(1, 5)
  const dontMissMain = allStories[5]
  const dontMissList = allStories.slice(6, 9)
  const streamStories = allStories.slice(9)

  const catMap = distributionRes.categories_map || {}
  const entStories = catMap['entertainment']?.articles || []
  const techStories = catMap['technology']?.articles || []
  const sportsStories = catMap['sports']?.articles || []
  const bizStories = catMap['business']?.articles || []

  // Top 5 popular stories for sidebar
  const popularStories = allStories.slice(0, 5)"""

new_fetch = """  const [
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
  const streamStories = allStories.slice(9)

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
  const editorsPicks = allStories.slice(5, 9)"""

if old_fetch in code:
    code = code.replace(old_fetch, new_fetch)
    print("Updated data fetching and dynamic fallback logic.")
else:
    print("Could not find old_fetch block, trying regex...")

# Add Sports Spotlight block before Latest Articles
old_latest_block = """            {/* BLOCK 4: LATEST ARTICLES (Horizontal Stream Modules) */}"""

new_sports_and_latest = """            {/* BLOCK 4: SPORTS SPOTLIGHT (3-Column Grid) */}
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

            {/* BLOCK 5: LATEST ARTICLES (Horizontal Stream Modules) */}"""

if old_latest_block in code:
    code = code.replace(old_latest_block, new_sports_and_latest)
    print("Added Sports Arena block.")

# Update sidebar styling and add Editor's Picks widget
old_sidebar_tag = """          {/* RIGHT 4 COLUMNS: NEWSPAPER PRO SIDEBAR */}
          <div className="col-lg-4 col-md-12 td-sidebar">"""

new_sidebar_tag = """          {/* RIGHT 4 COLUMNS: NEWSPAPER PRO SIDEBAR */}
          <div className="col-lg-4 col-md-12 td-sidebar" style={{ position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>"""

if old_sidebar_tag in code:
    code = code.replace(old_sidebar_tag, new_sidebar_tag)
    print("Updated td-sidebar with sticky styling.")

# Add Editor's Picks in sidebar after Popular Categories if present
old_newsletter = """            {/* WIDGET 5: NEWSLETTER BOX */}"""

new_sidebar_widgets = """            {/* WIDGET 5: EDITOR'S TOP PICKS (Balancing Widget) */}
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

            {/* WIDGET 6: NEWSLETTER BOX */}"""

if old_newsletter in code:
    code = code.replace(old_newsletter, new_sidebar_widgets)
    print("Added Editor's Top Picks widget to sidebar.")

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated page.tsx successfully.")
