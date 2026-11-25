/**
 * Google Ad Manager placements. Ad unit paths are `/${NETWORK_CODE}/${UNIT_PREFIX}/${unit}`.
 * Reserved heights prevent layout shift (CLS) while ads load or when no ad fills.
 */
export type Placement = 'top_leaderboard' | 'in_article' | 'rail' | 'footer'

type SizeMap = { viewport: [number, number]; sizes: [number, number][] }[]

export const PLACEMENTS: Record<Placement, { unit: string; sizes: [number, number][]; sizeMap: SizeMap; minHeight: { mobile: number; desktop: number } }> = {
  top_leaderboard: {
    unit: 'top',
    sizes: [[970, 90], [728, 90], [320, 50], [320, 100]],
    sizeMap: [
      { viewport: [1024, 0], sizes: [[970, 90], [728, 90]] },
      { viewport: [768, 0], sizes: [[728, 90]] },
      { viewport: [0, 0], sizes: [[320, 50], [320, 100]] },
    ],
    minHeight: { mobile: 100, desktop: 90 },
  },
  in_article: {
    unit: 'in_article',
    sizes: [[300, 250], [336, 280]],
    sizeMap: [{ viewport: [0, 0], sizes: [[300, 250], [336, 280]] }],
    minHeight: { mobile: 280, desktop: 280 },
  },
  rail: {
    unit: 'rail',
    sizes: [[300, 250], [300, 600]],
    sizeMap: [
      { viewport: [1024, 0], sizes: [[300, 600], [300, 250]] },
      { viewport: [0, 0], sizes: [[300, 250]] },
    ],
    minHeight: { mobile: 250, desktop: 600 },
  },
  footer: {
    unit: 'footer',
    sizes: [[728, 90], [320, 50]],
    sizeMap: [
      { viewport: [768, 0], sizes: [[728, 90]] },
      { viewport: [0, 0], sizes: [[320, 50]] },
    ],
    minHeight: { mobile: 50, desktop: 90 },
  },
}

export const adsConfig = {
  networkCode: process.env.NEXT_PUBLIC_GAM_NETWORK_CODE || '',
  unitPrefix: (process.env.NEXT_PUBLIC_GAM_UNIT_PREFIX || 'news').replace(/^\/|\/$/g, ''),
  /** 'builtin' = this site's banner (India-first); 'external' = a Google-certified TCF CMP handles consent (needed for EEA/UK/CH traffic). */
  cmpMode: (process.env.NEXT_PUBLIC_CMP_MODE || 'builtin') as 'builtin' | 'external',
}

export const adsEnabled = () => Boolean(adsConfig.networkCode)

export const adUnitPath = (p: Placement) => `/${adsConfig.networkCode}/${adsConfig.unitPrefix}/${PLACEMENTS[p].unit}`
