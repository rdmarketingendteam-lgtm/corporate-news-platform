import type { CollectionConfig } from 'payload'

import { anyone, rolesAccess } from '../access/roles'

/** Permanent redirects. Created automatically when a live article's slug changes; editable by SEO staff. */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: { useAsTitle: 'from', defaultColumns: ['from', 'to', 'updatedAt'], group: 'System' },
  access: {
    read: anyone,
    create: rolesAccess('super_admin', 'editor_in_chief', 'seo_manager'),
    update: rolesAccess('super_admin', 'editor_in_chief', 'seo_manager'),
    delete: rolesAccess('super_admin', 'editor_in_chief', 'seo_manager'),
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) => (typeof v === 'string' && v.startsWith('/') ? true : 'Must be a site path starting with /'),
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      validate: (v: unknown) => (typeof v === 'string' && v.startsWith('/') ? true : 'Must be a site path starting with /'),
    },
  ],
}
