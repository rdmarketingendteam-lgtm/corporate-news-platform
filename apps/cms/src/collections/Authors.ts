import type { CollectionConfig } from 'payload'

import { isStaff, taxonomyAccess } from '../access/roles'
import { cacheTags, revalidateWeb } from '../lib/revalidate'
import { slugField } from './fields'

/** Public bylines. Kept separate from staff accounts so no login data is ever exposed publicly. */
export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: { useAsTitle: 'displayName' },
  access: taxonomyAccess,
  hooks: {
    afterChange: [async ({ doc, req }) => revalidateWeb(req.payload, { tags: [cacheTags.author(doc.slug), cacheTags.articles] })],
  },
  fields: [
    { name: 'displayName', type: 'text', required: true },
    slugField(),
    { name: 'jobTitle', type: 'text' },
    { name: 'bio', type: 'textarea' },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    { name: 'xHandle', label: 'X / Twitter handle', type: 'text' },
    { name: 'staffUser', type: 'relationship', relationTo: 'users', access: { read: ({ req }) => isStaff(req.user) } },
  ],
}
