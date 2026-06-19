import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs, clients, contextEntries } from '../db/schema.js'

export type ContextKind = 'note' | 'preference' | 'summary' | 'instruction'
export type ContextImportance = 'low' | 'normal' | 'high'
export type ContextActorType = 'admin' | 'user' | 'agent' | 'system'

export interface ContextAccess {
  userId?: string | null
}

export interface ContextActor {
  type: ContextActorType
  id?: string | null
}

export interface CreateContextInput {
  userId?: string | null
  clientId?: string | null
  kind: ContextKind
  title: string
  body: string
  source?: string
  importance?: ContextImportance
  pinned?: boolean
  metadata?: Record<string, unknown> | null
}

export interface UpdateContextInput {
  clientId?: string | null
  kind?: ContextKind
  title?: string
  body?: string
  source?: string
  importance?: ContextImportance
  pinned?: boolean
  metadata?: Record<string, unknown> | null
}

export interface ListContextInput {
  kind?: ContextKind
  clientId?: string | null
  pinned?: boolean
  limit?: number
}

type ContextRow = typeof contextEntries.$inferSelect

export class ContextService {
  async list(input: ListContextInput = {}, access?: ContextAccess) {
    const limit = Math.max(1, Math.min(input.limit ?? 50, 100))
    const rows = await db
      .select()
      .from(contextEntries)
      .where(and(
        this.accessCondition(access),
        input.kind ? eq(contextEntries.kind, input.kind) : undefined,
        input.clientId === undefined
          ? undefined
          : input.clientId === null
            ? isNull(contextEntries.clientId)
            : eq(contextEntries.clientId, input.clientId),
        input.pinned === undefined ? undefined : eq(contextEntries.pinned, input.pinned),
      ))
      .orderBy(desc(contextEntries.pinned), desc(contextEntries.updatedAt))
      .limit(limit)

    return rows.map((row) => this.toPublic(row))
  }

  async getById(id: string, access?: ContextAccess) {
    const [row] = await db
      .select()
      .from(contextEntries)
      .where(and(eq(contextEntries.id, id), this.accessCondition(access)))
    return row ? this.toPublic(row) : null
  }

  async create(input: CreateContextInput, access: ContextAccess | undefined, actor: ContextActor) {
    const userId = await this.resolveUserId(input, access)
    if (userId === undefined) return null

    const [entry] = await db
      .insert(contextEntries)
      .values({
        userId,
        clientId: input.clientId ?? null,
        kind: input.kind,
        title: input.title,
        body: input.body,
        source: input.source ?? 'manual',
        importance: input.importance ?? 'normal',
        pinned: input.pinned ?? false,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
      .returning()

    await this.audit(actor, 'context.created', entry.id, {
      userId: entry.userId,
      clientId: entry.clientId,
      kind: entry.kind,
      importance: entry.importance,
      pinned: entry.pinned,
    })

    return this.toPublic(entry)
  }

  async update(id: string, input: UpdateContextInput, access: ContextAccess | undefined, actor: ContextActor) {
    const existing = await this.getById(id, access)
    if (!existing) return null

    if (input.clientId !== undefined) {
      const allowed = await this.canUseClient(input.clientId, access)
      if (!allowed) return null
    }

    const [entry] = await db
      .update(contextEntries)
      .set({
        ...input,
        metadata: input.metadata === undefined
          ? undefined
          : input.metadata ? JSON.stringify(input.metadata) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(contextEntries.id, id), this.accessCondition(access)))
      .returning()

    if (!entry) return null

    await this.audit(actor, 'context.updated', entry.id, {
      userId: entry.userId,
      clientId: entry.clientId,
      kind: entry.kind,
      importance: entry.importance,
      pinned: entry.pinned,
    })

    return this.toPublic(entry)
  }

  async delete(id: string, access: ContextAccess | undefined, actor: ContextActor) {
    const [entry] = await db
      .delete(contextEntries)
      .where(and(eq(contextEntries.id, id), this.accessCondition(access)))
      .returning()
    if (!entry) return null

    await this.audit(actor, 'context.deleted', entry.id, {
      userId: entry.userId,
      clientId: entry.clientId,
      kind: entry.kind,
    })

    return this.toPublic(entry)
  }

  async getAgentContext(userId: string, limit = 12) {
    const rows = await db
      .select()
      .from(contextEntries)
      .where(eq(contextEntries.userId, userId))
      .orderBy(desc(contextEntries.pinned), desc(contextEntries.importance), desc(contextEntries.updatedAt))
      .limit(Math.max(1, Math.min(limit, 25)))

    return rows.map((row) => this.toPublic(row))
  }

  private accessCondition(access?: ContextAccess) {
    if (!access || !Object.prototype.hasOwnProperty.call(access, 'userId')) return undefined
    return access.userId === null ? isNull(contextEntries.userId) : eq(contextEntries.userId, access.userId!)
  }

  private async resolveUserId(input: CreateContextInput, access?: ContextAccess) {
    if (access && Object.prototype.hasOwnProperty.call(access, 'userId')) {
      if (access.userId === null) {
        if (input.clientId && !await this.canUseClient(input.clientId, access)) return undefined
        return null
      }
      if (input.clientId && !await this.canUseClient(input.clientId, access)) return undefined
      return access.userId
    }

    if (input.clientId && !await this.canUseClient(input.clientId, access)) return undefined
    return input.userId ?? null
  }

  private async canUseClient(clientId: string | null, access?: ContextAccess) {
    if (clientId === null) return true
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        access && Object.prototype.hasOwnProperty.call(access, 'userId')
          ? access.userId === null ? isNull(clients.userId) : eq(clients.userId, access.userId!)
          : undefined,
      ))
    return Boolean(client)
  }

  private toPublic(row: ContextRow) {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) as unknown : null,
    }
  }

  private async audit(
    actor: ContextActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'context',
      targetId,
      metadata: JSON.stringify(metadata),
    })
  }
}

export const contextService = new ContextService()
