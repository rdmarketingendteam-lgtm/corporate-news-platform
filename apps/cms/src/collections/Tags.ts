import type { CollectionConfig } from 'payload'

import { taxonomyAccess } from '../access/roles'
import { cacheTags, revalidateWeb } from '../lib/revalidate'
import { slugField } from './fields'

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Topic', plural: 'Topics' },
  admin: { useAsTitle: 'name' },
  access: taxonomyAccess,
  hooks: {
    afterChange: [async ({ doc, req }) => revalidateWeb(req.payload, { tags: [cacheTags.taxonomy, cacheTags.tag(doc.slug)] })],
  },
  fields: [{ name: 'name', type: 'text', required: true }, slugField(), { name: 'description', type: 'textarea' }],
}
