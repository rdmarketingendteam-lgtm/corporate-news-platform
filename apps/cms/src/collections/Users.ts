import type { CollectionConfig, FieldAccess } from 'payload'

import { ROLES, hasRole, isStaff, superAdminOnly } from '../access/roles'
import { writeAudit } from '../lib/audit'

const superAdminOnlyField: FieldAccess = ({ req }) => hasRole(req.user, 'super_admin')
const superAdminField = { create: superAdminOnlyField, update: superAdminOnlyField }

/** Newsroom staff accounts (CMS login). Readers/subscribers live in the separate `readers` collection. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff user', plural: 'Staff users' },
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8h working session
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'displayName', defaultColumns: ['displayName', 'email', 'role', 'sections'] },
  access: {
    admin: ({ req }) => isStaff(req.user),
    read: ({ req }) => isStaff(req.user),
    create: superAdminOnly,
    update: ({ req }) => {
      if (hasRole(req.user, 'super_admin')) return true
      return isStaff(req.user) ? { id: { equals: req.user!.id } } : false
    },
    delete: superAdminOnly,
    unlock: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      // Bootstrap: the very first account becomes super_admin; nobody else can self-assign roles.
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
          if (totalDocs === 0) data.role = 'super_admin'
          if (!data.role) data.role = 'analyst'
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const sectionsChanged = JSON.stringify(previousDoc?.sections ?? []) !== JSON.stringify(doc.sections ?? [])
        if (operation === 'create' || previousDoc?.role !== doc.role || sectionsChanged) {
          await writeAudit(req, {
            action: operation === 'create' ? 'user.create' : 'user.permissions_change',
            entityType: 'users',
            entityId: String(doc.id),
            actor: isStaff(req.user) ? req.user.id : undefined,
            metadata: { email: doc.email, fromRole: previousDoc?.role, toRole: doc.role },
          })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'displayName', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'analyst',
      access: superAdminField,
      options: ROLES.map((value) => ({ label: value.replaceAll('_', ' '), value })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'sections',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      access: superAdminField,
      admin: { position: 'sidebar', description: 'Section editors can approve and publish only in these sections.' },
    },
  ],
}
