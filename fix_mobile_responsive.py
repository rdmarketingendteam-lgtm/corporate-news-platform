import re

# 1. Update AspiriAdBanner.tsx
aspiri_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\components\AspiriAdBanner.tsx'
with open(aspiri_path, 'r', encoding='utf-8') as f:
    aspiri_code = f.read()

aspiri_code = aspiri_code.replace(
    "maxWidth: '320px',\n        margin: '0 auto',",
    "maxWidth: '320px',\n        margin: '0 auto',\n        boxSizing: 'border-box',"
)
aspiri_code = aspiri_code.replace(
    "minHeight: '86px',\n      background: 'linear-gradient",
    "minHeight: '86px',\n      boxSizing: 'border-box',\n      background: 'linear-gradient"
)
aspiri_code = aspiri_code.replace("EXPLORE THE COLLECTION â†’", "EXPLORE THE COLLECTION →")
aspiri_code = aspiri_code.replace("DISCOVER ASPIRI â†—", "DISCOVER ASPIRI ↗")

with open(aspiri_path, 'w', encoding='utf-8') as f:
    f.write(aspiri_code)
print("Updated AspiriAdBanner.tsx with boxSizing.")

# 2. Update newspaper_pro.css
css_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\public\newspaper_pro.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_code = f.read()

# Add global box-sizing right after :root if not present
if "*, *::before, *::after" not in css_code:
    css_code = css_code.replace(
        ":root {",
        "*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n:root {"
    )
    print("Added global box-sizing to newspaper_pro.css.")

# Enhance .td-popular rules
old_popular_css = """/* Popular Posts Numbered List */
.td-popular-item {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2f2f2;
}

.td-popular-rank {
  width: 30px;
  height: 30px;
  min-width: 30px;
  background: #222;
  color: #ffffff;
  font-family: 'Roboto', sans-serif;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.td-popular-rank.top-1 { background: var(--td-primary); }
.td-popular-rank.top-2 { background: #333; }
.td-popular-rank.top-3 { background: #555; }

.td-popular-thumb {
  width: 70px;
  min-width: 70px;
  height: 52px;
  overflow: hidden;
}

.td-popular-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.td-popular-content {
  flex: 1;
}

.td-popular-title {
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 4px 0;
}"""

new_popular_css = """/* Popular Posts Numbered List - 100% Mobile Responsive */
.td-popular-list {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

.td-popular-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2f2f2;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.td-popular-rank {
  width: 26px;
  height: 26px;
  min-width: 26px;
  background: #222;
  color: #ffffff;
  font-family: 'Roboto', sans-serif;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.td-popular-rank.top-1 { background: var(--td-primary); }
.td-popular-rank.top-2 { background: #333; }
.td-popular-rank.top-3 { background: #555; }

.td-popular-thumb {
  width: 65px;
  min-width: 65px;
  height: 48px;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 2px;
}

.td-popular-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.td-popular-content {
  flex: 1;
  min-width: 0; /* Critical: allows flexbox truncation on mobile */
  overflow: hidden;
}

.td-popular-title {
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 4px 0;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
}

.td-popular-title a {
  color: #222222;
  text-decoration: none;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}"""

if old_popular_css in css_code:
    css_code = css_code.replace(old_popular_css, new_popular_css)
    print("Replaced .td-popular CSS with mobile-responsive flexbox.")
else:
    print("Could not find exact old_popular_css, trying regex...")
    css_code = re.sub(r"/\* Popular Posts Numbered List \*/[\s\S]*?\.td-popular-title \{[\s\S]*?\n\}", new_popular_css, css_code)
    print("Regex replacement for .td-popular executed.")

# Update .td-post-sidebar and .td-sidebar responsive rules
sidebar_res_css = """
/* Responsive Sidebar Constraints */
.td-sidebar,
.td-post-sidebar {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .td-sidebar,
  .td-post-sidebar {
    padding-left: 0 !important;
    padding-right: 0 !important;
    overflow-x: hidden;
  }
  .td-popular-item {
    gap: 8px;
  }
  .td-popular-thumb {
    width: 60px;
    min-width: 60px;
    height: 44px;
  }
  .td-popular-title {
    font-size: 12px;
  }
  .td-social-counter {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px;
  }
}
"""

if "/* Responsive Sidebar Constraints */" not in css_code:
    css_code += sidebar_res_css
    print("Added responsive sidebar constraints.")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_code)
print("Updated newspaper_pro.css.")

# 3. Update news/[slug]/page.tsx
single_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\app\news\[slug]\page.tsx'
with open(single_path, 'r', encoding='utf-8') as f:
    single_code = f.read()

# Update popular headline link to have 2-line clamp
old_single_pop = """                        <div className="td-popular-content">
                          <h5 className="td-popular-title">
                            <a href={`/news/${item.slug}`}>{item.headline}</a>
                          </h5>
                          <div style={{ fontSize: '10px', color: '#999' }}>
                            {formatDate(item.publishedAt)}
                          </div>
                        </div>"""

new_single_pop = """                        <div className="td-popular-content">
                          <h5 className="td-popular-title">
                            <a
                              href={`/news/${item.slug}`}
                              style={{
                                color: '#222222',
                                textDecoration: 'none',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                              }}
                            >
                              {item.headline}
                            </a>
                          </h5>
                          <div style={{ fontSize: '10px', color: '#999' }}>
                            {formatDate(item.publishedAt)}
                          </div>
                        </div>"""

if old_single_pop in single_code:
    single_code = single_code.replace(old_single_pop, new_single_pop)
    print("Updated single post popular story headline clamp.")

# Update outer container to ensure box-sizing
old_outer = """      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>"""
new_outer = """      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', width: '100%' }}>"""
if old_outer in single_code:
    single_code = single_code.replace(old_outer, new_outer)
    print("Updated single post outer container box-sizing.")

# Update aside to ensure minWidth: 0, width: 100%
old_aside = """          {/* Right Sidebar Column */}
          <aside className="td-post-sidebar">"""
new_aside = """          {/* Right Sidebar Column */}
          <aside className="td-post-sidebar" style={{ minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>"""
if old_aside in single_code:
    single_code = single_code.replace(old_aside, new_aside)
    print("Updated single post aside container width.")

with open(single_path, 'w', encoding='utf-8') as f:
    f.write(single_code)
print("Updated news/[slug]/page.tsx.")
