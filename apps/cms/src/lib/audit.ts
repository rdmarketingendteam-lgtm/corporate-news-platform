import type { PayloadRequest } from 'payload'

export type AuditEntry = {
  action: string
  entityType: string
  entityId: string
  actor?: number | string
  actorLabel?: string
  reason?: string
  metadata?: Record<string, unknown>
}

/** Append-only audit trail. Written via the Local API inside the same transaction as the change. */
export async function writeAudit(req: PayloadRequest, entry: AuditEntry): Promise<void> {
  try {
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: entry.actor as number | undefined,
        actorLabel: entry.actorLabel ?? (entry.actor ? undefined : 'system'),
        reason: entry.reason,
        metadata: entry.metadata ?? {},
      },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err, entry }, 'Failed to write audit log')
    throw err
  }
}
