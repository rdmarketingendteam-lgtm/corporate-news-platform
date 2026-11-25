import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { publishDueArticles } from '../../src/endpoints/cron'
import { searchEndpoint } from '../../src/endpoints/search'
import { as, body, bootPayload, endpointReq, expectReject } from './helpers'

let payload: Payload
const u: Record<string, any> = {}
let india: any, world: any, author: any

const mkUser = (email: string, role: string, sections: unknown[] = []) =>
  payload.create({
    collection: 'users',
    data: { email, password: 'Passw0rd!Passw0rd', displayName: email.split('@')[0], role, sections } as any,
  })

const reload = (user: any) => payload.findByID({ collection: 'users', id: user.id, depth: 0 }).then((d) => ({ ...d, collection: 'users' }))

const publicFind = (where: any = {}, draft = false) =>
  payload.find({ collection: 'articles', where, overrideAccess: false, draft })

beforeAll(async () => {
  payload = await bootPayload()
  india = await payload.create({ collection: 'categories', data: { name: 'India', slug: 'india' } })
  world = await payload.create({ collection: 'categories', data: { name: 'World', slug: 'world' } })
  author = await payload.create({ collection: 'authors', data: { displayName: 'Asha Rao', slug: 'asha-rao' } })

  // first user is forced to super_admin regardless of input
  u.admin = await mkUser('admin@news.test', 'analyst')
  u.eic = await mkUser('eic@news.test', 'editor_in_chief')
  u.indiaEditor = await mkUser('india-ed@news.test', 'section_editor', [india.id])
  u.worldEditor = await mkUser('world-ed@news.test', 'section_editor', [world.id])
  u.journoA = await mkUser('a@news.test', 'journalist')
  u.journoB = await mkUser('b@news.test', 'journalist')
  u.copy = await mkUser('copy@news.test', 'copy_editor')
  u.seo = await mkUser('seo@news.test', 'seo_manager')
  u.analyst = await mkUser('analyst@news.test', 'analyst')
  for (const k of Object.keys(u)) u[k] = await reload(u[k])
})

afterAll(async () => {
  await payload?.destroy()
})

describe('users & roles', () => {
  it('bootstraps the first account as super_admin', () => {
    expect(u.admin.role).toBe('super_admin')
    expect(u.indiaEditor.role).toBe('section_editor')
  })

  it('non-admins cannot create staff or change their own role', async () => {
    await expectReject(
      payload.create({ collection: 'users', data: { email: 'x@news.test', password: 'Passw0rd!Passw0rd', displayName: 'x' } as any, ...as(u.eic) }),
    )
    const updated = await payload.update({ collection: 'users', id: u.journoA.id, data: { role: 'super_admin' } as any, ...as(u.journoA) })
    expect(updated.role).toBe('journalist')
  })

  it('records permission changes in the audit log', async () => {
    await payload.update({ collection: 'users', id: u.analyst.id, data: { role: 'analyst', sections: [world.id] } as any, ...as(u.admin) })
    const logs = await payload.find({ collection: 'audit-logs', where: { action: { equals: 'user.permissions_change' } } })
    expect(logs.totalDocs).toBeGreaterThan(0)
  })
})

