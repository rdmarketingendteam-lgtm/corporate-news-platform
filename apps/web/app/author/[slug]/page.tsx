import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { JsonLd } from '../../../components/JsonLd'
import { Pagination, StoryCard, parsePage } from '../../../components/StoryCard'
import { getAuthor, getLatestArticles, tags } from '../../../lib/cms'
import { absoluteUrl } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const a = await getAuthor(slug)
  if (!a) return {}
  return {
    title: `${a.displayName} — Articles | PressPoint`,
    description: a.bio ?? `Stories and investigative reporting by ${a.displayName}.`,
    alternates: { canonical: absoluteUrl(`/author/${a.slug}`) },
  }
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const author = await getAuthor(slug)
  if (!author) notFound()
  const page = parsePage(rawPage)
  const result = await getLatestArticles({ authorId: author.id, page, limit: 12, cacheTags: [tags.author(slug)] })
  const handle = author.xHandle?.replace(/^@/, '')

  const avatarUrl =
    author.avatar?.sizes?.thumbnail?.url ??
    author.avatar?.url ??
    '/_external/cdn.prod.website-files.com/692401e8be8549a781fdbbad/692401e8be8549a781fdbd39_Ellipse_2_4-1eq3xhw.png'

  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          mainEntity: {
            '@type': 'Person',
            name: author.displayName,
            jobTitle: author.jobTitle ?? undefined,
            description: author.bio ?? undefined,
            url: absoluteUrl(`/author/${author.slug}`),
            sameAs: handle ? [`https://x.com/${handle}`] : undefined,
          },
        }}
      />

      <section className="hero-area" style={{ padding: '40px 0 60px' }}>
        <div className="w-layout-blockcontainer container w-container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              borderBottom: '2px solid #000000',
              paddingBottom: '32px',
              marginBottom: '40px',
              flexWrap: 'wrap',
            }}
          >
            <img
              src={avatarUrl}
              alt={author.displayName}
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <span className="health-service-tag">{author.jobTitle ?? 'Correspondent'}</span>
              <h1 className="hero-title" style={{ fontSize: '36px', margin: '8px 0' }}>
                {author.displayName}
              </h1>
              {author.bio && <p style={{ color: '#4b5563', fontSize: '16px', maxWidth: '640px' }}>{author.bio}</p>}
              {handle && (
                <a
                  href={`https://x.com/${encodeURIComponent(handle)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563eb', fontSize: '14px', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}
                >
                  @{handle} on X →
                </a>
              )}
            </div>
          </div>

          <div className="world-section-title">
            <div className="style-01">
              <div>
                <div className="rectangle"></div>
              </div>
              <h2 className="world-title">Published Articles</h2>
            </div>
            <div className="world-line"></div>
          </div>

          {result.docs.length > 0 ? (
            <div
              className="w-dyn-items"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px', marginTop: '24px' }}
            >
              {result.docs.map((story, idx) => (
                <div key={story.id} className="w-dyn-item">
                  <StoryCard story={story} index={idx} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ padding: '40px 0', color: '#6b7280', textAlign: 'center' }}>No articles published yet by this author.</p>
          )}

          <Pagination basePath={`/author/${author.slug}`} page={page} hasNext={result.hasNextPage} />
        </div>
      </section>
    </main>
  )
}
