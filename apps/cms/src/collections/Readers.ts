import type { CollectionConfig, FieldAccess } from 'payload'

import { hasRole, isReader, isStaff } from '../access/roles'

const selfOrStaff: FieldAccess = ({ req, doc }) =>
  isStaff(req.user) || (isReader(req.user) && String(doc?.id ?? '') === String(req.user.id))
const systemOnly = { create: () => false, update: () => false }

/**
 * Website readers / subscribers. Separate auth collection from newsroom staff so a
 * reader token can never reach the admin panel. Logins happen through the website.
 */
export const Readers: CollectionConfig = {
  slug: 'readers',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'entitlement.status', 'createdAt'], group: 'Subscriptions' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => 'Reset your password',
      generateEmailHTML: (args) => {
        const token = (args as { token?: string } | undefined)?.token ?? ''
        const url = new URL('/reset-password', process.env.WEB_URL || 'http://localhost:3000')
        url.searchParams.set('token', token)
        return `<p>Someone asked to reset the password for your account.</p><p><a href="${url.toString()}">Choose a new password</a> (link valid for 1 hour).</p><p>If this wasn't you, ignore this email.</p>`
      },
    },
  },
  access: {
    admin: () => false,
    create: () => true, // public sign-up; field access below prevents self-granting entitlements
    read: ({ req }) => {
      if (hasRole(req.user, 'super_admin', 'editor_in_chief', 'analyst')) return true
      return isReader(req.user) ? { id: { equals: req.user.id } } : false
    },
    update: ({ req }) => {
      if (hasRole(req.user, 'super_admin')) return true
      return isReader(req.user) ? { id: { equals: req.user.id } } : false
    },
    delete: ({ req }) => {
      if (hasRole(req.user, 'super_admin')) return true
      return isReader(req.user) ? { id: { equals: req.user.id } } : false
    },
  },
  fields: [
    { name: 'name', type: 'text', maxLength: 120 },
    { name: 'newsletterOptIn', type: 'checkbox', defaultValue: false },
    {
      name: 'entitlement',
      type: 'group',
      access: { ...systemOnly, read: selfOrStaff },
      admin: { readOnly: true, description: 'Derived from subscriptions by the billing webhooks. Do not edit.' },
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'none',
          options: ['none', 'incomplete', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'],
        },
        { name: 'planCode', type: 'text' },
        { name: 'activeUntil', type: 'date' },
        { name: 'adFree', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