describe('editorial workflow', () => {
  let story: any

  it('journalist creates a draft; createdBy is set server-side', async () => {
    story = await payload.create({
      collection: 'articles',
      draft: true,
      data: {
        headline: 'Monsoon arrives early in Kerala',
        slug: 'monsoon-kerala',
        body: body('Rain arrived.', 'Farmers react.'),
        author: author.id,
        category: india.id,
        createdBy: u.journoB.id, // spoof attempt — must be ignored
      } as any,
      ...as(u.journoA),
    })
    expect(story.status).toBe('draft')
    expect(String((story.createdBy as any)?.id ?? story.createdBy)).toBe(String(u.journoA.id))
    const raw = await payload.findByID({ collection: 'articles', id: story.id, draft: true, showHiddenFields: true })
    expect((raw as any).searchText).toContain('Farmers react.')
    expect(story.wordCount).toBe(4)
  })

  it('journalists cannot create approved or published stories', async () => {
    await expectReject(
      payload.create({
        collection: 'articles',
        draft: true,
        data: { headline: 'x', slug: 'x-approved', body: body('x'), author: author.id, category: india.id, status: 'approved' } as any,
        ...as(u.journoA),
      }),
      /cannot move/,
    )
  })

  it('drafts are invisible to the public, including via ?draft=true', async () => {
    expect((await publicFind({ slug: { equals: 'monsoon-kerala' } })).totalDocs).toBe(0)
    expect((await publicFind({ slug: { equals: 'monsoon-kerala' } }, true)).totalDocs).toBe(0)
  })

  it("another journalist cannot edit someone else's draft", async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, draft: true, data: { headline: 'Hijacked' }, ...as(u.journoB) }),
    )
  })

  it('journalist submits, then can no longer edit', async () => {
    story = await payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'submitted' }, ...as(u.journoA) })
    expect(story.status).toBe('submitted')
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, draft: true, data: { headline: 'Late edit' }, ...as(u.journoA) }),
      /cannot edit/,
    )
  })

  it('copy editor moves to review but cannot approve', async () => {
    story = await payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'in_review' }, ...as(u.copy) })
    expect(story.status).toBe('in_review')
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'approved' }, ...as(u.copy) }),
      /cannot move/,
    )
  })

  it('sending back for changes requires a note, which is kept as feedback', async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'draft' }, ...as(u.copy) }),
      /workflowNote|Explain/,
    )
    story = await payload.update({
      collection: 'articles',
      id: story.id,
      draft: true,
      data: { status: 'draft', workflowNote: 'Add a quote from IMD.' } as any,
      ...as(u.copy),
    })
    expect(story.status).toBe('draft')
    expect(story.editorialNotes?.at(-1)?.note).toBe('Add a quote from IMD.')
    // journalist can edit again now that it is back in draft
    story = await payload.update({
      collection: 'articles',
      id: story.id,
      draft: true,
      data: { body: body('Rain arrived.', 'Farmers react.', '"Early onset," said IMD.'), status: 'submitted' },
      ...as(u.journoA),
    })
    expect(story.status).toBe('submitted')
  })

  it('a section editor cannot approve outside their section', async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'approved' }, ...as(u.worldEditor) }),
    )
  })

  it('journalists cannot publish', async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, data: { _status: 'published' } as any, ...as(u.journoA) }),
    )
  })

  it('publishing requires approval first', async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, data: { _status: 'published' } as any, ...as(u.indiaEditor) }),
      /Approved/,
    )
  })

  it('section editor approves and publishes; the story goes live with an audit trail', async () => {
    story = await payload.update({ collection: 'articles', id: story.id, draft: true, data: { status: 'approved' }, ...as(u.indiaEditor) })
    story = await payload.update({ collection: 'articles', id: story.id, data: { _status: 'published' } as any, ...as(u.indiaEditor) })
    expect(story.status).toBe('published')
    expect(story._status).toBe('published')
    expect(story.publishedAt).toBeTruthy()

    const live = await publicFind({ slug: { equals: 'monsoon-kerala' } })
    expect(live.totalDocs).toBe(1)
    expect(live.docs[0]!.body).toBeTruthy() // free story → full body public
    expect((live.docs[0] as any).searchText).toBeUndefined()
    expect((live.docs[0] as any).editorialNotes ?? []).toHaveLength(0) // review feedback is staff-only

    const audit = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ entityId: { equals: String(story.id) } }, { action: { equals: 'article.publish' } }] },
    })
    expect(audit.totalDocs).toBe(1)
  })

  it('edits to a live story stay private until re-published', async () => {
    const firstPublishedAt = story.publishedAt
    await payload.update({
      collection: 'articles',
      id: story.id,
      draft: true,
      data: { headline: 'Monsoon arrives a week early in Kerala' },
      ...as(u.eic),
    })
    expect((await publicFind({ slug: { equals: 'monsoon-kerala' } })).docs[0]!.headline).toBe('Monsoon arrives early in Kerala')

    story = await payload.update({ collection: 'articles', id: story.id, data: { _status: 'published' } as any, ...as(u.eic) })
    const live = (await publicFind({ slug: { equals: 'monsoon-kerala' } })).docs[0] as any
    expect(live.headline).toBe('Monsoon arrives a week early in Kerala')
    expect(live.publishedAt).toBe(firstPublishedAt) // original publication time preserved
    expect(live.lastUpdatedAt).toBeTruthy()
  })

  it('changing the slug of a live story creates a 301 redirect', async () => {
    story = await payload.update({
      collection: 'articles',
      id: story.id,
      data: { slug: 'monsoon-kerala-early', _status: 'published' } as any,
      ...as(u.eic),
    })
    const redirects = await payload.find({ collection: 'redirects', where: { from: { equals: '/news/monsoon-kerala' } } })
    expect(redirects.docs[0]?.to).toBe('/news/monsoon-kerala-early')
  })

  it('SEO managers can change SEO fields but not the story', async () => {
    const updated = await payload.update({
      collection: 'articles',
      id: story.id,
      draft: true,
      data: { headline: 'SEO rewrote this', seo: { title: 'Kerala monsoon 2026' }, status: 'archived' } as any,
      ...as(u.seo),
    })
    expect(updated.headline).toBe('Monsoon arrives a week early in Kerala')
    expect(updated.seo?.title).toBe('Kerala monsoon 2026')
    expect(updated.status).toBe('published')
  })

  it('unpublishing requires a reason and removes the story from public view', async () => {
    await expectReject(
      payload.update({ collection: 'articles', id: story.id, data: { status: 'archived', _status: 'published' } as any, ...as(u.indiaEditor) }),
      /reason/,
    )
    await payload.update({
      collection: 'articles',
      id: story.id,
      data: { status: 'archived', _status: 'published', workflowNote: 'Legal hold' } as any,
      ...as(u.indiaEditor),
    })
    expect((await publicFind({ id: { equals: story.id } })).totalDocs).toBe(0)
    const audit = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ entityId: { equals: String(story.id) } }, { action: { equals: 'article.unpublish' } }] },
    })
    expect(audit.docs[0]?.reason).toBe('Legal hold')
  })

  it('published stories cannot be deleted by their journalist', async () => {
    await expectReject(payload.delete({ collection: 'articles', id: story.id, ...as(u.journoA) }), /cannot be deleted/)
  })

  it('journalists can delete their own unpublished drafts only', async () => {
    const draft = await payload.create({
      collection: 'articles',
      draft: true,
      data: { headline: 'Scrap me', slug: 'scrap-me', body: body('x'), author: author.id, category: india.id } as any,
      ...as(u.journoA),
    })
    await expectReject(payload.delete({ collection: 'articles', id: draft.id, ...as(u.journoB) }))
    await payload.delete({ collection: 'articles', id: draft.id, ...as(u.journoA) })
  })
})

