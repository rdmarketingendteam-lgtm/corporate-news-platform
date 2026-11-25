import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

/**
 * Newsroom roles. Every permission decision in the CMS is made server-side from
 * these helpers — hiding UI is never relied on for security.
 */
export const ROLES = [
  'super_admin',
  'editor_in_chief',
  'section_editor',
  'journalist',
  'copy_editor',
  'seo_manager',
  'ad_manager',
  'analyst',
] as const

export type Role = (typeof ROLES)[number]

/** Roles allowed to approve, schedule, publish and unpublish (section editors only within their sections). */
export const PUBLISHER_ROLES: Role[] = ['super_admin', 'editor_in_chief', 'section_editor']
/** Roles allowed to create new articles. */
export const AUTHOR_ROLES: Role[] = ['super_admin', 'editor_in_chief', 'section_editor', 'journalist']
/** Roles that may change article body/headline/etc. (SEO, ad and analyst roles cannot). */
export const CONTENT_EDITOR_ROLES: Role[] = [
  'super_admin',
  'editor_in_chief',
  'section_editor',
  'journalist',
  'copy_editor',
]

type AnyUser = PayloadRequest['user']

export type StaffUser = {
  id: number | string
  collection: 'users'
  role?: Role | null
  sections?: (number | string | { id: number | string })[] | null
  email?: string
}

export type ReaderUser = {
  id: number | string
  collection: 'readers'
  entitlement?: {
    status?: string | null
    planCode?: string | null
    activeUntil?: string | null
    adFree?: boolean | null
  } | null
}

export const isStaff = (user: AnyUser | undefined | null): user is AnyUser & StaffUser =>
  Boolean(user && (user as { collection?: string }).collection === 'users')

export const isReader = (user: AnyUser | undefined | null): user is AnyUser & ReaderUser =>
  Boolean(user && (user as { collection?: string }).collection === 'readers')

export const roleOf = (user: AnyUser | undefined | null): Role | null =>
  isStaff(user) ? ((user as StaffUser).role ?? null) : null

export const hasRole = (user: AnyUser | undefined | null, ...roles: Role[]): boolean => {
  const role = roleOf(user)
  return Boolean(role && roles.includes(role))
}

export const relId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && 'id' in (value as object)) return String((value as { id: unknown }).id)
  return String(value)
}

export const userSectionIds = (user: AnyUser | undefined | null): string[] => {
  if (!isStaff(user)) return []
  return ((user as StaffUser).sections ?? []).map(relId).filter((id): id is string => Boolean(id))
}

/** Can this user approve/publish an article in the given category? */
export const canPublishInCategory = (user: AnyUser | undefined | null, category: unknown): boolean => {
  if (hasRole(user, 'super_admin', 'editor_in_chief')) return true
  if (hasRole(user, 'section_editor')) {
    const categoryId = relId(category)
    return Boolean(categoryId && userSectionIds(user).includes(categoryId))
  }
  return false
}

/** Reader has an active paid entitlement right now. */
export const isEntitledReader = (user: AnyUser | undefined | null, now = new Date()): boolean => {
  if (!isReader(user)) return false
  const ent = (user as ReaderUser).entitlement
  if (!ent?.activeUntil) return false
  if (!['active', 'trialing', 'past_due'].includes(ent.status ?? '')) return false
  return new Date(ent.activeUntil).getTime() > now.getTime()
}

// ---------- Reusable access functions ----------

export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const superAdminOnly: Access = ({ req }) => hasRole(req.user, 'super_admin')
export const nobody: Access = () => false
export const anyone: Access = () => true

export const rolesAccess =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(req.user, ...roles)

export const fieldRoles =
  (...roles: Role[]): FieldAccess =>
  ({ req }) =>
    hasRole(req.user, ...roles)

/** Taxonomy (categories, tags, authors): public read, editors manage. */
export const taxonomyAccess = {
  read: anyone,
  create: rolesAccess('super_admin', 'editor_in_chief', 'section_editor', 'seo_manager'),
  update: rolesAccess('super_admin', 'editor_in_chief', 'section_editor', 'seo_manager'),
  delete: rolesAccess('super_admin', 'editor_in_chief'),
}

/** Public may only see live, published articles; staff see everything. */
export const PUBLIC_ARTICLE_WHERE: Where = {
  and: [{ status: { equals: 'published' } }, { _status: { equals: 'published' } }],
}
