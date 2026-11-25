/** Serialized Lexical JSON as stored by Payload's richText field. */
export type LexicalNode = {
  type: string
  version?: number
  children?: LexicalNode[]
  // text
  text?: string
  format?: number | string
  // heading / list
  tag?: string
  listType?: 'bullet' | 'number' | 'check'
  checked?: boolean
  start?: number
  value?: unknown
  // link / block / upload
  fields?: Record<string, any>
  relationTo?: string
  // table
  headerState?: number
  colSpan?: number
  rowSpan?: number
  [key: string]: unknown
}

export type LexicalState = { root: LexicalNode } | null | undefined