describe('scheduled publishing', () => {
  it('rejects scheduling without a future time, then publishes when due', async () => {
    let a = await payload.create({
      collection: 'articles',
      draft: true,
      data: { headline: 'Budget day', slug: 'budget-day', body: body('Numbers.'), author: author.id, category: india.id, status: 'approved' } as any,
      ...as(u.eic),
    })
    await expectReject(
      payload.update({ collection: 'articles', id: a.id, draft: true, data: { status: 'scheduled', publishedAt: '2020-01-01T00:00:00Z' }, ...as(u.eic) }),
      /future/,
    )
    const releaseAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    a = await payload.update({ collection: 'articles', id: a.id, draft: true, data: { status: 'scheduled', publishedAt: releaseAt }, ...as(u.eic) })
    expect(a.status).toBe('scheduled')

    const req = await endpointReq(payload, { url: 'http://cms.test/api/cron/publish-scheduled' })
    expect((await publishDueArticles(req, new Date())).published).toHaveLength(0) // not due yet
    expect(((await publicFind({ slug: { equals: 'budget-day' } })).totalDocs)).toBe(0)

    const result = await publishDueArticles(req, new Date(Date.now() + 2 * 60 * 60 * 1000))
    expect(result.published).toEqual([String(a.id)])
    const live = (await publicFind({ slug: { equals: 'budget-day' } })).docs[0] as any
    expect(live.status).toBe('published')
    expect(live.publishedAt).toBe(releaseAt)
  })
})

