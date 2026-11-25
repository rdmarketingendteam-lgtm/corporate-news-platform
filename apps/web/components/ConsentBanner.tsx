'use client'

import { useEffect, useState } from 'react'

import { adsConfig } from '../lib/ads'
import { OPEN_CONSENT_EVENT, getConsent, setConsent } from '../lib/consent'

/**
 * First-party consent banner. Nothing that sets advertising cookies loads until the reader chooses.
 * For EEA/UK/Swiss audiences set NEXT_PUBLIC_CMP_MODE=external and use a Google-certified TCF CMP instead.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (adsConfig.cmpMode === 'external') return
    if (!getConsent()) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  if (!open) return null
  const choose = (c: 'all' | 'essential') => {
    setConsent(c)
    setOpen(false)
  }
  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Cookie and advertising choices">
      <p>
        We use essential cookies to run this site. With your permission, our advertising partner (Google) may also use cookies to personalise and measure
        ads. You can change this any time from &ldquo;Cookie settings&rdquo; in the footer. <a href="/privacy">Privacy policy</a>
      </p>
      <div className="consent-actions">
        <button type="button" className="btn btn-secondary" onClick={() => choose('essential')}>
          Essential only
        </button>
        <button type="button" className="btn" onClick={() => choose('all')}>
          Accept all
        </button>
      </div>
    </div>
  )
}

export function CookieSettingsButton() {
  if (adsConfig.cmpMode === 'external') return null
  return (
    <button type="button" className="linklike" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT))}>
      Cookie settings
    </button>
  )
}
