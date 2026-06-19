import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  approvalRequests,
  auditLogs,
  reportSchedules,
  reports,
  schedules,
  tasks,
} from '../db/schema.js'
import { notificationService } from './notification.service.js'

export type ReportKind = 'manual' | 'daily' | 'weekly'
export type ReportScheduleFrequency = 'daily' | 'weekly'
export type ReportActorType = 'admin' | 'user' | 'agent' | 'system'

export interface ReportAccess {
  userId?: string | null
}

export interface ReportActor {
  type: ReportActorType
  id?: string | null
}

export interface GenerateReportInput {
  userId?: string | null
  kind?: ReportKind
  periodStart?: Date
  periodEnd?: Date
  deliver?: boolean
}

export interface CreateReportScheduleInput {
  name: string
  userId?: string | null
  frequency: ReportScheduleFrequency
  timezone?: string
  enabled?: boolean
  deliver?: boolean
}

export interface UpdateReportScheduleInput {
  name?: string
  frequency?: ReportScheduleFrequency
  timezone?: string
  enabled?: boolean
  deliver?: boolean
}

type ReportScheduleRow = typeof reportSchedules.$inferSelect
type ReportDeliveryStatus = 'delivered' | 'delivery_failed' | 'delivery_skipped'

export class ReportService {
  async list(access?: ReportAccess) {
    return db
      .select()
      .from(reports)
      .where(this.accessCondition(reports.userId, access))
      .orderBy(desc(reports.createdAt))
      .limit(50)
  }

