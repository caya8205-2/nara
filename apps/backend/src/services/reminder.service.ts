import { and, asc, desc, eq, isNull, lte } from 'drizzle-orm'
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

export interface ProcessDueRemindersInput {
  now?: Date
  limit?: number
}

type ReminderRow = typeof schedules.$inferSelect

export class ReminderService {
  async create(input: CreateReminderInput, actor: ReminderActor) {
    const enabled = input.enabled ?? true
    const timezone = input.timezone ?? 'Asia/Jakarta'
    const nextRunAt = this.computeNextRunAt({
      kind: input.kind,
      enabled,
      scheduledAt: input.scheduledAt ?? null,
      cronExpr: input.cronExpr ?? null,
      timezone,
      from: new Date(),
      includeCurrent: true,
    })

    const [reminder] = await db
      .insert(schedules)
      .values({
        userId: input.userId ?? null,
        name: input.name,
        description: input.description ?? null,
        kind: input.kind,
        scheduledAt: input.scheduledAt ?? null,
        cronExpr: input.cronExpr ?? null,
        timezone,
        source: input.source ?? 'manual',
        enabled,
        nextRunAt,
      })
      .returning()

    await this.audit(actor, 'reminder.created', reminder.id, {
      userId: reminder.userId,
      kind: reminder.kind,
      source: reminder.source,
      nextRunAt: reminder.nextRunAt,
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
    const existing = await this.getById(id, access)
    if (!existing) return null

    const nextRunAt = this.shouldRecomputeNextRunAt(input)
      ? this.computeNextRunAt({
        kind: existing.kind,
        enabled: input.enabled ?? existing.enabled,
        scheduledAt: input.scheduledAt === undefined
          ? existing.scheduledAt
          : input.scheduledAt,
        cronExpr: input.cronExpr === undefined ? existing.cronExpr : input.cronExpr,
        timezone: input.timezone ?? existing.timezone,
        from: new Date(),
        includeCurrent: true,
      })
      : undefined

    const [reminder] = await db
      .update(schedules)
      .set({
        ...input,
        ...(nextRunAt !== undefined ? { nextRunAt } : {}),
        updatedAt: new Date(),
      })
      .where(this.byIdAndAccess(id, access))
      .returning()
    if (!reminder) return null

    await this.audit(actor, 'reminder.updated', reminder.id, {
      userId: reminder.userId,
      enabled: reminder.enabled,
      nextRunAt: reminder.nextRunAt,
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

  async processDue(input: ProcessDueRemindersInput = {}) {
    const now = input.now ?? new Date()
    const limit = Math.max(1, Math.min(input.limit ?? 25, 100))
    await this.initializeMissingNextRuns(now)

    const dueReminders = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.enabled, true),
        lte(schedules.nextRunAt, now),
      ))
      .orderBy(asc(schedules.nextRunAt))
      .limit(limit)

    const reminders = []
    for (const reminder of dueReminders) {
      reminders.push(await this.trigger(reminder, now))
    }

    return {
      checkedAt: now,
      processed: reminders.length,
      reminders,
    }
  }

  async getExecutionSummary(access?: ReminderAccess) {
    const reminders = await this.list(access)
    const active = reminders.filter((reminder) => reminder.enabled)
    const triggered = reminders.filter((reminder) => reminder.lastTriggeredAt)
    const next = active
      .filter((reminder) => reminder.nextRunAt)
      .sort((a, b) => a.nextRunAt!.getTime() - b.nextRunAt!.getTime())[0]
    const last = triggered
      .sort((a, b) => b.lastTriggeredAt!.getTime() - a.lastTriggeredAt!.getTime())[0]

    return {
      activeCount: active.length,
      triggeredCount: triggered.length,
      nextRunAt: next?.nextRunAt ?? null,
      lastTriggeredAt: last?.lastTriggeredAt ?? null,
    }
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

  private async initializeMissingNextRuns(now: Date) {
    const reminders = await db
      .select()
      .from(schedules)
      .where(and(
        eq(schedules.enabled, true),
        isNull(schedules.nextRunAt),
      ))

    for (const reminder of reminders) {
      const nextRunAt = this.computeNextRunAt({
        kind: reminder.kind,
        enabled: reminder.enabled,
        scheduledAt: reminder.scheduledAt,
        cronExpr: reminder.cronExpr,
        timezone: reminder.timezone,
        from: now,
        includeCurrent: true,
      })

      if (!nextRunAt) continue

      await db
        .update(schedules)
        .set({ nextRunAt, updatedAt: now })
        .where(eq(schedules.id, reminder.id))
    }
  }

  private async trigger(reminder: ReminderRow, now: Date) {
    const message = `Reminder "${reminder.name}" became due.`
    const nextRunAt = reminder.kind === 'recurring'
      ? this.computeNextRunAt({
        kind: reminder.kind,
        enabled: reminder.enabled,
        scheduledAt: reminder.scheduledAt,
        cronExpr: reminder.cronExpr,
        timezone: reminder.timezone,
        from: now,
        includeCurrent: false,
      })
      : null

    const [updated] = await db
      .update(schedules)
      .set({
        enabled: reminder.kind === 'once' ? false : reminder.enabled,
        nextRunAt,
        lastTriggeredAt: now,
        lastTriggerStatus: 'recorded',
        lastTriggerMessage: message,
        updatedAt: now,
      })
      .where(eq(schedules.id, reminder.id))
      .returning()

    await this.audit({ type: 'system' }, 'reminder.triggered', reminder.id, {
      userId: reminder.userId,
      kind: reminder.kind,
      action: reminder.action,
      status: 'recorded',
      nextRunAt,
    })

    return updated
  }

  private shouldRecomputeNextRunAt(input: UpdateReminderInput) {
    return input.scheduledAt !== undefined ||
      input.cronExpr !== undefined ||
      input.timezone !== undefined ||
      input.enabled !== undefined
  }

  private computeNextRunAt(input: {
    kind: ReminderKind
    enabled: boolean
    scheduledAt?: Date | null
    cronExpr?: string | null
    timezone: string
    from: Date
    includeCurrent: boolean
  }) {
    if (!input.enabled) return null
    if (input.kind === 'once') return input.scheduledAt ?? null
    if (!input.cronExpr) return null

    return this.nextFromSupportedCron(
      input.cronExpr,
      input.timezone,
      input.from,
      input.includeCurrent,
    )
  }

  private nextFromSupportedCron(
    cronExpr: string,
    timezone: string,
    from: Date,
    includeCurrent: boolean,
  ) {
    const parts = cronExpr.trim().split(/\s+/)
    if (parts.length !== 5) return null

    const [minuteRaw, hourRaw, dayOfMonthRaw, monthRaw, dayOfWeekRaw] = parts
    if (monthRaw !== '*') return null

    const minute = Number(minuteRaw)
    const hour = Number(hourRaw)
    if (!Number.isInteger(minute) || !Number.isInteger(hour)) return null
    if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null

    if (dayOfMonthRaw === '*' && dayOfWeekRaw === '*') {
      return this.findNextLocalDate(timezone, from, includeCurrent, (candidate) => ({
        year: candidate.year,
        month: candidate.month,
        day: candidate.day,
        hour,
        minute,
      }))
    }

    if (dayOfMonthRaw === '*' && dayOfWeekRaw !== '*') {
      const dayOfWeek = Number(dayOfWeekRaw)
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null
      return this.findNextLocalDate(timezone, from, includeCurrent, (candidate) => {
        const delta = (dayOfWeek - candidate.dayOfWeek + 7) % 7
        const target = this.addLocalDays(candidate, delta)
        return {
          year: target.year,
          month: target.month,
          day: target.day,
          hour,
          minute,
        }
      })
    }

    if (dayOfMonthRaw !== '*' && dayOfWeekRaw === '*') {
      const dayOfMonth = Number(dayOfMonthRaw)
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null
      return this.findNextLocalDate(timezone, from, includeCurrent, (candidate) => ({
        year: candidate.year,
        month: candidate.month,
        day: Math.min(dayOfMonth, this.daysInMonth(candidate.year, candidate.month)),
        hour,
        minute,
      }))
    }

    return null
  }

  private findNextLocalDate(
    timezone: string,
    from: Date,
    includeCurrent: boolean,
    buildCandidate: (local: LocalDateParts) => LocalDateTimeParts,
  ) {
    let local = this.toLocalParts(from, timezone)
    for (let i = 0; i < 370; i++) {
      const candidate = this.fromLocalParts(buildCandidate(local), timezone)
      if (includeCurrent ? candidate >= from : candidate > from) {
        return candidate
      }
      local = this.addLocalDays(local, 1)
    }
    return null
  }

  private toLocalParts(value: Date, timezone: string): LocalDateParts {
    const offsetMinutes = this.timezoneOffsetMinutes(timezone)
    const shifted = new Date(value.getTime() + offsetMinutes * 60_000)
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      dayOfWeek: shifted.getUTCDay(),
    }
  }

  private fromLocalParts(value: LocalDateTimeParts, timezone: string) {
    const offsetMinutes = this.timezoneOffsetMinutes(timezone)
    return new Date(Date.UTC(
      value.year,
      value.month - 1,
      value.day,
      value.hour,
      value.minute,
    ) - offsetMinutes * 60_000)
  }

  private addLocalDays(value: LocalDateParts, days: number): LocalDateParts {
    const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days))
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      dayOfWeek: date.getUTCDay(),
    }
  }

  private daysInMonth(year: number, month: number) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
  }

  private timezoneOffsetMinutes(timezone: string) {
    if (timezone === 'UTC') return 0
    return 7 * 60
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

interface LocalDateParts {
  year: number
  month: number
  day: number
  dayOfWeek: number
}

interface LocalDateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}
