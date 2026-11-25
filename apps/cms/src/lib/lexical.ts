/** Minimal helpers for Payload Lexical rich-text JSON (server side). */

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  [key: string]: unknown
}

export type LexicalState = { root?: LexicalNode } | null | undefined

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'quote', 'listitem', 'list', 'tablecell', 'tablerow'])

/** Plain text of a Lexical document — used for search indexing, word counts, RSS descriptions. */
export function lexicalToPlainText(state: LexicalState, maxLength = 100_000): string {
  const out: string[] = []
  const walk = (node: LexicalNode | undefined) => {
    if (!node) return
    if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
    else if (node.type === 'linebreak') out.push('\n')
    else if (node.type === 'block' && node.fields) {
      // include textual block content (pull quotes, captions)
      for (const key of ['quote', 'text', 'caption', 'attribution']) {
        const v = node.fields[key]
        if (typeof v === 'string') out.push(v, '\n')
      }
    }
    for (const child of node.children ?? []) walk(child)
    if (node.type && BLOCK_TYPES.has(node.type)) out.push('\n')
  }
  walk(state?.root)
  return out
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

export function wordCount(state: LexicalState): number {
  const text = lexicalToPlainText(state)
  return text ? text.split(/\s+/).filter(Boolean).length : 0
}

/**
 * Keep only the first `keepBlocks` top-level nodes. Used for the paywall preview so
 * the full body of subscriber-only articles is never sent to non-entitled readers.
 */
export function truncateLexical<T extends LexicalState>(state: T, keepBlocks = 3): T {
  if (!state?.root?.children) return state
  return {
    ...state,
    root: { ...state.root, children: state.root.children.slice(0, keepBlocks) },
  } as T
}

/** Build a minimal Lexical document from plain paragraphs (used by seed + tests). */
export function lexicalFromParagraphs(paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
      })),
    },
  }
}
