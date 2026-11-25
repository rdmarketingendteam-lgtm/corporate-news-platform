import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Pagination, parsePage } from '../../../components/StoryCard'
import { AspiriAdBanner } from '../../../components/AspiriAdBanner'
import { getCategory, getLatestArticles, getArticlesSummary, tags } from '../../../lib/cms'
import { absoluteUrl } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { page }] = await Promise.all([params, searchParams])
  const c = await getCategory(slug)
  if (!c) return {}
  const p = parsePage(page)
  const titlePrefix = `${c.name} News & Analysis`
  return {
    title: p > 1 ? `${titlePrefix} — page ${p}` : titlePrefix,
    description: c.description ?? `Latest ${c.name} news and analysis.`,
    alternates: {
      canonical: absoluteUrl(p > 1 ? `/category/${c.slug}?page=${p}` : `/category/${c.slug}`),
      types: { 'application/rss+xml': `/category/${c.slug}/feed.xml` },
    },
  }
}

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80'

function formatDate(iso?: string | null): string {
  if (!iso) return 'Today'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return 'Recent'
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const category = await getCategory(slug)
  if (!category) notFound()
  const page = parsePage(rawPage)

  const [result, summary] = await Promise.all([
    getLatestArticles({
      categorySlug: category.slug,
      page,
      limit: 12,
      cacheTags: [tags.category(slug)],
    }),
    getArticlesSummary(),
  ])

  if (page > 1 && !result.docs.length) notFound()

  const popularCats = [
    { name: 'Business', slug: 'business', color: '#2563eb' },
    { name: 'Technology', slug: 'technology', color: '#0284c7' },
    { name: 'Sports', slug: 'sports', color: '#dc2626' },
    { name: 'Entertainment', slug: 'entertainment', color: '#d97706' },
    { name: 'Health', slug: 'health', color: '#059669' },
    { name: 'World', slug: 'world', color: '#4f46e5' },
  ]

  return (
    <main className="py-4">
      <div className="container">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb bg-transparent p-0 mb-0" style={{ fontSize: '13px' }}>
            <li className="breadcrumb-item"><a href="/" style={{ color: '#4db2ec', textDecoration: 'none' }}>Home</a></li>
            <li className="breadcrumb-item"><a href="/#categories" style={{ color: '#64748b', textDecoration: 'none' }}>Categories</a></li>
            <li className="breadcrumb-item active" aria-current="page" style={{ color: '#1e293b', fontWeight: 600 }}>{category.name}</li>
          </ol>
        </nav>

        {/* Section Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2" style={{ borderBottom: '2px solid #222' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', margin: 0, color: '#111' }}>
              <span style={{ color: '#4db2ec' }}>{category.name}</span> News &amp; Updates
            </h1>
            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
              {category.description || `In-depth reporting, breaking updates, and expert analysis in ${category.name}.`}
            </p>
          </div>
          <span className="badge" style={{ background: '#4db2ec', color: '#fff', fontSize: '12px', padding: '6px 12px' }}>
            {result.totalDocs} Stories
          </span>
        </div>

        {/* Curation Filter Bar inside Category */}
        <div className="p-3 mb-4 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                <i className="fa-solid fa-layer-group mr-1" style={{ color: '#4db2ec', marginRight: '6px' }}></i> Curated Stream:
              </span>
            </div>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
              <span
                className="btn btn-sm"
                style={{
                  background: '#4db2ec',
                  color: '#fff',
                  border: '1px solid #4db2ec',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '4px',
                }}
              >
                All Stories
              </span>
              <span
                className="btn btn-sm"
                style={{
                  background: '#fff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                }}
              >
                Editor&apos;s Picks
              </span>
              <span
                className="btn btn-sm"
                style={{
                  background: '#fff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                }}
              >
                Deep Dives
              </span>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Main Article Stream (col-lg-8) */}
          <div className="col-lg-8 col-md-12">
            {result.docs.length > 0 ? (
              <div className="row">
                {result.docs.map((story) => (
                  <div key={story.id} className="col-md-6 mb-4">
                    <div className="utf_post_block_style" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div className="utf_post_thumb" style={{ height: '180px', overflow: 'hidden' }}>
                        <a href={`/news/${story.slug}`}>
                          <img
                            src={story.featuredMedia?.url || FALLBACK_THUMB}
                            alt={story.headline}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </a>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#ec0000', textTransform: 'uppercase' }}>
                            {category.name}
                          </span>
                          <span className="badge badge-light" style={{ fontSize: '10px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', marginRight: '3px' }}></i> Verified
                          </span>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, lineHeight: '1.3' }}>
                          <a href={`/news/${story.slug}`} style={{ color: '#0f172a', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {story.headline}
                          </a>
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
                          {story.dek || 'Click to read full story.'}
                        </p>
                        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', paddingTop: '8px' }}>
                          <span><i className="fa-regular fa-clock mr-1" style={{ marginRight: '4px' }}></i> {formatDate(story.publishedAt)}</span>
                          <span><i className="fa-solid fa-pen-nib mr-1" style={{ marginRight: '4px', color: '#4db2ec' }}></i> {story.author?.displayName || 'Editorial Staff'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <i className="fa-regular fa-newspaper" style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '12px' }}></i>
                <h3>No {category.name} stories found.</h3>
                <p>Try exploring another news category or checking back soon.</p>
                <a href="/" className="btn btn-sm mt-3" style={{ background: '#4db2ec', color: '#fff', fontWeight: 700, padding: '6px 16px', borderRadius: '4px', textDecoration: 'none' }}>
                  Return to Homepage
                </a>
              </div>
            )}

            <Pagination basePath={`/category/${category.slug}`} page={page} hasNext={result.hasNextPage} />
          </div>

          {/* Sidebar (col-lg-4) */}
          <div className="col-lg-4 col-md-12 sidebar">
            {/* Widget 1: Popular Categories */}
            <div className="widget mb-4" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', borderLeft: '3px solid #4db2ec', paddingLeft: '10px', color: '#0f172a' }}>
                Explore Categories
              </h4>
              <ul className="list-unstyled mb-0" style={{ fontSize: '13px' }}>
                {popularCats.map((cat) => (
                  <li key={cat.slug} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={`/category/${cat.slug}`} style={{ color: category.slug === cat.slug ? '#4db2ec' : '#334155', fontWeight: category.slug === cat.slug ? 700 : 500, textDecoration: 'none' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: cat.color, marginRight: '8px' }}></span>
                      {cat.name}
                    </a>
                    <span className="badge badge-secondary" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                      {summary.categories[cat.slug] || summary.categories[cat.name] || 'Active'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Widget 2: Aspiri Haute Joaillerie Luxury Sponsor Card */}
            <div className="widget mb-4">
              <AspiriAdBanner variant="sidebar-300" />
            </div>

            {/* Widget 3: Newsletter */}
            <div className="widget mb-4" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: '6px', padding: '24px' }}>
              <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                Daily {category.name} Digest
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
                Top daily developments in {category.name} delivered directly to your inbox.
              </p>
              <form action="/subscribe" method="get">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  required
                  className="form-control mb-2"
                  style={{ background: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '13px' }}
                />
                <button type="submit" className="btn w-100" style={{ background: '#4db2ec', color: '#fff', fontWeight: 700, fontSize: '13px' }}>
                  Subscribe Free
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
