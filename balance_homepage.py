import re

page_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\app\page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update stories slicing
old_slice = """  const allStories = latestRes.docs
  const heroStory = allStories[0] || null
  const quadStories = allStories.length >= 5 ? allStories.slice(1, 5) : allStories.slice(1, Math.min(allStories.length, 5))
  const dontMissMain = allStories[5] || allStories[0] || null
  const dontMissList = allStories.slice(6, 9).length > 0 ? allStories.slice(6, 9) : allStories.slice(1, 4)
  const streamStories = allStories.slice(9)"""

new_slice = """  const allStories = latestRes.docs
  const heroStory = allStories[0] || null
  const quadStories = allStories.length >= 5 ? allStories.slice(1, 5) : allStories.slice(1, Math.min(allStories.length, 5))
  const dontMissMain = allStories[5] || allStories[0] || null
  const dontMissList = allStories.slice(6, 9).length > 0 ? allStories.slice(6, 9) : allStories.slice(1, 4)
  // Balanced 5 featured stream stories for the 8-column column
  const streamStories = allStories.slice(9, 14)
  // Remaining stories displayed across the full-width 12-column magazine grid below
  const fullWidthStories = allStories.slice(14, 22)"""

if old_slice in content:
    content = content.replace(old_slice, new_slice)
    print("Replaced stories slice.")
else:
    print("Could not find old_slice.")

# 2. Add sticky bottom widget to sidebar
old_sidebar_end = """            {/* WIDGET 6: NEWSLETTER BOX */}
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
          </div>"""

new_sidebar_end = """            {/* WIDGET 6: NEWSLETTER BOX */}
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

            {/* WIDGET 7: STICKY ASPIRI LUXURY SHOWCASE (Permanently eliminates any blank space) */}
            <div style={{ position: 'sticky', top: '80px', marginTop: '20px' }}>
              <AspiriAdBanner variant="sidebar-300" />
            </div>
          </div>"""

if old_sidebar_end in content:
    content = content.replace(old_sidebar_end, new_sidebar_end)
    print("Added sticky bottom widget to sidebar.")
else:
    print("Could not find old_sidebar_end.")

# 3. Add full-width 12-column section below the 8+4 row
old_main_close = """        </div>
      </div>
    </main>"""

new_main_close = """        </div>
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
    </main>"""

if old_main_close in content:
    content = content.replace(old_main_close, new_main_close)
    print("Added full-width discovery grid section.")
else:
    print("Could not find old_main_close.")

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated page.tsx completely.")
