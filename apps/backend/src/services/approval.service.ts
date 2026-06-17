import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { approvalRequests, auditLogs } from '../db/schema.js'
import { reminderService, type ReminderActor, type ReminderKind } from './reminder.service.js'
import { taskService, type TaskPriority } from './task.service.js'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalActorType = 'admin' | 'user' | 'agent' | 'system'

export interface ApprovalActor {
  type: ApprovalActorType
  id?: string | null
}

export interface ApprovalAccess {
  userId?: string | null
}

export interface CreateApprovalInput {
  userId?: string | null
  title: string
  actionType: ApprovalActionType
  source?: string
  riskLevel?: 'low' | 'medium' | 'high'
  payload: ApprovalPayload
}

export type ApprovalActionType =
  | 'create_task'
  | 'complete_task'
  | 'delete_task'
  | 'create_reminder'
  | 'update_reminder'
  | 'delete_reminder'

export type ApprovalPayload =
  | {
      actionType: 'create_task'
      input: {
        title: string
        description?: string
        dueAt?: string
        priority?: TaskPriority
      }
    }
  | {
      actionType: 'complete_task'
      input: { id: string }
    }
  | {
      actionType: 'delete_task'
      input: { id: string }
    }
  | {
      actionType: 'create_reminder'
      input: {
        name: string
        description?: string
        kind: ReminderKind
        scheduledAt?: string
        cronExpr?: string | null
        timezone?: string
      }
    }
  | {
      actionType: 'update_reminder'
      input: {
        id: string
        name?: string
        description?: string | null
        scheduledAt?: string | null
        cronExpr?: string | null
        timezone?: string
        enabled?: boolean
      }
    }
  | {
      actionType: 'delete_reminder'
      input: { id: string }
    }

type ApprovalRow = typeof approvalRequests.$inferSelect

const parsePayload = (raw: string): ApprovalPayload => {
  const decoded = JSON.parse(raw)
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Approval payload is invalid')
  }
  return decoded as ApprovalPayload
}

const serialize = (value: unknown) => JSON.stringify(value)

export class ApprovalService {
  async create(input: CreateApprovalInput, actor: ApprovalActor) {
    const [approval] = await db
      .insert(approvalRequests)
      .values({
        userId: input.userId ?? null,
        title: input.title,
        actionType: input.actionType,
        source: input.source ?? 'nara_bot',
        riskLevel: input.riskLevel ?? 'low',
        status: 'pending',
        payload: serialize(input.payload),
        requestedByType: actor.type,
        requestedById: actor.id ?? null,
      })
      .returning()

    await this.audit(actor, 'approval.requested', approval.id, {
      userId: approval.userId,
      actionType: approval.actionType,
      source: approval.source,
      riskLevel: approval.riskLevel,
    })
    return this.toPublic(approval)
  }

  async list(access?: ApprovalAccess, status?: ApprovalStatus) {
    const conditions = []
    if (status) conditions.push(eq(approvalRequests.status, status))
    if (access && Object.prototype.hasOwnProperty.call(access, 'userId')) {
      conditions.push(
        access.userId === null
          ? isNull(approvalRequests.userId)
          : eq(approvalRequests.userId, access.userId!),
      )
    }

    const rows = await db
      .select()
      .from(approvalRequests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(approvalRequests.createdAt))

    return rows.map((row) => this.toPublic(row))
  }

  async approve(id: string, access: ApprovalAccess | undefined, actor: ApprovalActor) {
    const existing = await this.getPending(id, access)
    if (!existing) return null

    const payload = parsePayload(existing.payload)
    const result = await this.executePayload(existing, payload)
    const now = new Date()

    const [updated] = await db
      .update(approvalRequests)
      .set({
        status: 'approved',
        result: serialize(result),
        decidedByType: actor.type,
        decidedById: actor.id ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvalRequests.id, id))
      .returning()

    await this.audit(actor, 'approval.approved', id, {
      userId: existing.userId,
      actionType: existing.actionType,
      result,
    })

    return updated ? this.toPublic(updated) : null
  }

  async reject(id: string, access: ApprovalAccess | undefined, actor: ApprovalActor) {
    const existing = await this.getPending(id, access)
    if (!existing) return null
    const now = new Date()

    const [updated] = await db
      .update(approvalRequests)
      .set({
        status: 'rejected',
        decidedByType: actor.type,
        decidedById: actor.id ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvalRequests.id, id))
      .returning()

    await this.audit(actor, 'approval.rejected', id, {
      userId: existing.userId,
      actionType: existing.actionType,
    })

    return updated ? this.toPublic(updated) : null
  }

  private async getPending(id: string, access?: ApprovalAccess) {
    const conditions = [
      eq(approvalRequests.id, id),
      eq(approvalRequests.status, 'pending' as const),
    ]
    if (access && Object.prototype.hasOwnProperty.call(access, 'userId')) {
      conditions.push(
        access.userId === null
          ? isNull(approvalRequests.userId)
          : eq(approvalRequests.userId, access.userId!),
      )
    }

    const [approval] = await db
      .select()
      .from(approvalRequests)
      .where(and(...conditions))
    return approval ?? null
  }

  private async executePayload(approval: ApprovalRow, payload: ApprovalPayload) {
    const userId = approval.userId
    const access = { userId }
    const actor: ReminderActor = { type: 'agent', id: userId }

    switch (payload.actionType) {
      case 'create_task': {
        const task = await taskService.create({
          title: payload.input.title,
          description: payload.input.description,
          userId,
          dueAt: payload.input.dueAt ? new Date(payload.input.dueAt) : undefined,
          priority: payload.input.priority,
          source: 'agent',
        })
        return { task }
      }
      case 'complete_task': {
        const task = await taskService.complete(payload.input.id, access)
        if (!task) throw new Error('Task not found')
        return { task }
      }
      case 'delete_task': {
        const task = await taskService.delete(payload.input.id, access)
        if (!task) throw new Error('Task not found')
        return { taskId: task.id, title: task.title }
      }
      case 'create_reminder': {
        const reminder = await reminderService.create({
          name: payload.input.name,
          description: payload.input.description,
          kind: payload.input.kind,
          userId,
          scheduledAt: payload.input.scheduledAt ? new Date(payload.input.scheduledAt) : null,
          cronExpr: payload.input.cronExpr ?? null,
          timezone: payload.input.timezone ?? 'Asia/Jakarta',
          source: 'agent',
        }, actor)
        return { reminder }
      }
      case 'update_reminder': {
        const reminder = await reminderService.update(payload.input.id, {
          name: payload.input.name,
          description: payload.input.description,
          scheduledAt: payload.input.scheduledAt === undefined
            ? undefined
            : payload.input.scheduledAt === null ? null : new Date(payload.input.scheduledAt),
          cronExpr: payload.input.cronExpr,
          timezone: payload.input.timezone,
          enabled: payload.input.enabled,
        }, access, actor)
        if (!reminder) throw new Error('Reminder not found')
        return { reminder }
      }
      case 'delete_reminder': {
        const reminder = await reminderService.delete(payload.input.id, access, actor)
        if (!reminder) throw new Error('Reminder not found')
        return { reminderId: reminder.id, name: reminder.name }
      }
    }
  }

  private toPublic(row: ApprovalRow) {
    return {
      ...row,
      payload: parsePayload(row.payload),
      result: row.result ? JSON.parse(row.result) as unknown : null,
    }
  }

  private async audit(
    actor: ApprovalActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'approval',
      targetId,
      metadata: serialize(metadata),
    })
  }
}

export const approvalService = new ApprovalService()
