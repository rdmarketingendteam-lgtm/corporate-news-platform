import type { CollectionConfig } from 'payload'

import { nobody, rolesAccess } from '../access/roles'

/** Webhook idempotency ledger: one row per provider event id. */
export const PaymentEvents: CollectionConfig = {
  slug: 'payment-events',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'eventType', 'processedAt', 'error', 'createdAt'], group: 'System' },
  defaultSort: '-createdAt',
  access: { read: rolesAccess('super_admin'), create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'provider', type: 'select', required: true, options: ['stripe', 'razorpay'] },
    { name: 'eventType', type: 'text' },
    { name: 'subscriptionId', type: 'text' },
    { name: 'processedAt', type: 'date' },
    { name: 'error', type: 'textarea' },
  ],
}
