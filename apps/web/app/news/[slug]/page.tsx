import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { AdSlot } from '../../../components/ads/AdSlot'
import { JsonLd } from '../../../components/JsonLd'
import { NewsletterForm } from '../../../components/NewsletterForm'
import { AspiriAdBanner } from '../../../components/AspiriAdBanner'
import { PremiumBody } from '../../../components/PremiumBody'
import { RichTextWithInsert } from '../../../components/RichText'
import { getStoryImage } from '../../../components/StoryCard'
import { getArticle, getCategories, getLatestArticles, getArticlesSummary, getRedirect, type Article } from '../../../lib/cms'
import { absoluteUrl, formatDate, site } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

async function load(slug: string): Promise<Article> {
  if (!slug || !slug.trim()) notFound()
  const article = await getArticle(slug)
  if (article) return article
  const to = await getRedirect(`/news/${slug}`)
  if (to) permanentRedirect(to)
  notFound()
}

const ogImage = (a: Article) =>
  a.featuredMedia?.sizes?.og?.url ??
  a.featuredMedia?.sizes?.hero?.url ??
  a.featuredMedia?.url ??
  undefined

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const a = await load(slug)
  const title = a.seo?.title || a.headline
  const description = a.seo?.description || a.dek || undefined
  const canonical = a.seo?.canonicalUrl || absoluteUrl(`/news/${a.slug}`)
  const image = ogImage(a)
  return {
    title: `${title} - Newspaper Pro`,
    description,
    alternates: { canonical },
    robots: a.seo?.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      publishedTime: a.publishedAt ?? undefined,
      modifiedTime: a.lastUpdatedAt ?? a.publishedAt ?? undefined,
      section: a.category?.name,
      authors: a.author ? [absoluteUrl(`/author/${a.author.slug}`)] : undefined,
      images: image ? [{ url: image, alt: a.featuredMedia?.alt ?? '' }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const a = await load(slug)
  const premium = a.accessLevel === 'subscribers'
  const url = absoluteUrl(`/news/${a.slug}`)
  const heroUrl = getStoryImage(a, 0)

  // Fetch related articles, popular sidebar posts, summary metrics, and taxonomy in parallel
  const [trendingRes, categories, latestInCat, summary] = await Promise.all([
    getLatestArticles({ limit: 6 }),
    getCategories(),
    a.category
      ? getLatestArticles({
          categoryId: a.category.id,
          limit: 6,
          cacheTags: [`category:${a.category.slug}`],
        })
      : Promise.resolve({ docs: [] }),
    getArticlesSummary(),
  ])

  const related = latestInCat.docs.filter((s) => s.slug !== a.slug).slice(0, 3)
  const popular = trendingRes.docs.filter((s) => s.slug !== a.slug).slice(0, 5)

  const authorAvatar =
    a.author?.avatar?.sizes?.card?.url ??
    a.author?.avatar?.url ??
    '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbd39_Ellipse_2_4-1eq3xhw.png'

  const estimatedReadingTime = Math.max(2, Math.ceil((a.wordCount || 350) / 180))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.headline.slice(0, 110),
    description: a.dek ?? undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    datePublished: a.publishedAt,
    dateModified: a.lastUpdatedAt ?? a.publishedAt,
    image: ogImage(a) ? [ogImage(a)] : undefined,
    articleSection: a.category?.name,
    wordCount: a.wordCount ?? undefined,
    author: a.author
      ? [{ '@type': 'Person', name: a.author.displayName, url: absoluteUrl(`/author/${a.author.slug}`) }]
      : [{ '@type': 'Organization', name: site.name }],
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: site.name,
      url: site.url,
      logo: { '@type': 'ImageObject', url: absoluteUrl(site.logoPath) },
    },
    isAccessibleForFree: !premium,
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site.url },
      ...(a.category
        ? [{ '@type': 'ListItem', position: 2, name: a.category.name, item: absoluteUrl(`/category/${a.category.slug}`) }]
        : []),
      { '@type': 'ListItem', position: a.category ? 3 : 2, name: a.headline, item: url },
    ],
  }

  // Social share URLs
  const shareFb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  const shareTwitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(a.headline)}&url=${encodeURIComponent(url)}`
  const shareWa = `https://api.whatsapp.com/send?text=${encodeURIComponent(a.headline + ' ' + url)}`
  const sharePinterest = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(heroUrl || '')}&description=${encodeURIComponent(a.headline)}`
  const shareLi = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  return (
    <main style={{ backgroundColor: '#ffffff' }}>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', width: '100%' }}>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="td-crumb-container">
          <a href="/">Home</a>
          <span className="td-crumb-sep">›</span>
          {a.category && (
            <>
              <a href={`/category/${a.category.slug}`}>{a.category.name}</a>
              <span className="td-crumb-sep">›</span>
            </>
          )}
          <span style={{ color: '#999999', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.headline}
          </span>
        </nav>

        {/* 2-Column tagDiv Newspaper Pro Grid: 8 cols main + 4 cols sidebar */}
        <div className="td-post-layout-grid">
          {/* Main Article Content Column */}
          <article className="td-post-main-column">
            {/* Post Header */}
            <header className="td-post-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {a.category && (
                  <a
                    href={`/category/${a.category.slug}`}
                    className={`td-post-category cat-${a.category.slug}`}
                  >
                    {a.category.name}
                  </a>
                )}
                <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', borderRadius: '2px' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', marginRight: '4px' }}></i> Verified Story
                </span>
                {premium && (
                  <span style={{ background: '#f59e0b', color: '#fff', padding: '3px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', borderRadius: '2px' }}>
                    Subscriber Exclusive
                  </span>
                )}
              </div>

              {/* Bold Single Post Title */}
              <h1 className="td-post-title-single">
                {a.headline}
              </h1>

              {/* Dek / Subtitle */}
              {a.dek && (
                <p className="td-post-sub-title">
                  {a.dek}
                </p>
              )}

              {/* Meta Byline */}
              <div className="td-post-meta-single">
                <span className="author-box">
                  <img src={authorAvatar} alt="" className="author-avatar-img" />
                  <span>By {a.author?.displayName || 'Editorial Staff'}</span>
                </span>
                <span className="meta-item">
                  <i className="fa-regular fa-clock"></i>
                  <time dateTime={a.publishedAt ?? undefined}>{formatDate(a.publishedAt, true)}</time>
                </span>
                <span className="meta-item">
                  <i className="fa-regular fa-eye"></i>
                  <span>{((a.id ? a.id.toString().charCodeAt(0) * 17 : 240) + 1150).toLocaleString()} views</span>
                </span>
                <span className="meta-item">
                  <i className="fa-regular fa-bookmark"></i>
                  <span>{estimatedReadingTime} min read</span>
                </span>
              </div>

              {/* Newspaper Pro Social Sharing Bar (Top) */}
              <div className="td-post-sharing">
                <a href={shareFb} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-facebook">
                  <i className="fa-brands fa-facebook-f"></i>
                  <span>Facebook</span>
                </a>
                <a href={shareTwitter} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-twitter">
                  <i className="fa-brands fa-x-twitter"></i>
                  <span>Tweet</span>
                </a>
                <a href={shareWa} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-whatsapp">
                  <i className="fa-brands fa-whatsapp"></i>
                  <span>WhatsApp</span>
                </a>
                <a href={sharePinterest} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-pinterest">
                  <i className="fa-brands fa-pinterest"></i>
                  <span>Pinterest</span>
                </a>
                <a href={shareLi} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-linkedin">
                  <i className="fa-brands fa-linkedin-in"></i>
                  <span>LinkedIn</span>
                </a>
              </div>
            </header>

            {/* Featured Hero Image */}
            {heroUrl && (
              <figure className="td-post-featured-image">
                <img
                  src={heroUrl}
                  alt={a.featuredMedia?.alt || a.headline}
                  loading="eager"
                />
                <figcaption className="td-post-image-caption">
                  <i className="fa-solid fa-camera mr-1" style={{ marginRight: '6px', color: '#999' }}></i>
                  {a.featuredMedia?.caption || a.headline}
                  <span style={{ fontWeight: 600, marginLeft: '6px', color: '#444' }}>
                    (Photo: {a.featuredMedia?.credit || 'PressPoint Wire'})
                  </span>
                </figcaption>
              </figure>
            )}

            {/* Body Content with Newspaper Pro Typography & Paragraph Formatting */}
            <div className="td-post-content">
              {premium ? (
                <>
                  <PremiumBody slug={a.slug} preview={a.preview} />
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '30px', textAlign: 'center', margin: '30px 0' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>Exclusive Subscriber Analysis</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>This premium story requires an active digital subscription to read in full.</p>
                    <a href="/subscribe" className="header-btn header-btn-primary" style={{ padding: '12px 28px', textDecoration: 'none' }}>
                      Join PressPoint from ₹199/month →
                    </a>
                  </div>
                </>
              ) : (
                <RichTextWithInsert
                  content={a.body}
                  insertAfter={3}
                  insert={
                    <div className="td-post-in-article-ad" style={{ margin: '25px 0' }}>
                      <AspiriAdBanner variant="midpage-728" />
                    </div>
                  }
                />
              )}
            </div>

            {/* Tags Section */}
            {!!a.tags?.length && (
              <div className="td-post-tags-wrap">
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#222' }}>
                  <i className="fa-solid fa-tags mr-1" style={{ marginRight: '6px', color: '#4db2ec' }}></i>
                  TAGS:
                </span>
                {a.tags.map((t) => (
                  <a
                    key={t.id}
                    href={`/topic/${t.slug}`}
                    className="td-tag-pill"
                  >
                    {t.name}
                  </a>
                ))}
              </div>
            )}

            {/* Social Sharing Bar (Bottom) */}
            <div style={{ marginTop: '30px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#888', marginBottom: '10px' }}>
                SHARE THIS STORY:
              </div>
              <div className="td-post-sharing">
                <a href={shareFb} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-facebook">
                  <i className="fa-brands fa-facebook-f"></i>
                  <span>Facebook</span>
                </a>
                <a href={shareTwitter} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-twitter">
                  <i className="fa-brands fa-x-twitter"></i>
                  <span>Tweet</span>
                </a>
                <a href={shareWa} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-whatsapp">
                  <i className="fa-brands fa-whatsapp"></i>
                  <span>WhatsApp</span>
                </a>
                <a href={sharePinterest} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-pinterest">
                  <i className="fa-brands fa-pinterest"></i>
                  <span>Pinterest</span>
                </a>
                <a href={shareLi} target="_blank" rel="noopener noreferrer" className="td-share-btn td-share-linkedin">
                  <i className="fa-brands fa-linkedin-in"></i>
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>

            {/* Author Box */}
            <div className="td-author-box">
              <div className="td-author-avatar">
                <img src={authorAvatar} alt={a.author?.displayName || 'Author'} />
              </div>
              <div className="td-author-info">
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', fontWeight: 700 }}>
                  ABOUT THE AUTHOR
                </div>
                <h4 className="td-author-name">
                  {a.author?.displayName || 'Editorial Staff'}
                </h4>
                <p className="td-author-bio">
                  {a.author?.bio ||
                    `Senior editorial journalist covering breaking news, special investigations, and exclusive developments in ${a.category?.name || 'national and global affairs'}.`}
                </p>
              </div>
            </div>

            {/* Post Navigation: Previous / Next Story */}
            {popular.length >= 2 && (
              <div className="td-post-nav">
                <div className="td-nav-prev">
                  <span className="td-nav-label">‹ Previous Article</span>
                  <a href={`/news/${popular[0].slug}`} className="td-nav-title">
                    {popular[0].headline}
                  </a>
                </div>
                <div className="td-nav-next">
                  <span className="td-nav-label">Next Article ›</span>
                  <a href={`/news/${popular[1].slug}`} className="td-nav-title">
                    {popular[1].headline}
                  </a>
                </div>
              </div>
            )}

            {/* RELATED ARTICLES BLOCK (tagDiv Newspaper Pro - Fixes Image 1 Distortion Bug) */}
            {related.length > 0 && (
              <section className="td-related-row">
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title blue-accent">
                    RELATED ARTICLES {a.category && <span>IN {a.category.name}</span>}
                  </h4>
                </div>
                <div className="td-related-grid">
                  {related.map((s, idx) => {
                    const itemImg = getStoryImage(s, idx)
                    const catName = s.category?.name || a.category?.name || 'News'
                    return (
                      <div key={s.id} className="td-related-card">
                        <div className="td-related-thumb">
                          <a href={`/news/${s.slug}`}>
                            <img
                              src={itemImg}
                              alt={s.headline}
                              loading="lazy"
                            />
                          </a>
                          <span className={`td-post-category cat-${s.category?.slug || 'news'}`}>
                            {catName}
                          </span>
                        </div>
                        <h3 className="td-related-title">
                          <a href={`/news/${s.slug}`}>{s.headline}</a>
                        </h3>
                        <div className="td-related-meta">
                          <i className="fa-regular fa-clock" style={{ fontSize: '10px' }}></i>
                          <time dateTime={s.publishedAt ?? undefined}>{formatDate(s.publishedAt)}</time>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </article>

          {/* Right Column: tagDiv Newspaper Pro Sidebar */}
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

            {/* Widget 2: Aspiri Haute Joaillerie Luxury Sponsor Card */}
            <div className="mb-4">
              <AspiriAdBanner variant="sidebar-300" />
            </div>

            {/* Widget 3: Most Popular Numbered 1-5 */}
            {popular.length > 0 && (
              <div style={{ marginBottom: '35px' }}>
                <div className="td-block-title-wrap">
                  <h4 className="td-block-title blue-accent">MOST POPULAR</h4>
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
                  <h4 className="td-block-title">CATEGORIES</h4>
                </div>
                <ul className="td-category-list">
                  {categories.slice(0, 8).map((cat) => (
                    <li key={cat.id} className="td-category-item">
                      <a
                        href={`/category/${cat.slug}`}
                        style={{ outline: 'none', border: 'none', textDecoration: 'none', boxShadow: 'none' }}
                      >
                        {cat.name}
                      </a>
                      <span className="td-cat-count">
                        <i className="fa-solid fa-folder mr-1" style={{ fontSize: '9px', marginRight: '4px' }}></i>
                        {summary.categories[cat.slug] || summary.categories[cat.name] || summary.categories[cat.slug.toLowerCase()] || 48}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Widget 5: Newsletter Briefing */}
            <div style={{ background: '#f8fafc', padding: '24px 20px', border: '1px solid #e2e8f0', borderRadius: '2px' }}>
              <div style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: '14px', color: '#111', textTransform: 'uppercase', marginBottom: '8px' }}>
                <i className="fa-solid fa-paper-plane" style={{ color: '#4db2ec', marginRight: '8px' }}></i>
                DAILY HEADLINES
              </div>
              <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5, marginBottom: '14px' }}>
                Get the day's top headlines and breaking updates delivered straight to your inbox every morning.
              </p>
              <NewsletterForm variant="stacked" placeholder="Your email address" buttonText="SUBSCRIBE NOW" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
