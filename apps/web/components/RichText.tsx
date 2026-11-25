import { Fragment, type CSSProperties, type ReactNode } from 'react'

import type { LexicalNode, LexicalState } from '../lib/lexical/types'
import { classifyEmbed, internalHref, safeHref } from '../lib/lexical/url'

/**
 * Renders Payload Lexical JSON to React. Universal (works in server and client components).
 * Never outputs raw HTML: every node type is mapped explicitly, links are allow-listed,
 * and embeds are restricted to a privacy-enhanced YouTube player or plain link cards.
 */

// Lexical text format bit flags
const BOLD = 1
const ITALIC = 1 << 1
const STRIKETHROUGH = 1 << 2
const UNDERLINE = 1 << 3
const CODE = 1 << 4
const SUBSCRIPT = 1 << 5
const SUPERSCRIPT = 1 << 6
const HIGHLIGHT = 1 << 7

const ALIGN: Record<string, CSSProperties['textAlign']> = { center: 'center', right: 'right', justify: 'justify' }

type Ctx = { parentListType?: string }

function renderText(node: LexicalNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? ''
  const f = typeof node.format === 'number' ? node.format : 0
  if (f & CODE) out = <code>{out}</code>
  if (f & HIGHLIGHT) out = <mark>{out}</mark>
  if (f & SUBSCRIPT) out = <sub>{out}</sub>
  if (f & SUPERSCRIPT) out = <sup>{out}</sup>
  if (f & STRIKETHROUGH) out = <s>{out}</s>
  if (f & UNDERLINE) out = <u>{out}</u>
  if (f & ITALIC) out = <em>{out}</em>
  if (f & BOLD) out = <strong>{out}</strong>
  return <Fragment key={key}>{out}</Fragment>
}

function pickImage(media: any): { src: string; srcSet?: string; width?: number; height?: number } | null {
  if (!media || typeof media !== 'object' || !media.url) return null
  const sizes = media.sizes ?? {}
  const candidates = ['card', 'hero']
    .map((k) => sizes[k])
    .filter((s: any) => s?.url && s?.width)
    .map((s: any) => `${s.url} ${s.width}w`)
  const main = sizes.hero?.url ? sizes.hero : sizes.card?.url ? sizes.card : media
  return {
    src: main.url,
    srcSet: candidates.length ? candidates.join(', ') : undefined,
    width: main.width ?? media.width ?? undefined,
    height: main.height ?? media.height ?? undefined,
  }
}

function renderBlock(fields: Record<string, any>, key: number): ReactNode {
  switch (fields.blockType) {
    case 'pullQuote':
      return (
        <figure key={key} className="rt-pullquote">
          <blockquote>{fields.quote}</blockquote>
          {fields.attribution && <figcaption>— {fields.attribution}</figcaption>}
        </figure>
      )
    case 'factBox':
      return (
        <aside key={key} className="rt-factbox">
          <strong>{fields.title}</strong>
          <p>{fields.text}</p>
        </aside>
      )
    case 'embed': {
      const embed = classifyEmbed(fields.url)
      if (!embed) return null
      if (embed.kind === 'youtube') {
        return (
          <figure key={key} className="rt-embed rt-embed-video">
            <div className="rt-embed-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${embed.id}`}
                title={fields.caption || 'Embedded video'}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              />
            </div>
            {fields.caption && <figcaption>{fields.caption}</figcaption>}
          </figure>
        )
      }
      return (
        <figure key={key} className="rt-embed rt-embed-link">
          <a href={embed.url} target="_blank" rel="noopener noreferrer nofollow">
            {embed.label} ↗
          </a>
          {fields.caption && <figcaption>{fields.caption}</figcaption>}
        </figure>
      )
    }
    default:
      return null
  }
}

