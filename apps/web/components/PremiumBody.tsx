'use client'

import { useEffect, useState } from 'react'

import { hasReaderFlag } from '../lib/consent'
import type { LexicalState } from '../lib/lexical/types'
import { RichText } from './RichText'

/**
 * Subscriber-only stories ship to every visitor as a cached preview. Entitled readers'
 * browsers then fetch the full body (uncached, cookie-authenticated, decided by the CMS).
 */
export function PremiumBody({ slug, preview }: { slug: string; preview: LexicalState }) {
  // Server render (cached, shared by everyone incl. crawlers) shows the subscribe prompt.
  const [state, setState] = useState<{ status: 'checking' | 'locked' | 'open'; body?: LexicalState }>({ status: 'locked' })

  useEffect(() => {
    if (!hasReaderFlag('in')) return
    setState({ status: 'checking' })
    fetch(`/api/article-body/${encodeURIComponent(slug)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { body: LexicalState }) => setState({ status: 'open', body: d.body }))
      .catch(() => setState({ status: 'locked' }))
  }, [slug])

  if (state.status === 'open') return <RichText content={state.body} />
  return (
    <>
      <RichText content={preview} />
      <div className="paywall" aria-live="polite">
        {state.status === 'checking' ? (
          <p className="meta">Checking your subscription…</p>
        ) : (
          <>
            <h2>Continue reading with a subscription</h2>
            <p>Support independent journalism and get unlimited access to every story.</p>
            <p>
              <a className="btn" href="/subscribe">
                See plans
              </a>{' '}
              <a href={`/account?next=${encodeURIComponent(`/news/${slug}`)}`}>Already a subscriber? Sign in</a>
            </p>
          </>
        )}
      </div>
    </>
  )
}
