import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs, schedules } from '../db/schema.js'
import type { TaskSource } from './task.service.js'

export type ReminderKind = 'once' | 'recurring'
export type ReminderActorType = 'admin' | 'user' | 'agent' | 'system'

export interface CreateReminderInput {
  name: string
  description?: string
  userId?: string | null
  kind: ReminderKind
  scheduledAt?: Date | null
  cronExpr?: string | null
  timezone?: string
  source?: TaskSource
  enabled?: boolean
}

export interface UpdateReminderInput {
  name?: string
  description?: string | null
  scheduledAt?: Date | null
  cronExpr?: string | null
  timezone?: string
  enabled?: boolean
}

export interface ReminderAccess {
  userId?: string | null
}

export interface ReminderActor {
  type: ReminderActorType
  id?: string | null
}

export class ReminderService {
  async create(input: CreateReminderInput, actor: ReminderActor) {
    const [reminder] = await db
      .insert(schedules)
      .values({
        userId: input.userId ?? null,
        name: input.name,
        description: input.description ?? null,
        kind: input.kind,
        scheduledAt: input.scheduledAt ?? null,
        cronExpr: input.cronExpr ?? null,
        timezone: input.timezone ?? 'Asia/Jakarta',
        source: input.source ?? 'manual',
        enabled: input.enabled ?? true,
      })
      .returning()

    await this.audit(actor, 'reminder.created', reminder.id, {
      userId: reminder.userId,
      kind: reminder.kind,
      source: reminder.source,
    })
    return reminder
  }

  async list(access?: ReminderAccess) {
    const conditions = []
    if (access && Object.prototype.hasOwnProperty.call(access, 'userId')) {
      conditions.push(
        access.userId === null
          ? isNull(schedules.userId)
          : eq(schedules.userId, access.userId!),
      )
    }

    return db
      .select()
      .from(schedules)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schedules.createdAt))
  }

  async getById(id: string, access?: ReminderAccess) {
    const [reminder] = await db
      .select()
      .from(schedules)
      .where(this.byIdAndAccess(id, access))
    return reminder ?? null
  }

  async update(
    id: string,
    input: UpdateReminderInput,
    access: ReminderAccess | undefined,
    actor: ReminderActor,
  ) {
    const [reminder] = await db
      .update(schedules)
      .set({ ...input, updatedAt: new Date() })
      .where(this.byIdAndAccess(id, access))
      .returning()
    if (!reminder) return null

    await this.audit(actor, 'reminder.updated', reminder.id, {
      userId: reminder.userId,
      enabled: reminder.enabled,
    })
    return reminder
  }

  async delete(
    id: string,
    access: ReminderAccess | undefined,
    actor: ReminderActor,
  ) {
    const [reminder] = await db
      .delete(schedules)
      .where(this.byIdAndAccess(id, access))
      .returning()
    if (!reminder) return null

    await this.audit(actor, 'reminder.deleted', reminder.id, {
      userId: reminder.userId,
      kind: reminder.kind,
    })
    return reminder
  }

  private byIdAndAccess(id: string, access?: ReminderAccess) {
    const conditions = [eq(schedules.id, id)]
    if (access && Object.prototype.hasOwnProperty.call(access, 'userId')) {
      conditions.push(
        access.userId === null
          ? isNull(schedules.userId)
          : eq(schedules.userId, access.userId!),
      )
    }
    return and(...conditions)
  }

  private async audit(
    actor: ReminderActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'reminder',
      targetId,
      metadata: JSON.stringify(metadata),
    })
  }
}

export const reminderService = new ReminderService()
