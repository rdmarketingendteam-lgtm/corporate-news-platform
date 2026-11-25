import type { Role } from '../access/roles'

export const ARTICLE_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived',
] as const

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived (unpublished)',
}

/** Statuses an article must be in (as the incoming value) for the "Publish" button to succeed. */
export const PUBLISHABLE_STATUSES: ArticleStatus[] = ['approved', 'scheduled', 'published', 'archived']

/** Transitions that must carry an explanatory note (stored in editorial notes + audit log). */
export const requiresNote = (from: ArticleStatus, to: ArticleStatus): boolean => {
  if (from === to) return false
  if (to === 'archived') return true // unpublish / kill requires a reason
  if (to === 'draft' && ['submitted', 'in_review', 'approved', 'scheduled'].includes(from)) return true // changes requested
  return false
}

type TransitionContext = {
  role: Role | null
  /** True when the user may publish in the article's section (EIC / super admin / own-section editor). */
  canPublishHere: boolean
  /** True when the user created the article. */
  isOwner: boolean
}

/**
 * Who may move an article from one editorial status to another.
 * Publishing itself ("going live") is additionally gated in the hook.
 */
export const canTransition = (from: ArticleStatus, to: ArticleStatus, ctx: TransitionContext): boolean => {
  if (from === to) return true
  if (ctx.canPublishHere) return true

  switch (ctx.role) {
    case 'journalist':
      return ctx.isOwner && from === 'draft' && to === 'submitted'
    case 'copy_editor':
      return (
        (from === 'draft' && to === 'submitted') ||
        (from === 'submitted' && to === 'in_review') ||
        (['submitted', 'in_review'].includes(from) && to === 'draft')
      )
    default:
      return false
  }
}

/** Which statuses a role may edit article content in (doc-level ownership is enforced separately). */
export const canEditInStatus = (status: ArticleStatus, ctx: TransitionContext): boolean => {
  if (ctx.canPublishHere) return true
  switch (ctx.role) {
    case 'journalist':
      return ctx.isOwner && status === 'draft'
    case 'copy_editor':
      return ['draft', 'submitted', 'in_review', 'approved'].includes(status)
    case 'seo_manager':
      // field-level access limits seo_manager to SEO fields; allowed on any non-archived article
      return status !== 'archived'
    default:
      return false
  }
}

export const isArticleStatus = (value: unknown): value is ArticleStatus =>
  typeof value === 'string' && (ARTICLE_STATUSES as readonly string[]).includes(value)
