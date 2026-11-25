import type { AccessResult, CollectionConfig, Field, FieldAccess } from 'payload'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import {
  AUTHOR_ROLES,
  CONTENT_EDITOR_ROLES,
  PUBLIC_ARTICLE_WHERE,
  PUBLISHER_ROLES,
  fieldRoles,
  hasRole,
  isEntitledReader,
  isStaff,
  rolesAccess,
  staffOnly,
  userSectionIds,
} from '../access/roles'
import { articleBlocks } from '../blocks'
import {
  afterArticleChange,
  afterArticleDelete,
  enforceWorkflow,
  guardArticleDelete,
} from '../workflow/articleHooks'
import { ARTICLE_STATUSES, STATUS_LABELS } from '../workflow/transitions'

const contentAccess = {
  create: fieldRoles(...CONTENT_EDITOR_ROLES),
  update: fieldRoles(...CONTENT_EDITOR_ROLES),
}
const publisherAccess = {
  create: fieldRoles(...PUBLISHER_ROLES),
  update: fieldRoles(...PUBLISHER_ROLES),
}
const seoAccess = {
  create: fieldRoles(...CONTENT_EDITOR_ROLES, 'seo_manager'),
  update: fieldRoles(...CONTENT_EDITOR_ROLES, 'seo_manager'),
}
const systemOnly = { create: () => false, update: () => false }

/**
 * Full body is readable for free stories, staff, and entitled subscribers. Also blocks querying the body.
 * FAIL CLOSED: with `?select=`, `doc` only contains the selected fields, so a missing
 * `accessLevel` must deny — checking `!== 'subscribers'` would leak premium bodies.
 */
const bodyRead: FieldAccess = ({ req, doc }) => {
  if (isStaff(req.user) || isEntitledReader(req.user)) return true
  return doc?.accessLevel === 'free'
}

/** Apply content-editor access to every field that doesn't declare its own. */
const content = (field: Field): Field => ('access' in field && field.access ? field : ({ ...field, access: contentAccess } as Field))

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  versions: {
    drafts: { autosave: { interval: 2000 }, validate: false },
    maxPerDoc: 100,
  },
  admin: {
    useAsTitle: 'headline',
    defaultColumns: ['headline', 'status', 'category', 'author', 'publishedAt', 'updatedAt'],
    listSearchableFields: ['headline', 'slug', 'dek'],
    description:
      'Workflow: Draft → Submitted → In review → Approved → Publish (or Scheduled). To unpublish, set status to Archived with a reason and click Publish.',
  },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : PUBLIC_ARTICLE_WHERE),
    readVersions: staffOnly,
    create: rolesAccess(...AUTHOR_ROLES),
    update: ({ req }): AccessResult => {
      const user = req.user
      if (hasRole(user, 'super_admin', 'editor_in_chief', 'copy_editor', 'seo_manager')) return true
      if (hasRole(user, 'section_editor')) return { category: { in: userSectionIds(user) } }
      if (hasRole(user, 'journalist')) return { createdBy: { equals: user!.id } }
      return false
    },
    delete: rolesAccess('super_admin', 'editor_in_chief', 'journalist'),
  },
  hooks: {
    beforeChange: [enforceWorkflow],
    afterChange: [afterArticleChange],
    beforeDelete: [guardArticleDelete],
    afterDelete: [afterArticleDelete],
  },
  fields: [
    content({ name: 'headline', type: 'text', required: true, maxLength: 200 }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: seoAccess,
      admin: { position: 'sidebar', description: 'URL: /news/<slug>. Changing it on a live story creates a 301 redirect.' },
      validate: (value: unknown) =>
        typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
          ? true
          : 'Use lowercase letters, numbers and hyphens only',
    },
    content({ name: 'dek', label: 'Standfirst / dek', type: 'textarea', maxLength: 400 }),
    {
      name: 'body',
      type: 'richText',
      required: true,
      access: { ...contentAccess, read: bodyRead },
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: articleBlocks })],
      }),
    },
    content({ name: 'author', type: 'relationship', relationTo: 'authors', required: true }),
    content({
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    }),
    content({ name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, admin: { position: 'sidebar' } }),
    content({ name: 'featuredMedia', type: 'upload', relationTo: 'media' }),

    // ---- workflow ----
    {
      name: 'status',
      type: 'select',
      // Payload's own draft `_status` column would otherwise share the Postgres enum name `enum_articles_status`.
      enumName: 'enum_articles_workflow_status',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: ARTICLE_STATUSES.map((value) => ({ label: STATUS_LABELS[value], value })),
      access: contentAccess,
      admin: { position: 'sidebar', description: 'Allowed changes depend on your role; enforced on the server.' },
    },
    {
      name: 'workflowNote',
      type: 'textarea',
      virtual: true,
      access: contentAccess,
      admin: {
        position: 'sidebar',
        description: 'Required when sending back for changes or unpublishing. Saved to editorial notes and the audit log.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      access: publisherAccess,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set automatically on publish. For "Scheduled", set the future release time.',
      },
    },
    {
      name: 'lastUpdatedAt',
      type: 'date',
      access: systemOnly,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: systemOnly,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'editorialNotes',
      type: 'array',
      access: { ...systemOnly, read: ({ req }) => isStaff(req.user) },
      admin: { readOnly: true, initCollapsed: true, description: 'Review feedback history (added via workflow notes).' },
      fields: [
        { name: 'note', type: 'textarea' },
        { name: 'author', type: 'relationship', relationTo: 'users' },
        { name: 'createdAt', type: 'date' },
        { name: 'fromStatus', type: 'text' },
        { name: 'toStatus', type: 'text' },
      ],
    },

    // ---- flags & monetisation ----
    {
      name: 'accessLevel',
      type: 'select',
      defaultValue: 'free',
      required: true,
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Subscribers only', value: 'subscribers' },
      ],
      access: publisherAccess,
      admin: { position: 'sidebar' },
    },
    { name: 'isBreaking', type: 'checkbox', defaultValue: false, access: publisherAccess, admin: { position: 'sidebar' } },
    { name: 'isSponsored', type: 'checkbox', defaultValue: false, access: publisherAccess, admin: { position: 'sidebar' } },
    {
      name: 'sponsorName',
      type: 'text',
      access: publisherAccess,
      admin: { position: 'sidebar', condition: (data) => Boolean(data?.isSponsored) },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData?.isSponsored && !value ? 'Sponsored content must name the sponsor' : true,
    },

    // ---- corrections ----
    {
      name: 'corrections',
      type: 'array',
      access: contentAccess,
      admin: { description: 'Visible correction notes, shown at the foot of the story. Never delete a published correction.' },
      fields: [
        { name: 'issuedAt', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'note', type: 'textarea', required: true },
      ],
    },

    // ---- SEO ----
    {
      name: 'seo',
      type: 'group',
      access: seoAccess,
      fields: [
        { name: 'title', type: 'text', maxLength: 70, access: seoAccess },
        { name: 'description', type: 'textarea', maxLength: 170, access: seoAccess },
        { name: 'canonicalUrl', type: 'text', access: seoAccess },
        { name: 'noIndex', type: 'checkbox', defaultValue: false, access: seoAccess },
      ],
    },

    // ---- derived (written by hooks only) ----
    {
      name: 'preview',
      type: 'json',
      access: systemOnly,
      admin: { hidden: true },
    },
    {
      name: 'searchText',
      type: 'textarea',
      hidden: true,
      access: { ...systemOnly, read: ({ req }) => isStaff(req.user) },
    },
    { name: 'wordCount', type: 'number', access: systemOnly, admin: { position: 'sidebar', readOnly: true } },
  ],
}
