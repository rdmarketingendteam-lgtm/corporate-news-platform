/**
 * Seed demo content for local development and staging.
 *   pnpm --filter cms seed
 * Refuses to run against production unless ALLOW_SEED=true.
 */
import { getPayload, type Where } from 'payload'

import config from '../payload.config'
import { lexicalFromParagraphs } from '../lib/lexical'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed a production database. Set ALLOW_SEED=true to override.')
  process.exit(1)
}

const payload = await getPayload({ config })
const password = process.env.SEED_PASSWORD || 'ChangeMe!2026-local'

async function upsert<T extends Record<string, unknown>>(collection: any, where: Where, data: T) {
  const found = await payload.find({ collection, where, limit: 1, depth: 0 })
  if (found.docs[0]) return found.docs[0] as any
  return (await payload.create({ collection, data: data as any })) as any
}

const sections = [
  ['India', 'india'],
  ['World', 'world'],
  ['Business', 'business'],
  ['Technology', 'technology'],
  ['Politics', 'politics'],
  ['Sports', 'sports'],
  ['Entertainment', 'entertainment'],
  ['Opinion', 'opinion'],
] as const
const cats: Record<string, any> = {}
for (const [i, [name, slug]] of sections.entries()) {
  cats[slug] = await upsert('categories', { slug: { equals: slug } }, { name, slug, order: i, showInNav: true })
}

const users: [string, string, string[]][] = [
  ['admin@example.com', 'super_admin', []],
  ['eic@example.com', 'editor_in_chief', []],
  ['india.editor@example.com', 'section_editor', ['india']],
  ['reporter@example.com', 'journalist', []],
  ['copy@example.com', 'copy_editor', []],
  ['seo@example.com', 'seo_manager', []],
  ['ads@example.com', 'ad_manager', []],
  ['analyst@example.com', 'analyst', []],
]
for (const [email, role, sectionSlugs] of users) {
  await upsert('users', { email: { equals: email } }, {
    email,
    password,
    role,
    displayName: email.split('@')[0],
    sections: sectionSlugs.map((s) => cats[s].id),
  })
}

const author = await upsert('authors', { slug: { equals: 'asha-rao' } }, { displayName: 'Asha Rao', slug: 'asha-rao', jobTitle: 'Senior Correspondent', bio: 'Covers policy and the economy.' })
const tag = await upsert('tags', { slug: { equals: 'monsoon' } }, { name: 'Monsoon', slug: 'monsoon' })

await upsert('plans', { code: { equals: 'digital-monthly' } }, {
  name: 'Digital Monthly',
  code: 'digital-monthly',
  priceMinor: 19900,
  currency: 'INR',
  interval: 'month',
  order: 1,
  features: [{ text: 'Unlimited articles' }, { text: 'Subscriber-only analysis' }],
  stripePriceId: process.env.SEED_STRIPE_PRICE_MONTHLY || null,
  razorpayPlanId: process.env.SEED_RAZORPAY_PLAN_MONTHLY || null,
})
await upsert('plans', { code: { equals: 'digital-yearly' } }, {
  name: 'Digital Yearly',
  code: 'digital-yearly',
  priceMinor: 199900,
  currency: 'INR',
  interval: 'year',
  adFree: true,
  order: 2,
  features: [{ text: 'Everything in Monthly' }, { text: 'Two months free' }],
  stripePriceId: process.env.SEED_STRIPE_PRICE_YEARLY || null,
  razorpayPlanId: process.env.SEED_RAZORPAY_PLAN_YEARLY || null,
})

const stories = [
  { slug: 'monsoon-arrives-early-in-kerala', headline: 'Monsoon arrives early in Kerala', category: 'india', isBreaking: true, dek: 'IMD confirms onset a week ahead of schedule.' },
  { slug: 'rbi-holds-repo-rate', headline: 'RBI holds repo rate, signals caution', category: 'business', accessLevel: 'subscribers', dek: 'Our analysis of what the pause means for borrowers.' },
  { slug: 'global-markets-weekly', headline: 'Global markets: the week ahead', category: 'world', dek: 'Earnings, central banks and oil in focus.' },
  { slug: 'startup-funding-rebounds', headline: 'Startup funding rebounds in Q3', category: 'technology', dek: 'Late-stage rounds return.' },
]
for (const s of stories) {
  await upsert('articles', { slug: { equals: s.slug } }, {
    ...s,
    category: cats[s.category].id,
    author: author.id,
    tags: s.slug.includes('monsoon') ? [tag.id] : [],
    body: lexicalFromParagraphs([
      `${s.headline}. This is demo copy for local development.`,
      'Second paragraph with more reporting and context.',
      'Third paragraph — non-subscribers see up to here on subscriber-only stories.',
      'Fourth paragraph: subscriber-only analysis goes here.',
      'Fifth paragraph with the conclusion.',
    ]),
    status: 'approved',
    _status: 'published',
  })
}

console.log(`Seeded. Staff logins use password: ${password}`)
process.exit(0)
