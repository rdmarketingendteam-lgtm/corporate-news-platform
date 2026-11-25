import { describe, expect, it } from 'vitest'

import { slugify } from '../../src/collections/fields'
import { lexicalFromParagraphs, lexicalToPlainText, truncateLexical, wordCount } from '../../src/lib/lexical'

describe('lexical helpers', () => {
  const doc = lexicalFromParagraphs(['First paragraph here.', 'Second one.', 'Third.', 'Fourth is premium.'])

  it('extracts plain text with paragraph breaks', () => {
    expect(lexicalToPlainText(doc)).toBe('First paragraph here.\nSecond one.\nThird.\nFourth is premium.')
  })
  it('includes block text such as pull quotes', () => {
    const withBlock = {
      root: { type: 'root', children: [{ type: 'block', fields: { blockType: 'pullQuote', quote: 'Quoted words' } }] },
    }
    expect(lexicalToPlainText(withBlock as any)).toContain('Quoted words')
  })
  it('counts words', () => {
    expect(wordCount(doc)).toBe(9)
    expect(wordCount(null)).toBe(0)
  })
  it('truncates to the first N top-level blocks without mutating the input', () => {
    const preview = truncateLexical(doc, 2)
    expect(lexicalToPlainText(preview)).toBe('First paragraph here.\nSecond one.')
    expect(doc.root.children).toHaveLength(4)
  })
})

describe('slugify', () => {
  it('produces URL-safe slugs', () => {
    expect(slugify('  Monsoon Session: Parliament  Opens! ')).toBe('monsoon-session-parliament-opens')
    expect(slugify('Café Société')).toBe('cafe-societe')
  })
})
