import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  agentGroupMembers,
  agentGroupMessages,
  agentGroups,
  agentGroupSummaries,
  auditLogs,
} from '../db/schema.js'
import type { AgentChannelType } from './identity.service.js'

export type GroupActorType = 'admin' | 'user' | 'agent' | 'system'

export interface GroupActor {
  type: GroupActorType
  id?: string | null
}

export interface UpsertGroupInput {
  channelType?: AgentChannelType
  externalId: string
  name?: string
  description?: string | null
  metadata?: Record<string, unknown> | null
}

export interface RecordGroupMessageInput {
  senderContactValue?: string | null
  senderDisplayName?: string | null
  body: string
  occurredAt?: Date | null
  metadata?: Record<string, unknown> | null
}

export interface ConfigureGroupSummaryInput {
  summaryEnabled?: boolean
  summaryCronExpr?: string | null
  summaryTimezone?: string
  digestTarget?: string
}

export interface SaveGroupSummaryInput {
  title: string
  summary: string
  periodStart?: Date | null
  periodEnd?: Date | null
  messageCount?: number
  source?: string
  metadata?: Record<string, unknown> | null
}

export interface ProcessDueGroupSummariesInput {
  now?: Date
  limit?: number
}

type GroupRow = typeof agentGroups.$inferSelect
type GroupMemberRow = typeof agentGroupMembers.$inferSelect
type GroupMessageRow = typeof agentGroupMessages.$inferSelect
type GroupSummaryRow = typeof agentGroupSummaries.$inferSelect

