import type { CollectionConfig } from 'payload'

import { taxonomyAccess } from '../access/roles'
import { cacheTags, revalidateWeb } from '../lib/revalidate'
import { slugField } from './fields'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'order', 'showInNav'] },
  access: taxonomyAccess,
  defaultSort: 'order',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const tags = [cacheTags.taxonomy, cacheTags.category(doc.slug)]
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) tags.push(cacheTags.category(previousDoc.slug))
        await revalidateWeb(req.payload, { tags })
      },
    ],
    afterDelete: [async ({ doc, req }) => revalidateWeb(req.payload, { tags: [cacheTags.taxonomy, cacheTags.category(doc.slug)] })],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField(),
    { name: 'description', type: 'textarea' },
    { name: 'order', type: 'number', defaultValue: 0 },
    { name: 'showInNav', type: 'checkbox', defaultValue: true },
  ],
}
