import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
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
