import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText, RichTextWithInsert } from '../components/RichText'
import { classifyEmbed, internalHref, safeHref } from '../lib/lexical/url'

const text = (t: string, format = 0) => ({ type: 'text', text: t, format })
const p = (...children: any[]) => ({ type: 'paragraph', children })
const doc = (...children: any[]) => ({ root: { type: 'root', children } })
const html = (...children: any[]) => renderToStaticMarkup(<RichText content={doc(...children) as any} />)

describe('RichText', () => {
  it('renders paragraphs and text formats', () => {
    expect(html(p(text('bold', 1), text(' and '), text('italic', 2), text(' sup', 64)))).toBe(
      '<div class="rich-text"><p><strong>bold</strong> and <em>italic</em><sup> sup</sup></p></div>',
    )
  })

  it('demotes h1 to h2 (headline owns h1) and keeps lower levels', () => {
    expect(html({ type: 'heading', tag: 'h1', children: [text('A')] }, { type: 'heading', tag: 'h3', children: [text('B')] })).toContain('<h2>A</h2><h3>B</h3>')
  })

  it('renders lists, quotes and rules', () => {
    const out = html(
      { type: 'list', listType: 'number', tag: 'ol', children: [{ type: 'listitem', children: [text('one')] }] },
      { type: 'quote', children: [text('q')] },
      { type: 'horizontalrule' },
    )
    expect(out).toContain('<ol><li>one</li></ol><blockquote>q</blockquote><hr/>')
  })

  it('escapes text — never injects HTML', () => {
    const out = html(p(text('<script>alert(1)</script>')))
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('drops javascript: links but keeps their text', () => {
    const out = html(p({ type: 'link', fields: { url: 'javascript:alert(1)' }, children: [text('click')] }))
    expect(out).not.toContain('href')
    expect(out).toContain('click')
  })

  it('renders external links safely and internal links to site paths', () => {
    const out = html(
      p({ type: 'link', fields: { url: 'https://example.com', newTab: true }, children: [text('ext')] }),
      p({ type: 'link', fields: { linkType: 'internal', doc: { relationTo: 'articles', value: { slug: 'budget-day' } } }, children: [text('int')] }),
    )
    expect(out).toContain('<a href="https://example.com/" target="_blank" rel="noopener noreferrer">ext</a>')
    expect(out).toContain('<a href="/news/budget-day">int</a>')
  })

  it('renders images with alt, caption and credit', () => {
    const out = html({
      type: 'upload',
      relationTo: 'media',
      value: { url: '/m.jpg', alt: 'A flooded street', caption: 'Mumbai, Tuesday', credit: 'Photo: Staff', mimeType: 'image/jpeg', width: 1600, height: 1000 },
    })
    expect(out).toContain('alt="A flooded street"')
    expect(out).toContain('Mumbai, Tuesday')
    expect(out).toContain('Photo: Staff')
  })

  it('renders YouTube as a privacy-enhanced iframe and other embeds as links', () => {
    const out = html(
      { type: 'block', fields: { blockType: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
      { type: 'block', fields: { blockType: 'embed', url: 'https://x.com/user/status/1' } },
    )
    expect(out).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')
    expect(out).toContain('View post on X')
    expect(out).not.toContain('platform.twitter.com')
  })

  it('renders pull quotes and fact boxes', () => {
    const out = html({ type: 'block', fields: { blockType: 'pullQuote', quote: 'Words', attribution: 'Minister' } }, { type: 'block', fields: { blockType: 'factBox', title: 'Facts', text: 'x' } })
    expect(out).toContain('<blockquote>Words</blockquote>')
    expect(out).toContain('— Minister')
    expect(out).toContain('<strong>Facts</strong>')
  })

  it('renders children of unknown nodes and nothing for empty content', () => {
    expect(html({ type: 'mystery', children: [text('kept')] })).toContain('kept')
    expect(renderToStaticMarkup(<RichText content={null} />)).toBe('')
  })

  it('inserts a node after the Nth block', () => {
    const out = renderToStaticMarkup(<RichTextWithInsert content={doc(p(text('1')), p(text('2')), p(text('3'))) as any} insertAfter={2} insert={<i>AD</i>} />)
    expect(out).toBe('<div class="rich-text"><p>1</p><p>2</p><i>AD</i><p>3</p></div>')
  })
})

describe('url helpers', () => {
  it('allow-lists schemes', () => {
    expect(safeHref('https://a.com/x')).toBe('https://a.com/x')
    expect(safeHref('/local')).toBe('/local')
    expect(safeHref('//evil.com')).toBeNull()
    expect(safeHref('data:text/html,hi')).toBeNull()
    expect(safeHref('JavaScript:alert(1)')).toBeNull()
    expect(safeHref('mailto:desk@news.test')).toBe('mailto:desk@news.test')
  })
  it('maps internal docs', () => {
    expect(internalHref({ relationTo: 'tags', value: { slug: 'monsoon' } })).toBe('/topic/monsoon')
    expect(internalHref({ relationTo: 'articles', value: 5 })).toBeNull()
  })
  it('classifies YouTube URL shapes', () => {
    for (const u of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3']) {
      expect(classifyEmbed(u)).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
    }
    expect(classifyEmbed('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull() // https only
  })
})