export class GroupContextService {
  async upsertGroup(input: UpsertGroupInput, actor: GroupActor) {
    const channelType = input.channelType ?? 'whatsapp'
    const externalId = this.normalizeExternalId(input.externalId)
    const now = new Date()
    const existing = await this.findGroup(channelType, externalId)

    if (existing) {
      const [updated] = await db
        .update(agentGroups)
        .set({
          name: input.name?.trim() || existing.name,
          description: input.description === undefined ? existing.description : input.description,
          metadata: input.metadata === undefined
            ? existing.metadata
            : input.metadata ? JSON.stringify(input.metadata) : null,
          updatedAt: now,
        })
        .where(eq(agentGroups.id, existing.id))
        .returning()

      return this.toPublicGroup(updated ?? existing)
    }

    const [group] = await db
      .insert(agentGroups)
      .values({
        channelType,
        externalId,
        name: input.name?.trim() || externalId,
        description: input.description ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
      .returning()

    await this.audit(actor, 'agent_group.created', group.id, {
      channelType,
      externalId,
      name: group.name,
    })

    return this.toPublicGroup(group)
  }

  async getContext(input: UpsertGroupInput, actor: GroupActor) {
    const group = await this.upsertGroup(input, actor)
    const [members, summaries, recentMessages, messageCount] = await Promise.all([
      this.listMembers(group.id),
      this.listSummaries(group.id, 5),
      this.listMessages(group.id, 20),
      this.countMessages(group.id),
    ])

    return {
      group,
      members,
      recentSummaries: summaries,
      recentMessages,
      messageCount,
      instructions: [
        'This is a Nara group context. Use Nara backend group tools for group memory and summaries.',
        'Do not summarize a group unless the conversation came from this group or the user explicitly asks for this group.',
        'Record only relevant group messages that are provided by the WhatsApp runtime; do not invent transcript content.',
        'Save summaries with save_group_summary after you create a concise digest for the requested period.',
      ],
      toolContext: {
        groupId: group.id,
        groupExternalId: group.externalId,
        groupChannelType: group.channelType,
        naraToolContractVersion: '2026-06-23',
        resolvedBy: 'get_group_context',
      },
    }
  }

  async addMember(groupId: string, userId: string, role = 'member', actor: GroupActor) {
    const existing = await db
      .select()
      .from(agentGroupMembers)
      .where(and(eq(agentGroupMembers.groupId, groupId), eq(agentGroupMembers.userId, userId)))
      .limit(1)

    if (existing[0]) return this.toPublicMember(existing[0])

    const [member] = await db
      .insert(agentGroupMembers)
      .values({ groupId, userId, role })
      .returning()

    await this.audit(actor, 'agent_group.member_added', groupId, { userId, role })
    return this.toPublicMember(member)
  }

  async configureSummary(groupId: string, input: ConfigureGroupSummaryInput, actor: GroupActor) {
    const [group] = await db
      .update(agentGroups)
      .set({
        summaryEnabled: input.summaryEnabled,
        summaryCronExpr: input.summaryCronExpr,
        summaryTimezone: input.summaryTimezone,
        digestTarget: input.digestTarget,
        updatedAt: new Date(),
      })
      .where(eq(agentGroups.id, groupId))
      .returning()

    if (!group) return null
    await this.audit(actor, 'agent_group.summary_configured', group.id, {
      summaryEnabled: group.summaryEnabled,
      summaryCronExpr: group.summaryCronExpr,
      summaryTimezone: group.summaryTimezone,
      digestTarget: group.digestTarget,
    })
    return this.toPublicGroup(group)
  }

  async recordMessages(groupId: string, messages: RecordGroupMessageInput[], actor: GroupActor) {
    const cleaned = messages
      .map((message) => ({
        groupId,
        senderContactValue: message.senderContactValue?.trim() || null,
        senderDisplayName: message.senderDisplayName?.trim() || null,
        body: message.body.trim(),
        occurredAt: message.occurredAt ?? new Date(),
        metadata: message.metadata ? JSON.stringify(message.metadata) : null,
      }))
      .filter((message) => message.body.length > 0)

    if (cleaned.length === 0) return { recorded: 0, messages: [] }

    const rows = await db.insert(agentGroupMessages).values(cleaned).returning()
    const lastOccurredAt = cleaned.reduce((latest, message) =>
      message.occurredAt > latest ? message.occurredAt : latest,
    cleaned[0].occurredAt)

    await db
      .update(agentGroups)
      .set({ lastMessageAt: lastOccurredAt, updatedAt: new Date() })
      .where(eq(agentGroups.id, groupId))

    await this.audit(actor, 'agent_group.messages_recorded', groupId, {
      recorded: rows.length,
      lastOccurredAt,
    })

    return {
      recorded: rows.length,
      messages: rows.map((row) => this.toPublicMessage(row)),
    }
  }

  async saveSummary(groupId: string, input: SaveGroupSummaryInput, actor: GroupActor) {
    const messageCount = input.messageCount ?? await this.countMessages(
      groupId,
      input.periodStart ?? undefined,
      input.periodEnd ?? undefined,
    )

    const [summary] = await db
      .insert(agentGroupSummaries)
      .values({
        groupId,
        title: input.title,
        summary: input.summary,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        messageCount,
        source: input.source ?? 'agent',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
      .returning()

    await db
      .update(agentGroups)
      .set({ lastSummaryAt: new Date(), updatedAt: new Date() })
      .where(eq(agentGroups.id, groupId))

    await this.audit(actor, 'agent_group.summary_saved', groupId, {
      summaryId: summary.id,
      messageCount,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
    })

    return this.toPublicSummary(summary)
  }

  async processDue(input: ProcessDueGroupSummariesInput = {}) {
    const now = input.now ?? new Date()
    const limit = Math.max(1, Math.min(input.limit ?? 10, 50))
    const candidates = await db
      .select()
      .from(agentGroups)
      .where(and(
        eq(agentGroups.status, 'active'),
        eq(agentGroups.summaryEnabled, true),
      ))
      .orderBy(asc(agentGroups.lastSummaryAt), asc(agentGroups.updatedAt))
      .limit(limit * 4)

    const processed = []
    for (const group of candidates) {
      if (processed.length >= limit) break
      if (!this.isGroupSummaryDue(group, now)) continue
      processed.push(await this.runSummarySchedule(group, now))
    }

    return {
      checkedAt: now,
      processed: processed.length,
      groups: processed,
    }
  }

  async listDigestStatus(limit = 50) {
    const rows = await db
      .select()
      .from(agentGroups)
      .where(eq(agentGroups.status, 'active'))
      .orderBy(desc(agentGroups.updatedAt))
      .limit(Math.max(1, Math.min(limit, 100)))

    const groups = []
    for (const group of rows) {
      const [messageCount, summaries, recentMessages] = await Promise.all([
        this.countMessages(group.id),
        this.listSummaries(group.id, 1),
        this.listMessages(group.id, 3),
      ])
      const nextRunAt = group.summaryEnabled && group.summaryCronExpr
        ? this.nextFromSupportedCron(
          group.summaryCronExpr,
          group.summaryTimezone,
          group.lastSummaryAt ?? group.createdAt ?? new Date(0),
          false,
        )
        : null
      const latestSummary = summaries[0] ?? null
      const metadata = latestSummary?.metadata && typeof latestSummary.metadata === 'object'
        ? latestSummary.metadata as Record<string, unknown>
        : null

      groups.push({
        ...this.toPublicGroup(group),
        messageCount,
        nextRunAt,
        digestDue: Boolean(nextRunAt && nextRunAt <= new Date()),
        latestSummary,
        latestSummaryStatus: typeof metadata?.status === 'string' ? metadata.status : null,
        latestDeliveryStatus: typeof metadata?.deliveryStatus === 'string' ? metadata.deliveryStatus : null,
        latestDeliveryMessage: typeof metadata?.deliveryMessage === 'string' ? metadata.deliveryMessage : null,
        recentMessages,
      })
    }

    return {
      groups,
      total: groups.length,
      enabled: groups.filter((group) => group.summaryEnabled).length,
      due: groups.filter((group) => group.digestDue).length,
    }
  }

  async findGroup(channelType: AgentChannelType, externalId: string) {
    const [group] = await db
      .select()
      .from(agentGroups)
      .where(and(
        eq(agentGroups.channelType, channelType),
        eq(agentGroups.externalId, this.normalizeExternalId(externalId)),
      ))
      .limit(1)

    return group ?? null
  }

  private async listMembers(groupId: string) {
    const rows = await db
      .select()
      .from(agentGroupMembers)
      .where(eq(agentGroupMembers.groupId, groupId))
      .orderBy(desc(agentGroupMembers.createdAt))
      .limit(50)
    return rows.map((row) => this.toPublicMember(row))
  }

  private async listMessages(groupId: string, limit = 20) {
    const rows = await db
      .select()
      .from(agentGroupMessages)
      .where(eq(agentGroupMessages.groupId, groupId))
      .orderBy(desc(agentGroupMessages.occurredAt))
      .limit(Math.max(1, Math.min(limit, 100)))
    return rows.map((row) => this.toPublicMessage(row)).reverse()
  }

  private async listSummaries(groupId: string, limit = 5) {
    const rows = await db
      .select()
      .from(agentGroupSummaries)
      .where(eq(agentGroupSummaries.groupId, groupId))
      .orderBy(desc(agentGroupSummaries.createdAt))
      .limit(Math.max(1, Math.min(limit, 25)))
    return rows.map((row) => this.toPublicSummary(row))
  }

  private async listMessagesForPeriod(groupId: string, from: Date, to: Date, limit = 100) {
    const rows = await db
      .select()
      .from(agentGroupMessages)
      .where(and(
        eq(agentGroupMessages.groupId, groupId),
        gte(agentGroupMessages.occurredAt, from),
        lte(agentGroupMessages.occurredAt, to),
      ))
      .orderBy(asc(agentGroupMessages.occurredAt))
      .limit(Math.max(1, Math.min(limit, 500)))
    return rows
  }

  private async countMessages(groupId: string, from?: Date, to?: Date) {
    const conditions = [
      eq(agentGroupMessages.groupId, groupId),
      from ? gte(agentGroupMessages.occurredAt, from) : undefined,
      to ? lte(agentGroupMessages.occurredAt, to) : undefined,
    ]
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentGroupMessages)
      .where(and(...conditions))
    return row?.count ?? 0
  }

  private normalizeExternalId(value: string) {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('Group externalId is required')
    return trimmed.toLowerCase()
  }

  private isGroupSummaryDue(group: GroupRow, now: Date) {
    if (!group.summaryEnabled || !group.summaryCronExpr) return false
    const lastRun = group.lastSummaryAt ?? group.createdAt ?? new Date(0)
    const nextRunAt = this.nextFromSupportedCron(
      group.summaryCronExpr,
      group.summaryTimezone,
      lastRun,
      false,
    )
    return Boolean(nextRunAt && nextRunAt <= now)
  }

  private async runSummarySchedule(group: GroupRow, now: Date) {
    const periodEnd = now
    const periodStart = group.lastSummaryAt ??
      this.previousPeriodStart(group.summaryCronExpr, group.summaryTimezone, now) ??
      new Date(now.getTime() - 24 * 60 * 60 * 1000)

    let status: 'generated' | 'skipped' | 'failed' = 'generated'
    let message = 'Group digest saved.'
    let summaryId: string | null = null
    let messageCount = 0

    try {
      const messages = await this.listMessagesForPeriod(group.id, periodStart, periodEnd, 100)
      messageCount = messages.length
      if (messages.length === 0) {
        status = 'skipped'
        message = 'No group messages found for this digest period.'
      }

      const digest = this.renderDigest(group, messages, periodStart, periodEnd, status)
      const summary = await this.saveSummary(group.id, {
        title: this.digestTitle(group, periodStart, periodEnd),
        summary: digest,
        periodStart,
        periodEnd,
        messageCount,
        source: 'worker',
        metadata: {
          status,
          message,
          digestTarget: group.digestTarget,
          generatedBy: 'group_summary_worker',
          deliveryStatus: 'delivery_skipped',
          deliveryMessage: 'Automated group digest delivery is pending the live OpenClaw WhatsApp group delivery adapter.',
        },
      }, { type: 'system' })
      summaryId = summary.id
    } catch (error) {
      status = 'failed'
      message = error instanceof Error ? error.message : String(error)
      await this.audit({ type: 'system' }, 'agent_group.summary_failed', group.id, {
        periodStart,
        periodEnd,
        message,
      })
    }

    return {
      groupId: group.id,
      groupExternalId: group.externalId,
      groupName: group.name,
      status,
      message,
      summaryId,
      messageCount,
      periodStart,
      periodEnd,
    }
  }

  private digestTitle(group: GroupRow, periodStart: Date, periodEnd: Date) {
    return `${group.name} digest (${periodStart.toISOString()} - ${periodEnd.toISOString()})`
  }

  private renderDigest(
    group: GroupRow,
    messages: GroupMessageRow[],
    periodStart: Date,
    periodEnd: Date,
    status: 'generated' | 'skipped' | 'failed',
  ) {
    if (status === 'skipped') {
      return [
        `No new messages were recorded for ${group.name}.`,
        `Period: ${periodStart.toISOString()} - ${periodEnd.toISOString()}.`,
      ].join('\n')
    }

    const participants = Array.from(new Set(messages
      .map((message) => message.senderDisplayName || message.senderContactValue || 'Unknown')
      .filter(Boolean))).slice(0, 12)
    const highlights = messages.slice(-8).map((message) => {
      const sender = message.senderDisplayName || message.senderContactValue || 'Unknown'
      const body = message.body.length > 180 ? `${message.body.slice(0, 177)}...` : message.body
      return `- ${sender}: ${body}`
    })

    return [
      `Digest for ${group.name}`,
      `Period: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
      `Messages recorded: ${messages.length}`,
      participants.length > 0 ? `Participants: ${participants.join(', ')}` : 'Participants: none recorded',
      '',
      'Recent highlights:',
      ...highlights,
    ].join('\n')
  }

  private previousPeriodStart(cronExpr: string | null, timezone: string, now: Date) {
    if (!cronExpr) return null
    const next = this.nextFromSupportedCron(cronExpr, timezone, now, true)
    if (!next) return null
    const parts = cronExpr.trim().split(/\s+/)
    const dayOfMonthRaw = parts[2]
    const dayOfWeekRaw = parts[4]
    const days = dayOfMonthRaw !== '*' ? 31 : dayOfWeekRaw !== '*' ? 7 : 1
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
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

  private toPublicGroup(row: GroupRow) {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) as unknown : null,
    }
  }

  private toPublicMember(row: GroupMemberRow) {
    return row
  }

  private toPublicMessage(row: GroupMessageRow) {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) as unknown : null,
    }
  }

  private toPublicSummary(row: GroupSummaryRow) {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) as unknown : null,
    }
  }

  private async audit(
    actor: GroupActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'agent_group',
      targetId,
      metadata: JSON.stringify(metadata),
    })
  }
}

export const groupContextService = new GroupContextService()

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
