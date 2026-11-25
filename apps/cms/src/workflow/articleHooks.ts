import {
  APIError,
  Forbidden,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type PayloadRequest,
} from 'payload'

import { canPublishInCategory, hasRole, isStaff, relId, roleOf } from '../access/roles'
import { writeAudit } from '../lib/audit'
import { lexicalToPlainText, truncateLexical, wordCount } from '../lib/lexical'
import { cacheTags, revalidateWeb } from '../lib/revalidate'
import {
  PUBLISHABLE_STATUSES,
  STATUS_LABELS,
  canEditInStatus,
  canTransition,
  isArticleStatus,
  requiresNote,
  type ArticleStatus,
} from './transitions'

/** Paragraph count shown to non-subscribers on subscriber-only stories. */
export const PAYWALL_PREVIEW_BLOCKS = 3

type WorkflowContext = {
  prev: ArticleStatus
  next: ArticleStatus
  note?: string
  isPublishOp: boolean
  isUnpublishOp: boolean
  wasLive: boolean
  liveSlug?: string | null
  liveCategory?: string | null
  actorLabel?: string
}

type ArticleData = Record<string, any>

const isDraftRequest = (req: PayloadRequest): boolean => {
  const q = (req.query ?? {}) as Record<string, unknown>
  return q.draft === 'true' || q.draft === true || q.autosave === 'true' || q.autosave === true
}

const validationError = (path: string, message: string, req: PayloadRequest) =>
  new ValidationError({ collection: 'articles', errors: [{ path, message }], req })

/** Load the currently *live* row (main table), which can differ from the latest draft. */
async function loadLive(req: PayloadRequest, id: number | string | undefined) {
  if (id === undefined || id === null) return null
  try {
    return (await req.payload.findByID({
      collection: 'articles',
      id,
      draft: false,
      depth: 0,
      overrideAccess: true,
      req,
      select: { slug: true, _status: true, status: true, category: true, publishedAt: true },
    })) as ArticleData
  } catch {
    return null
  }
}

/**
 * Enforces the editorial workflow on every create/update coming from a logged-in user:
 *  Draft → Submitted → In review → Approved → Scheduled/Published, plus Archived (unpublish).
 * Local API calls without a user (scheduler, seed, migrations) are trusted.
 */