function renderNode(node: LexicalNode, key: number, ctx: Ctx = {}): ReactNode {
  const kids = (c: Ctx = {}) => (node.children ?? []).map((child, i) => renderNode(child, i, c))
  const align = typeof node.format === 'string' ? ALIGN[node.format] : undefined
  const style = align ? { textAlign: align } : undefined

  switch (node.type) {
    case 'text':
      return renderText(node, key)
    case 'linebreak':
      return <br key={key} />
    case 'tab':
      return <Fragment key={key}>{'\t'}</Fragment>
    case 'paragraph': {
      const children = kids()
      return children.length ? (
        <p key={key} style={style}>
          {children}
        </p>
      ) : null
    }
    case 'heading': {
      // h1 is reserved for the article headline
      const level = Math.min(Math.max(Number(String(node.tag ?? 'h2').replace('h', '')) || 2, 2), 6)
      const Tag = `h${level}` as 'h2'
      return (
        <Tag key={key} style={style}>
          {kids()}
        </Tag>
      )
    }
    case 'quote':
      return <blockquote key={key}>{kids()}</blockquote>
    case 'list': {
      const ordered = node.listType === 'number' || node.tag === 'ol'
      const Tag = ordered ? 'ol' : 'ul'
      return (
        <Tag key={key} className={node.listType === 'check' ? 'rt-checklist' : undefined} start={ordered && node.start && node.start !== 1 ? node.start : undefined}>
          {kids({ parentListType: node.listType })}
        </Tag>
      )
    }
    case 'listitem': {
      const nested = (node.children ?? []).some((c) => c.type === 'list')
      if (ctx.parentListType === 'check' && !nested) {
        return (
          <li key={key} className={node.checked ? 'checked' : undefined}>
            <span aria-hidden="true">{node.checked ? '☑' : '☐'} </span>
            {kids()}
          </li>
        )
      }
      return (
        <li key={key} style={nested ? { listStyleType: 'none' } : undefined}>
          {kids()}
        </li>
      )
    }
    case 'link':
    case 'autolink': {
      const f = node.fields ?? {}
      const href = f.linkType === 'internal' ? internalHref(f.doc) : safeHref(f.url)
      if (!href) return <Fragment key={key}>{kids()}</Fragment>
      const external = /^https?:/.test(href)
      return (
        <a
          key={key}
          href={href}
          target={f.newTab ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {kids()}
        </a>
      )
    }
    case 'horizontalrule':
      return <hr key={key} />
    case 'upload': {
      const media = node.value as any
      const img = pickImage(media)
      if (!img || (media.mimeType && !String(media.mimeType).startsWith('image/'))) return null
      const caption = node.fields?.caption ?? media.caption
      return (
        <figure key={key} className="rt-figure">
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes="(max-width: 800px) 100vw, 760px"
            alt={node.fields?.alt ?? media.alt ?? ''}
            width={img.width}
            height={img.height}
            loading="lazy"
            decoding="async"
          />
          {(caption || media.credit) && (
            <figcaption>
              {caption}
              {media.credit && <span className="rt-credit"> {media.credit}</span>}
            </figcaption>
          )}
        </figure>
      )
    }
    case 'block':
    case 'inlineBlock':
      return node.fields ? renderBlock(node.fields, key) : null
    case 'relationship': {
      const href = internalHref({ relationTo: node.relationTo as string, value: node.value })
      const title = (node.value as any)?.headline ?? (node.value as any)?.name
      return href && title ? (
        <p key={key} className="rt-related">
          <span>Read more: </span>
          <a href={href}>{title}</a>
        </p>
      ) : null
    }
    case 'table':
      return (
        <div key={key} className="rt-table">
          <table>
            <tbody>{kids()}</tbody>
          </table>
        </div>
      )
    case 'tablerow':
      return <tr key={key}>{kids()}</tr>
    case 'tablecell': {
      const Tag = node.headerState && node.headerState > 0 ? 'th' : 'td'
      return (
        <Tag key={key} colSpan={node.colSpan && node.colSpan > 1 ? node.colSpan : undefined} rowSpan={node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined}>
          {kids()}
        </Tag>
      )
    }
    default:
      // Unknown node: render its children (if any) so text is never silently lost.
      return node.children?.length ? <Fragment key={key}>{kids()}</Fragment> : null
  }
}

export function RichText({ content, className }: { content: LexicalState; className?: string }) {
  if (!content?.root?.children?.length) return null
  return <div className={className ?? 'rich-text'}>{content.root.children.map((n, i) => renderNode(n, i))}</div>
}

/** Insert a React node (e.g. an in-article ad) after the Nth top-level block. */
export function RichTextWithInsert({ content, insertAfter, insert }: { content: LexicalState; insertAfter: number; insert: ReactNode }) {
  const nodes = content?.root?.children ?? []
  if (!nodes.length) return null
  return (
    <div className="rich-text">
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {renderNode(n, i)}
          {i === insertAfter - 1 && nodes.length > insertAfter ? insert : null}
        </Fragment>
      ))}
    </div>
  )
}
