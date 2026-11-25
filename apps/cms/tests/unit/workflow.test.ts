import { describe, expect, it } from 'vitest'

import { canPublishInCategory, isEntitledReader } from '../../src/access/roles'
import { canEditInStatus, canTransition, requiresNote } from '../../src/workflow/transitions'

const journalist = { role: 'journalist' as const, canPublishHere: false, isOwner: true }
const otherJournalist = { ...journalist, isOwner: false }
const copy = { role: 'copy_editor' as const, canPublishHere: false, isOwner: false }
const seo = { role: 'seo_manager' as const, canPublishHere: false, isOwner: false }
const editor = { role: 'editor_in_chief' as const, canPublishHere: true, isOwner: false }

describe('status transitions', () => {
  it('journalists can only submit their own drafts', () => {
    expect(canTransition('draft', 'submitted', journalist)).toBe(true)
    expect(canTransition('draft', 'submitted', otherJournalist)).toBe(false)
    expect(canTransition('draft', 'approved', journalist)).toBe(false)
    expect(canTransition('submitted', 'draft', journalist)).toBe(false)
    expect(canTransition('draft', 'published', journalist)).toBe(false)
  })

  it('copy editors move stories into review or send them back, but cannot approve', () => {
    expect(canTransition('submitted', 'in_review', copy)).toBe(true)
    expect(canTransition('in_review', 'draft', copy)).toBe(true)
    expect(canTransition('in_review', 'approved', copy)).toBe(false)
    expect(canTransition('approved', 'published', copy)).toBe(false)
  })

  it('SEO managers cannot change status at all', () => {
    for (const to of ['submitted', 'approved', 'published', 'archived'] as const) {
      expect(canTransition('draft', to, seo)).toBe(false)
    }
    expect(canTransition('published', 'published', seo)).toBe(true) // no-op
  })

  it('publishers can make any transition', () => {
    expect(canTransition('draft', 'approved', editor)).toBe(true)
    expect(canTransition('published', 'archived', editor)).toBe(true)
  })

  it('notes are required for send-backs and unpublishing', () => {
    expect(requiresNote('in_review', 'draft')).toBe(true)
    expect(requiresNote('published', 'archived')).toBe(true)
    expect(requiresNote('draft', 'submitted')).toBe(false)
    expect(requiresNote('draft', 'draft')).toBe(false)
  })

  it('journalists may only edit their own drafts', () => {
    expect(canEditInStatus('draft', journalist)).toBe(true)
    expect(canEditInStatus('submitted', journalist)).toBe(false)
    expect(canEditInStatus('draft', otherJournalist)).toBe(false)
    expect(canEditInStatus('published', copy)).toBe(false)
    expect(canEditInStatus('published', seo)).toBe(true)
    expect(canEditInStatus('archived', seo)).toBe(false)
  })
})

describe('role helpers', () => {
  const staff = (role: string, sections: unknown[] = []) => ({ id: 1, collection: 'users', role, sections }) as any

  it('section editors publish only inside their sections', () => {
    expect(canPublishInCategory(staff('section_editor', [{ id: 5 }]), 5)).toBe(true)
    expect(canPublishInCategory(staff('section_editor', [5]), { id: 5 })).toBe(true)
    expect(canPublishInCategory(staff('section_editor', [5]), 6)).toBe(false)
    expect(canPublishInCategory(staff('editor_in_chief'), 6)).toBe(true)
    expect(canPublishInCategory(staff('journalist'), 6)).toBe(false)
    expect(canPublishInCategory(null, 6)).toBe(false)
  })

  it('reader entitlement requires an entitled status and a future end date', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const reader = (status: string, activeUntil: string | null) =>
      ({ id: 1, collection: 'readers', entitlement: { status, activeUntil } }) as any
    expect(isEntitledReader(reader('active', '2026-02-01T00:00:00Z'), now)).toBe(true)
    expect(isEntitledReader(reader('active', '2025-12-01T00:00:00Z'), now)).toBe(false)
    expect(isEntitledReader(reader('cancelled', '2026-02-01T00:00:00Z'), now)).toBe(false)
    expect(isEntitledReader(reader('active', null), now)).toBe(false)
    expect(isEntitledReader({ id: 1, collection: 'users', role: 'super_admin' } as any, now)).toBe(false)
  })
})
