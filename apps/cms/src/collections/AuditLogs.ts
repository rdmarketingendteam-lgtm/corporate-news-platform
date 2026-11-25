import type { CollectionConfig } from 'payload'

import { nobody, rolesAccess } from '../access/roles'

/** Append-only. Written by server hooks via the Local API; no one can create, edit or delete through the API/admin. */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log entry', plural: 'Audit log' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'entityType', 'entityId', 'actor', 'reason'],
    group: 'System',
  },
  defaultSort: '-createdAt',
  access: {
    read: rolesAccess('super_admin', 'editor_in_chief'),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'entityType', type: 'text', required: true, index: true },
    { name: 'entityId', type: 'text', required: true, index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorLabel', type: 'text' },
    { name: 'reason', type: 'textarea' },
    { name: 'metadata', type: 'json' },
  ],
}
