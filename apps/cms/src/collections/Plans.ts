import type { CollectionConfig } from 'payload'

import { isStaff, rolesAccess } from '../access/roles'
import { cacheTags, revalidateWeb } from '../lib/revalidate'

export const Plans: CollectionConfig = {
  slug: 'plans',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'code', 'priceMinor', 'currency', 'interval', 'active'], group: 'Subscriptions' },
  defaultSort: 'order',
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: rolesAccess('super_admin'),
    update: rolesAccess('super_admin'),
    delete: rolesAccess('super_admin'),
  },
  hooks: { afterChange: [async ({ req }) => revalidateWeb(req.payload, { tags: [cacheTags.plans] })] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text', required: true, unique: true, index: true, admin: { description: 'Stable identifier, e.g. digital-monthly' } },
    { name: 'description', type: 'textarea' },
    { name: 'features', type: 'array', fields: [{ name: 'text', type: 'text', required: true }] },
    {
      name: 'priceMinor',
      label: 'Price (minor units, e.g. paise)',
      type: 'number',
      required: true,
      min: 0,
      admin: { description: 'Display only — the charged amount is defined in Stripe/Razorpay. Keep them in sync.' },
    },
    { name: 'currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'GBP', 'EUR'] },
    { name: 'interval', type: 'select', required: true, defaultValue: 'month', options: ['month', 'year'] },
    { name: 'adFree', type: 'checkbox', defaultValue: false, admin: { description: 'Subscribers on this plan see no display ads.' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      type: 'collapsible',
      label: 'Provider IDs',
      fields: [
        { name: 'stripePriceId', type: 'text', index: true, admin: { description: 'price_… (recurring)' } },
        { name: 'razorpayPlanId', type: 'text', index: true, admin: { description: 'plan_…' } },
        { name: 'razorpayTotalCount', type: 'number', admin: { description: 'Billing cycles before the Razorpay subscription ends (default 120 monthly / 10 yearly).' } },
      ],
    },
  ],
}
