import type { Block } from 'payload'

/**
 * Rich-text blocks available inside article bodies. Embeds are stored as URLs only —
 * never raw HTML/script — and rendered by the website through an allow-list.
 */
export const EmbedBlock: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlock',
  labels: { singular: 'Embed', plural: 'Embeds' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: { description: 'YouTube, X/Twitter or Instagram post URL. Other URLs render as a link card.' },
      validate: (value: unknown) => {
        if (typeof value !== 'string') return 'URL is required'
        try {
          const u = new URL(value)
          return u.protocol === 'https:' ? true : 'Embed URLs must use https://'
        } catch {
          return 'Enter a valid URL'
        }
      },
    },
    { name: 'caption', type: 'text' },
  ],
}

export const PullQuoteBlock: Block = {
  slug: 'pullQuote',
  interfaceName: 'PullQuoteBlock',
  labels: { singular: 'Pull quote', plural: 'Pull quotes' },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'attribution', type: 'text' },
  ],
}

export const FactBoxBlock: Block = {
  slug: 'factBox',
  interfaceName: 'FactBoxBlock',
  labels: { singular: 'Fact box', plural: 'Fact boxes' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'text', type: 'textarea', required: true },
  ],
}

export const articleBlocks = [EmbedBlock, PullQuoteBlock, FactBoxBlock]