  async getById(id: string, access?: ReportAccess) {
    const [report] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, id), this.accessCondition(reports.userId, access)))
    return report ?? null
  }

  async generate(input: GenerateReportInput = {}, actor: ReportActor = { type: 'system' }) {
    const kind = input.kind ?? 'manual'
    const period = this.resolvePeriod(kind, input.periodStart, input.periodEnd)
    const payload = await this.buildPayload(input.userId ?? null, period.start, period.end)
    const summary = this.renderSummary(payload)

    const [report] = await db
      .insert(reports)
      .values({
        userId: input.userId ?? null,
        title: this.titleFor(kind, period.start, period.end),
        kind,
        periodStart: period.start,
        periodEnd: period.end,
        summary,
        payload: JSON.stringify(payload),
        status: 'generated',
      })
      .returning()

    await this.audit(actor, 'report.generated', report.id, {
      userId: report.userId,
      kind: report.kind,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    })

    if (!input.deliver) return report

    return this.deliver(report.id)
  }

  async deliver(id: string) {
    const [report] = await db.select().from(reports).where(eq(reports.id, id))
    if (!report) return null

    let delivery: { status: ReportDeliveryStatus; message: string; recipient?: string | null }
    try {
      delivery = await notificationService.deliverWhatsAppToUser({
        userId: report.userId,
        text: [
          report.title,
          '',
          report.summary,
        ].join('\n'),
        metadata: {
          reportId: report.id,
          userId: report.userId,
          kind: report.kind,
        },
      })
    } catch (error) {
      delivery = {
        status: 'delivery_failed',
        message: error instanceof Error ? error.message : String(error),
        recipient: null,
      }
    }

    const now = new Date()
    const [updated] = await db
      .update(reports)
      .set({
        status: delivery.status,
        deliveryStatus: delivery.status,
        deliveryMessage: delivery.message,
        deliveredAt: delivery.status === 'delivered' ? now : null,
        updatedAt: now,
      })
      .where(eq(reports.id, id))
      .returning()

    await this.audit({ type: 'system' }, 'report.delivery.recorded', id, {
      userId: report.userId,
      status: delivery.status,
      recipient: delivery.recipient ?? null,
      message: delivery.message,
    })

    return updated
  }

  async listSchedules(access?: ReportAccess) {
    return db
      .select()
      .from(reportSchedules)
      .where(this.accessCondition(reportSchedules.userId, access))
      .orderBy(desc(reportSchedules.createdAt))
  }

  async createSchedule(input: CreateReportScheduleInput, actor: ReportActor) {
    const enabled = input.enabled ?? true
    const timezone = input.timezone ?? 'Asia/Jakarta'
    const nextRunAt = enabled
      ? this.computeNextRunAt(input.frequency, timezone, new Date(), true)
      : null

    const [schedule] = await db
      .insert(reportSchedules)
      .values({
        userId: input.userId ?? null,
        name: input.name,
        frequency: input.frequency,
        timezone,
        enabled,
        deliver: input.deliver ?? true,
        nextRunAt,
      })
      .returning()

    await this.audit(actor, 'report_schedule.created', schedule.id, {
      userId: schedule.userId,
      frequency: schedule.frequency,
      nextRunAt: schedule.nextRunAt,
    })

    return schedule
  }

  async updateSchedule(
    id: string,
    input: UpdateReportScheduleInput,
    access: ReportAccess | undefined,
    actor: ReportActor,
  ) {
    const existing = await this.getScheduleById(id, access)
    if (!existing) return null

    const shouldRecompute = input.frequency !== undefined ||
      input.timezone !== undefined ||
      input.enabled !== undefined

    const frequency = input.frequency ?? existing.frequency
    const timezone = input.timezone ?? existing.timezone
    const enabled = input.enabled ?? existing.enabled
    const nextRunAt = shouldRecompute
      ? enabled ? this.computeNextRunAt(frequency, timezone, new Date(), true) : null
      : undefined

    const [schedule] = await db
      .update(reportSchedules)
      .set({
        ...input,
        ...(nextRunAt !== undefined ? { nextRunAt } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(reportSchedules.id, id), this.accessCondition(reportSchedules.userId, access)))
      .returning()

    await this.audit(actor, 'report_schedule.updated', schedule.id, {
      userId: schedule.userId,
      enabled: schedule.enabled,
      nextRunAt: schedule.nextRunAt,
    })

    return schedule
  }

  async deleteSchedule(id: string, access: ReportAccess | undefined, actor: ReportActor) {
    const [schedule] = await db
      .delete(reportSchedules)
      .where(and(eq(reportSchedules.id, id), this.accessCondition(reportSchedules.userId, access)))
      .returning()
    if (!schedule) return null

    await this.audit(actor, 'report_schedule.deleted', schedule.id, {
      userId: schedule.userId,
      frequency: schedule.frequency,
    })

    return schedule
  }

  async processDue(input: { now?: Date; limit?: number } = {}) {
    const now = input.now ?? new Date()
    const limit = Math.max(1, Math.min(input.limit ?? 10, 50))
    await this.initializeMissingNextRuns(now)

    const dueSchedules = await db
      .select()
      .from(reportSchedules)
      .where(and(
        eq(reportSchedules.enabled, true),
        lte(reportSchedules.nextRunAt, now),
      ))
      .orderBy(asc(reportSchedules.nextRunAt))
      .limit(limit)

    const schedules = []
    for (const schedule of dueSchedules) {
      schedules.push(await this.runSchedule(schedule, now))
    }

    return {
      checkedAt: now,
      processed: schedules.length,
      schedules,
    }
  }

  private async getScheduleById(id: string, access?: ReportAccess) {
    const [schedule] = await db
      .select()
      .from(reportSchedules)
      .where(and(eq(reportSchedules.id, id), this.accessCondition(reportSchedules.userId, access)))
    return schedule ?? null
  }

  private async initializeMissingNextRuns(now: Date) {
    const rows = await db
      .select()
      .from(reportSchedules)
      .where(and(eq(reportSchedules.enabled, true), isNull(reportSchedules.nextRunAt)))

    for (const row of rows) {
      await db
        .update(reportSchedules)
        .set({
          nextRunAt: this.computeNextRunAt(row.frequency, row.timezone, now, true),
          updatedAt: now,
        })
        .where(eq(reportSchedules.id, row.id))
    }
  }

  private async runSchedule(schedule: ReportScheduleRow, now: Date) {
    const period = this.previousPeriod(schedule.frequency, schedule.timezone, now)
    let status = 'generated'
    let message = 'Report generated.'
    let reportId: string | null = null

    try {
      const report = await this.generate({
        userId: schedule.userId,
        kind: schedule.frequency,
        periodStart: period.start,
        periodEnd: period.end,
        deliver: schedule.deliver,
      }, { type: 'system' })
      if (!report) throw new Error('Report generation returned no record')
      reportId = report.id
      status = report.status
      message = report.deliveryMessage ?? 'Report generated.'
    } catch (error) {
      status = 'failed'
      message = error instanceof Error ? error.message : String(error)
    }

    const nextRunAt = this.computeNextRunAt(schedule.frequency, schedule.timezone, now, false)
    const [updated] = await db
      .update(reportSchedules)
      .set({
        lastRunAt: now,
        lastRunStatus: status,
        lastRunMessage: message,
        nextRunAt,
        updatedAt: now,
      })
      .where(eq(reportSchedules.id, schedule.id))
      .returning()

    await this.audit({ type: 'system' }, 'report_schedule.processed', schedule.id, {
      userId: schedule.userId,
      frequency: schedule.frequency,
      status,
      message,
      reportId,
      nextRunAt,
    })

    return updated
  }

  private async buildPayload(userId: string | null, periodStart: Date, periodEnd: Date) {
    const taskRows = await db
      .select()
      .from(tasks)
      .where(and(
        this.userCondition(tasks.userId, userId),
        gte(tasks.createdAt, periodStart),
        lte(tasks.createdAt, periodEnd),
      ))

    const openTaskRows = await db
      .select()
      .from(tasks)
      .where(and(
        this.userCondition(tasks.userId, userId),
        eq(tasks.done, false),
      ))

    const reminderRows = await db
      .select()
      .from(schedules)
      .where(and(
        this.userCondition(schedules.userId, userId),
        gte(schedules.lastTriggeredAt, periodStart),
        lte(schedules.lastTriggeredAt, periodEnd),
      ))

    const approvalRows = await db
      .select()
      .from(approvalRequests)
      .where(and(
        this.userCondition(approvalRequests.userId, userId),
        gte(approvalRequests.createdAt, periodStart),
        lte(approvalRequests.createdAt, periodEnd),
      ))

    const auditRows = await db
      .select()
      .from(auditLogs)
      .where(and(
        userId === null ? undefined : eq(auditLogs.actorId, userId),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd),
      ))

    return {
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      tasks: {
        created: taskRows.length,
        completed: taskRows.filter((task) => task.done).length,
        open: openTaskRows.length,
        overdue: openTaskRows.filter((task) => task.dueAt && task.dueAt <= periodEnd).length,
      },
      reminders: {
        triggered: reminderRows.length,
        delivered: reminderRows.filter((reminder) => reminder.lastTriggerStatus === 'delivered').length,
        failed: reminderRows.filter((reminder) => reminder.lastTriggerStatus === 'delivery_failed').length,
      },
      approvals: {
        requested: approvalRows.length,
        pending: approvalRows.filter((approval) => approval.status === 'pending').length,
        approved: approvalRows.filter((approval) => approval.status === 'approved').length,
        rejected: approvalRows.filter((approval) => approval.status === 'rejected').length,
      },
      audit: {
        events: auditRows.length,
      },
    }
  }

  private renderSummary(payload: Awaited<ReturnType<ReportService['buildPayload']>>) {
    return [
      `Tasks: ${payload.tasks.created} created, ${payload.tasks.completed} completed, ${payload.tasks.open} open, ${payload.tasks.overdue} overdue.`,
      `Reminders: ${payload.reminders.triggered} triggered, ${payload.reminders.delivered} delivered, ${payload.reminders.failed} failed.`,
      `Approvals: ${payload.approvals.requested} requested, ${payload.approvals.pending} pending, ${payload.approvals.approved} approved, ${payload.approvals.rejected} rejected.`,
      `Audit events: ${payload.audit.events}.`,
    ].join('\n')
  }

  private resolvePeriod(kind: ReportKind, periodStart?: Date, periodEnd?: Date) {
    if (periodStart && periodEnd) return { start: periodStart, end: periodEnd }
    const end = periodEnd ?? new Date()
    const durationMs = kind === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    return {
      start: periodStart ?? new Date(end.getTime() - durationMs),
      end,
    }
  }

  private previousPeriod(frequency: ReportScheduleFrequency, timezone: string, now: Date) {
    const local = this.toLocalParts(now, timezone)
    const endLocal = {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: 0,
      minute: 0,
    }
    const end = this.fromLocalParts(endLocal, timezone)
    const days = frequency === 'weekly' ? 7 : 1
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
    return { start, end }
  }

  private titleFor(kind: ReportKind, start: Date, end: Date) {
    return `Nara ${kind} report (${start.toISOString()} - ${end.toISOString()})`
  }

  private accessCondition(column: typeof reports.userId | typeof reportSchedules.userId, access?: ReportAccess) {
    if (!access || !Object.prototype.hasOwnProperty.call(access, 'userId')) return undefined
    return access.userId === null ? isNull(column) : eq(column, access.userId!)
  }

  private userCondition(column: typeof tasks.userId | typeof schedules.userId | typeof approvalRequests.userId, userId: string | null) {
    return userId === null ? isNull(column) : eq(column, userId)
  }

  private computeNextRunAt(
    frequency: ReportScheduleFrequency,
    timezone: string,
    from: Date,
    includeCurrent: boolean,
  ) {
    let local = this.toLocalParts(from, timezone)
    for (let i = 0; i < 370; i++) {
      const candidateLocal = {
        year: local.year,
        month: local.month,
        day: local.day,
        hour: 17,
        minute: 0,
      }
      const isWeeklyTarget = frequency === 'daily' || local.dayOfWeek === 1
      const candidate = this.fromLocalParts(candidateLocal, timezone)
      if (isWeeklyTarget && (includeCurrent ? candidate >= from : candidate > from)) {
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

  private timezoneOffsetMinutes(timezone: string) {
    if (timezone === 'UTC') return 0
    return 7 * 60
  }

  private async audit(
    actor: ReportActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'report',
      targetId,
      metadata: JSON.stringify(metadata),
    })
  }
}

export const reportService = new ReportService()

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
