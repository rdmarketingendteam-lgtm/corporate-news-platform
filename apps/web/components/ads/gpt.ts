'use client'

import { adsConfig } from '../../lib/ads'
import { CONSENT_EVENT, getConsent, hasReaderFlag, type ConsentChoice } from '../../lib/consent'

/* Minimal typings for the parts of Google Publisher Tag we use. */
type Slot = { defineSizeMapping(m: unknown): Slot; addService(s: unknown): Slot; setTargeting(k: string, v: string | string[]): Slot }
type PubAds = {
  disableInitialLoad(): void
  enableSingleRequest(): void
  collapseEmptyDivs(): void
  enableLazyLoad(cfg: object): void
  setPrivacySettings(s: { nonPersonalizedAds?: boolean }): void
  setTargeting(k: string, v: string | string[]): void
  refresh(slots?: Slot[]): void
}
export type GoogleTag = {
  cmd: Array<() => void> | { push(fn: () => void): void }
  pubads(): PubAds
  defineSlot(path: string, sizes: unknown, divId: string): Slot | null
  sizeMapping(): { addSize(v: unknown, s: unknown): any; build(): unknown }
  enableServices(): void
  display(divId: string): void
  destroySlots(slots?: Slot[]): boolean
}

declare global {
  interface Window {
    googletag?: GoogleTag
  }
}

let ready: Promise<GoogleTag | null> | null = null

/** Resolves once consent is known. Ads never load before the reader has chosen (builtin CMP mode). */
function waitForConsent(): Promise<ConsentChoice> {
  if (adsConfig.cmpMode === 'external') return Promise.resolve('all') // TCF CMP passes consent to GPT itself
  const current = getConsent()
  if (current) return Promise.resolve(current)
  return new Promise((resolve) => {
    window.addEventListener(CONSENT_EVENT, (e) => resolve((e as CustomEvent<ConsentChoice>).detail), { once: true })
  })
}

/** Load GPT once and configure privacy. Returns null when ads are disabled for this reader. */
export function loadGpt(): Promise<GoogleTag | null> {
  if (ready) return ready
  ready = (async () => {
    if (!adsConfig.networkCode || hasReaderFlag('adfree')) return null
    const consent = await waitForConsent()
    window.googletag = window.googletag || ({ cmd: [] } as unknown as GoogleTag)
    const gt = window.googletag
    gt.cmd.push(() => {
      const pubads = gt.pubads()
      pubads.disableInitialLoad() // slots are refreshed explicitly after definition
      // Readers who choose "essential only" get non-personalised ads (no ad cookies used for targeting).
      pubads.setPrivacySettings({ nonPersonalizedAds: consent !== 'all' })
      pubads.enableSingleRequest()
      pubads.collapseEmptyDivs()
      pubads.enableLazyLoad({ fetchMarginPercent: 200, renderMarginPercent: 100, mobileScaling: 2 })
      gt.enableServices()
    })
    // Update personalisation if the reader later changes their choice.
    window.addEventListener(CONSENT_EVENT, (e) => {
      const choice = (e as CustomEvent<ConsentChoice>).detail
      gt.cmd.push(() => gt.pubads().setPrivacySettings({ nonPersonalizedAds: choice !== 'all' }))
    })
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
      s.async = true
      s.crossOrigin = 'anonymous'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('GPT failed to load (blocked?)'))
      document.head.appendChild(s)
    })
    return gt
  })().catch(() => null)
  return ready
}
