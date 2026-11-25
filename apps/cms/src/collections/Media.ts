import type { CollectionConfig } from 'payload'

import { anyone, rolesAccess } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: anyone,
    create: rolesAccess('super_admin', 'editor_in_chief', 'section_editor', 'journalist', 'copy_editor', 'seo_manager', 'ad_manager'),
    update: rolesAccess('super_admin', 'editor_in_chief', 'section_editor', 'journalist', 'copy_editor', 'seo_manager'),
    delete: rolesAccess('super_admin', 'editor_in_chief'),
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, fit: 'cover', formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'card', width: 900, height: 600, fit: 'cover', formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1600, height: 1000, fit: 'inside', formatOptions: { format: 'webp', options: { quality: 82 } } },
      { name: 'og', width: 1200, height: 630, fit: 'cover', formatOptions: { format: 'jpeg', options: { quality: 82 } } },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
  },
  fields: [
    { name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for screen readers.' } },
    { name: 'caption', type: 'text' },
    { name: 'credit', type: 'text' },
  ],
}