export const enforceWorkflow: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const now = new Date()
  const d = data as ArticleData
  const original = (originalDoc ?? {}) as ArticleData

  // ---- derived fields (always) ----
  if (d.body !== undefined) {
    d.searchText = lexicalToPlainText(d.body, 20_000)
    d.wordCount = wordCount(d.body)
  }
  const accessLevel = d.accessLevel ?? original.accessLevel ?? 'free'
  const body = d.body ?? original.body
  d.preview = accessLevel === 'subscribers' && body ? truncateLexical(body, PAYWALL_PREVIEW_BLOCKS) : null

  const prev: ArticleStatus =
    operation === 'create' ? 'draft' : isArticleStatus(original.status) ? original.status : 'draft'
  let next: ArticleStatus = isArticleStatus(d.status) ? d.status : prev

  const isPublishOp = d._status === 'published'
  const isDraftSave = d._status === 'draft' && (operation === 'create' || isDraftRequest(req) || req.payloadAPI === 'local')

  const live = operation === 'update' ? await loadLive(req, original.id) : null
  // live row has been published at some point (it may now be archived)
  const liveRowPublished = live?._status === 'published'
  // ...and is currently publicly visible
  const wasLive = liveRowPublished && live?.status === 'published'
  const isUnpublishOp = operation === 'update' && liveRowPublished && d._status === 'draft' && !isDraftSave

  const user = req.user
  const note = typeof d.workflowNote === 'string' ? d.workflowNote.trim() : ''
  delete d.workflowNote

  const ctx: WorkflowContext = {
    prev,
    next,
    note: note || undefined,
    isPublishOp,
    isUnpublishOp,
    wasLive,
    liveSlug: liveRowPublished ? (live?.slug ?? null) : null,
    liveCategory: relId(live?.category),
  }

  // ---- trusted server-side path (scheduler / seed) ----
  if (!user || context?.skipWorkflow) {
    if (isPublishOp && (next === 'approved' || next === 'scheduled')) next = 'published'
    if (isPublishOp && next === 'published' && !d.publishedAt && !original.publishedAt) d.publishedAt = now.toISOString()
    d.status = next
    ctx.next = next
    ctx.actorLabel = (context?.actorLabel as string) ?? 'system'
    req.context.workflow = ctx
    return d
  }

  if (!isStaff(user)) throw new Forbidden(req.t)

  const role = roleOf(user)
  const category = d.category ?? original.category
  const canPublishHere =
    canPublishInCategory(user, category) && (operation === 'create' || canPublishInCategory(user, original.category))
  const isOwner = operation === 'create' || relId(original.createdBy) === String(user.id)
  const tctx = { role, canPublishHere, isOwner }

  if (operation === 'create') {
    d.createdBy = user.id
  } else if (!canEditInStatus(prev, tctx)) {
    throw new APIError(
      `Your role (${role}) cannot edit an article that is "${STATUS_LABELS[prev]}".`,
      403,
      null,
      true,
    )
  }

  if (!canTransition(prev, next, tctx)) {
    throw new APIError(
      `Your role (${role}) cannot move an article from "${STATUS_LABELS[prev]}" to "${STATUS_LABELS[next]}".`,
      403,
      null,
      true,
    )
  }

  if (requiresNote(prev, next) && !note) {
    throw validationError(
      'workflowNote',
      next === 'archived'
        ? 'Give a reason for unpublishing — it is recorded in the audit log.'
        : 'Explain what needs to change — the note is sent back to the writer.',
      req,
    )
  }

  const publishedAt = d.publishedAt ?? original.publishedAt
  if (next === 'scheduled') {
    if (isPublishOp) {
      throw validationError('status', 'To schedule, set a future publish time and use "Save draft", not "Publish".', req)
    }
    if (!publishedAt || new Date(publishedAt).getTime() <= now.getTime()) {
      throw validationError('publishedAt', 'Scheduled articles need a publish time in the future.', req)
    }
  }

  if (isPublishOp) {
    if (!canPublishHere) throw new APIError('Only editors with publishing rights for this section can publish.', 403, null, true)
    if (!PUBLISHABLE_STATUSES.includes(next)) {
      throw validationError('status', 'Set the status to "Approved" (or later) before publishing.', req)
    }
    if (next === 'approved' || next === 'scheduled') next = 'published'
    if (next === 'published') {
      if (!liveRowPublished) {
        // first publication (or early release of a scheduled story): the public timestamp is now
        d.publishedAt = now.toISOString()
      } else {
        // update to a live story: keep the original publication time, record the update time
        d.publishedAt = live?.publishedAt ?? now.toISOString()
        d.lastUpdatedAt = now.toISOString()
      }
    }
  } else if (next === 'published' && prev !== 'published') {
    throw validationError('status', 'Use the "Publish" button to publish an approved article.', req)
  }

  if (isUnpublishOp) {
    if (!canPublishHere) throw new APIError('Only editors can unpublish articles.', 403, null, true)
    next = 'archived'
  }

  d.status = next
  ctx.next = next

  if (note) {
    d.editorialNotes = [
      ...((original.editorialNotes as unknown[]) ?? []),
      { note, author: user.id, createdAt: now.toISOString(), fromStatus: prev, toStatus: next },
    ]
  }

  req.context.workflow = ctx
  return d
}

