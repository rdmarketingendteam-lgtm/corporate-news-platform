import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Pagination, StoryCard, parsePage } from '../../../components/StoryCard'
import { getLatestArticles, getTag, tags } from '../../../lib/cms'
import { absoluteUrl } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTag(slug)
  if (!t) return {}
  return {
    title: `#${t.name} — Topic Coverage | PressPoint`,
    description: t.description ?? `Coverage and analysis of ${t.name}.`,
    alternates: { canonical: absoluteUrl(`/topic/${t.slug}`) },
  }
}

export default async function TopicPage({ params, searchParams }: Props) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const topic = await getTag(slug)
  if (!topic) notFound()
  const page = parsePage(rawPage)
  const result = await getLatestArticles({ tagId: topic.id, page, limit: 12, cacheTags: [tags.tag(slug)] })

  return (
    <main>
      <section className="hero-area" style={{ padding: '40px 0 60px' }}>
        <div className="w-layout-blockcontainer container w-container">
          <div className="hero-area-content-wrapper">
            <div className="rectangle"></div>
            <div className="div-block">
              <h1 className="hero-title">Topic</h1>
              <h1 className="hero-title">#{topic.name}</h1>
            </div>
            {topic.description && <p className="hero-subtext authors">{topic.description}</p>}
          </div>

          <div className="world-section-title">
            <div className="style-01">
              <div>
                <div className="rectangle"></div>
              </div>
              <h2 className="world-title">All Related Stories</h2>
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
            <p style={{ padding: '40px 0', color: '#6b7280', textAlign: 'center' }}>No stories published under this topic yet.</p>
          )}

          <Pagination basePath={`/topic/${topic.slug}`} page={page} hasNext={result.hasNextPage} />
        </div>
      </section>
    </main>
  )
}
