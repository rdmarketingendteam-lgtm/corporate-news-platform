import type { TextField } from 'payload'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)

export const slugField = (from = 'name'): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar' },
  hooks: {
    beforeValidate: [
      ({ value, siblingData }) => {
        if (typeof value === 'string' && value) return slugify(value)
        const source = siblingData?.[from] ?? siblingData?.displayName
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
  validate: (value: unknown) => (typeof value === 'string' && SLUG_PATTERN.test(value) ? true : 'Invalid slug'),
})