/** Audit, redirects for changed slugs, and cache invalidation after a successful save. */
export const afterArticleChange: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  const ctx = req.context.workflow as WorkflowContext | undefined
  if (!ctx) return doc
  delete req.context.workflow

  const actor = isStaff(req.user) ? req.user.id : undefined
  const statusChanged = ctx.prev !== ctx.next || operation === 'create'

  if (statusChanged || ctx.isPublishOp || ctx.isUnpublishOp) {
    let action = `article.status.${ctx.prev}->${ctx.next}`
    if (ctx.isPublishOp && ctx.next === 'published') action = ctx.wasLive ? 'article.republish' : 'article.publish'
    if (ctx.next === 'archived' && (ctx.isPublishOp || ctx.isUnpublishOp)) action = 'article.unpublish'
    if (operation === 'create') action = 'article.create'
    await writeAudit(req, {
      action,
      entityType: 'articles',
      entityId: String(doc.id),
      actor,
      actorLabel: ctx.actorLabel,
      reason: ctx.note,
      metadata: { from: ctx.prev, to: ctx.next, slug: doc.slug, headline: doc.headline },
    })
  }

  const liveChanged = doc._status === 'published' || ctx.isUnpublishOp
  if (!liveChanged) return doc

  // Slug changed on a live article → permanent redirect, collapsing any chains.
  if (ctx.liveSlug && ctx.liveSlug !== doc.slug && doc._status === 'published' && doc.status === 'published') {
    const from = `/news/${ctx.liveSlug}`
    const to = `/news/${doc.slug}`
    await req.payload.update({
      collection: 'redirects',
      where: { to: { equals: from } },
      data: { to },
      overrideAccess: true,
      req,
    })
    await req.payload.delete({ collection: 'redirects', where: { from: { equals: to } }, overrideAccess: true, req })
    const existing = await req.payload.find({
      collection: 'redirects',
      where: { from: { equals: from } },
      limit: 1,
      overrideAccess: true,
      req,
    })
    if (existing.docs[0]) {
      await req.payload.update({ collection: 'redirects', id: existing.docs[0].id, data: { to }, overrideAccess: true, req })
    } else {
      await req.payload.create({ collection: 'redirects', data: { from, to }, overrideAccess: true, req })
    }
  }

  const tags = [cacheTags.articles, cacheTags.article(doc.slug)]
  if (ctx.liveSlug) tags.push(cacheTags.article(ctx.liveSlug))
  const categoryIds = [relId(doc.category), ctx.liveCategory].filter(Boolean) as string[]
  for (const id of categoryIds) {
    const cat = await req.payload
      .findByID({ collection: 'categories', id, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (cat?.slug) tags.push(cacheTags.category(cat.slug))
  }
  const authorId = relId(doc.author)
  if (authorId) {
    const author = await req.payload
      .findByID({ collection: 'authors', id: authorId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (author?.slug) tags.push(cacheTags.author(author.slug))
  }

  await revalidateWeb(req.payload, { tags })
  return doc
}

/** Journalists may only delete their own never-published drafts; everyone else needs EIC/super admin. */
export const guardArticleDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (!req.user) return
  if (hasRole(req.user, 'super_admin', 'editor_in_chief')) return
  const live = await loadLive(req, id)
  const latest = (await req.payload.findByID({
    collection: 'articles',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
    req,
  })) as ArticleData
  if (live?._status === 'published' || live?.publishedAt) {
    throw new APIError('Published articles cannot be deleted. Unpublish (archive) them instead.', 403, null, true)
  }
  if (relId(latest?.createdBy) !== String(req.user.id)) throw new Forbidden(req.t)
}

export const afterArticleDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await writeAudit(req, {
    action: 'article.delete',
    entityType: 'articles',
    entityId: String(doc.id),
    actor: isStaff(req.user) ? req.user.id : undefined,
    metadata: { slug: doc.slug, headline: doc.headline },
  })
  if (doc.slug) await revalidateWeb(req.payload, { tags: [cacheTags.articles, cacheTags.article(doc.slug)] })
}
