'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { PLACEMENTS, adUnitPath, adsConfig, type Placement } from '../../lib/ads'
import { hasReaderFlag } from '../../lib/consent'
import { loadGpt } from './gpt'

type Props = { placement: Placement; targeting?: Record<string, string | string[]> }

/**
 * A single Google Ad Manager slot. Space is reserved up front to avoid layout shift,
 * the slot is clearly labelled, and it is destroyed on unmount (client-side navigation).
 */
export function AdSlot({ placement, targeting }: Props) {
  const reactId = useId()
  const divId = `gpt-${placement}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
  const [hidden, setHidden] = useState(false)
  const slotRef = useRef<unknown>(null)
  const cfg = PLACEMENTS[placement]

  useEffect(() => {
    if (!adsConfig.networkCode || hasReaderFlag('adfree')) {
      setHidden(true)
      return
    }
    let cancelled = false
    loadGpt().then((gt) => {
      if (!gt || cancelled) {
        if (!gt) setHidden(true)
        return
      }
      gt.cmd.push(() => {
        if (cancelled) return
        const slot = gt.defineSlot(adUnitPath(placement), cfg.sizes, divId)
        if (!slot) return
        const mapping = gt.sizeMapping()
        cfg.sizeMap.forEach((m) => mapping.addSize(m.viewport, m.sizes))
        slot.defineSizeMapping(mapping.build()).addService(gt.pubads())
        for (const [k, v] of Object.entries(targeting ?? {})) slot.setTargeting(k, v)
        slotRef.current = slot
        gt.display(divId)
        gt.pubads().refresh([slot as never])
      })
    })
    return () => {
      cancelled = true
      const gt = window.googletag
      if (gt && slotRef.current) gt.cmd.push(() => gt.destroySlots([slotRef.current as never]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, divId])

  if (hidden) return null
  return (
    <aside className={`ad ad-${placement}`} aria-label="Advertisement" style={{ ['--ad-h-m' as string]: `${cfg.minHeight.mobile}px`, ['--ad-h-d' as string]: `${cfg.minHeight.desktop}px` }}>
      <span className="ad-label">Advertisement</span>
      <div id={divId} className="ad-slot" />
    </aside>
  )
}
