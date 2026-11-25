import type { CollectionConfig } from 'payload'

import { hasRole, isReader, nobody } from '../access/roles'
import { SUBSCRIPTION_STATUSES } from '../billing/types'

/** Local mirror of provider subscriptions. Written only by billing endpoints/webhooks. Never stores card data. */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'providerSubscriptionId',
    defaultColumns: ['reader', 'plan', 'provider', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd'],
    group: 'Subscriptions',
  },
  access: {
    read: ({ req }) => {
      if (hasRole(req.user, 'super_admin', 'editor_in_chief', 'analyst')) return true
      return isReader(req.user) ? { reader: { equals: req.user.id } } : false
    },
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  fields: [
    { name: 'reader', type: 'relationship', relationTo: 'readers', required: true, index: true },
    { name: 'plan', type: 'relationship', relationTo: 'plans' },
    { name: 'provider', type: 'select', required: true, options: ['stripe', 'razorpay'] },
    { name: 'providerSubscriptionId', type: 'text', required: true, unique: true, index: true },
    { name: 'providerCustomerId', type: 'text' },
    { name: 'status', type: 'select', required: true, options: [...SUBSCRIPTION_STATUSES] },
    { name: 'currentPeriodEnd', type: 'date' },
    { name: 'cancelAtPeriodEnd', type: 'checkbox', defaultValue: false },
    { name: 'lastSyncedAt', type: 'date' },
  ],
}