describe('paywall', () => {
  let premium: any
  beforeAll(async () => {
    premium = await payload.create({
      collection: 'articles',
      data: {
        headline: 'Inside the RBI decision',
        slug: 'inside-rbi',
        body: body('P1 public.', 'P2 public.', 'P3 public.', 'P4 SECRET analysis.', 'P5 SECRET.'),
        author: author.id,
        category: india.id,
        accessLevel: 'subscribers',
        status: 'approved',
        _status: 'published',
      } as any,
      ...as(u.eic),
    })
  })

  it('non-subscribers get a preview, never the full body', async () => {
    const doc = (await publicFind({ slug: { equals: 'inside-rbi' } })).docs[0] as any
    expect(doc.status).toBe('published')
    expect(doc.body).toBeUndefined()
    expect(JSON.stringify(doc.preview)).toContain('P3 public.')
    expect(JSON.stringify(doc)).not.toContain('SECRET')
  })

  it('the body cannot be probed with where-queries', async () => {
    await expectReject(publicFind({ body: { like: 'SECRET' } }))
  })

  it('regression: ?select=body cannot bypass the paywall (access check must fail closed)', async () => {
    const res = await payload.find({
      collection: 'articles',
      where: { slug: { equals: 'inside-rbi' } },
      select: { body: true },
      overrideAccess: false,
    })
    expect(JSON.stringify(res.docs[0])).not.toContain('SECRET')
    const viaPreview = await payload.find({ collection: 'articles', where: { slug: { equals: 'inside-rbi' } }, select: { body: true, preview: true }, overrideAccess: false })
    expect(JSON.stringify(viaPreview.docs[0])).not.toContain('SECRET')
  })

  it('a signed-in reader without a subscription cannot read the body, with or without select', async () => {
    const r = await payload.create({ collection: 'readers', data: { email: 'free@reader.test', password: 'Passw0rd!Passw0rd' } as any })
    const reader = { ...r, collection: 'readers' }
    for (const select of [undefined, { body: true } as const]) {
      const res = await payload.find({ collection: 'articles', where: { slug: { equals: 'inside-rbi' } }, select, ...as(reader) })
      expect(JSON.stringify(res.docs[0])).not.toContain('SECRET')
    }
  })

  it('entitled readers get the full body; lapsed readers do not', async () => {
    const reader = await payload.create({ collection: 'readers', data: { email: 'sub@reader.test', password: 'Passw0rd!Passw0rd' } as any })
    await payload.update({
      collection: 'readers',
      id: reader.id,
      data: { entitlement: { status: 'active', activeUntil: new Date(Date.now() + 864e5).toISOString() } } as any,
    })
    const entitled = { ...(await payload.findByID({ collection: 'readers', id: reader.id })), collection: 'readers' }
    const full = (await payload.find({ collection: 'articles', where: { slug: { equals: 'inside-rbi' } }, ...as(entitled) })).docs[0] as any
    expect(JSON.stringify(full.body)).toContain('SECRET analysis')

    const lapsed = { ...entitled, entitlement: { status: 'active', activeUntil: '2020-01-01T00:00:00Z' } }
    const cut = (await payload.find({ collection: 'articles', where: { slug: { equals: 'inside-rbi' } }, ...as(lapsed) })).docs[0] as any
    expect(cut.body).toBeUndefined()
  })

  it('readers cannot grant themselves an entitlement', async () => {
    const r = await payload.create({
      collection: 'readers',
      data: { email: 'cheat@reader.test', password: 'Passw0rd!Passw0rd', entitlement: { status: 'active', activeUntil: '2099-01-01' } } as any,
      overrideAccess: false,
    })
    expect(r.entitlement?.status ?? 'none').toBe('none')
    const self = { ...r, collection: 'readers' }
    const after = await payload.update({
      collection: 'readers',
      id: r.id,
      data: { entitlement: { status: 'active', activeUntil: '2099-01-01' } } as any,
      ...as(self),
    })
    expect(after.entitlement?.activeUntil ?? null).toBeNull()
  })
})

describe('search', () => {
  it('finds published stories by full text, ranked, and never returns drafts', async () => {
    await payload.create({
      collection: 'articles',
      draft: true,
      data: { headline: 'Secret draft about inflation', slug: 'draft-inflation', body: body('inflation inflation'), author: author.id, category: india.id } as any,
      ...as(u.journoA),
    })
    await payload.create({
      collection: 'articles',
      data: {
        headline: 'Inflation eases to 4%',
        slug: 'inflation-eases',
        dek: 'Food prices cool',
        body: body('Retail inflation eased in October.'),
        author: author.id,
        category: india.id,
        status: 'approved',
        _status: 'published',
      } as any,
      ...as(u.eic),
    })
    const req = await endpointReq(payload, { url: 'http://cms.test/api/search?q=inflation' })
    const res = await searchEndpoint.handler(req)
    const json = await res.json()
    expect(json.docs.map((d: any) => d.slug)).toEqual(['inflation-eases'])
    expect(json.docs[0].searchText).toBeUndefined()

    const stem = await (await searchEndpoint.handler(await endpointReq(payload, { url: 'http://cms.test/api/search?q=eased%20prices' }))).json()
    expect(stem.totalDocs).toBe(1)
  })
})
