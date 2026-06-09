import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  agentChannelAccess,
  agentChannels,
  auditLogs,
  userContacts,
  users,
} from '../db/schema.js'

export type UserRole = 'admin' | 'user'
export type ContactType = 'whatsapp' | 'email'
export type AgentChannelType = 'whatsapp' | 'telegram'
export type AgentAccessStatus =
  | 'pending_verification'
  | 'pending_allowlist'
  | 'allowed'
  | 'blocked'
  | 'sync_failed'

export interface CreateUserInput {
  displayName: string
  email?: string
  role?: UserRole
}

export interface AddContactInput {
  userId: string
  type: ContactType
  value: string
  label?: string
}

export interface RequestAgentAccessInput {
  userId: string
  contactId: string
  channelType?: AgentChannelType
}

export interface UpdateAgentAccessInput {
  status: AgentAccessStatus
  syncError?: string
}

export class IdentityService {
  async createUser(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        displayName: input.displayName,
        email: input.email ?? null,
        role: input.role ?? 'user',
      })
      .returning()

    await this.audit('system', 'user.created', 'user', user.id, {
      role: user.role,
    })

    return user
  }

  async listUsers() {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
  }

  async getUserById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
    return user ?? null
  }

  async addContact(input: AddContactInput) {
    const user = await this.getUserById(input.userId)
    if (!user) return null

    const [contact] = await db
      .insert(userContacts)
      .values({
        userId: input.userId,
        type: input.type,
        value: input.value,
        label: input.label ?? null,
      })
      .returning()

    await this.audit('system', 'user_contact.created', 'user_contact', contact.id, {
      userId: input.userId,
      type: input.type,
    })

    return contact
  }

  async listUserContacts(userId: string) {
    return db
      .select()
      .from(userContacts)
      .where(eq(userContacts.userId, userId))
      .orderBy(desc(userContacts.createdAt))
  }

  async ensureAgentChannel(type: AgentChannelType) {
    const [existing] = await db
      .select()
      .from(agentChannels)
      .where(eq(agentChannels.type, type))

    if (existing) return existing

    const [channel] = await db
      .insert(agentChannels)
      .values({
        type,
        name: type === 'whatsapp' ? 'Nara Bot WhatsApp' : 'Nara Bot Telegram',
      })
      .returning()

    await this.audit('system', 'agent_channel.created', 'agent_channel', channel.id, {
      type,
    })

    return channel
  }

  async requestAgentAccess(input: RequestAgentAccessInput) {
    const channel = await this.ensureAgentChannel(input.channelType ?? 'whatsapp')
    const [contact] = await db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.id, input.contactId),
          eq(userContacts.userId, input.userId),
        )
      )

    if (!contact) return null

    const [existing] = await db
      .select()
      .from(agentChannelAccess)
      .where(
        and(
          eq(agentChannelAccess.channelId, channel.id),
          eq(agentChannelAccess.contactId, input.contactId),
        )
      )

    if (existing) return existing

    const [access] = await db
      .insert(agentChannelAccess)
      .values({
        channelId: channel.id,
        userId: input.userId,
        contactId: input.contactId,
        status: 'pending_allowlist',
      })
      .returning()

    await this.audit('system', 'agent_access.requested', 'agent_channel_access', access.id, {
      channelType: channel.type,
      userId: input.userId,
      contactId: input.contactId,
    })

    return access
  }

  async listAgentAccess() {
    return db
      .select({
        access: agentChannelAccess,
        channel: agentChannels,
        user: users,
        contact: userContacts,
      })
      .from(agentChannelAccess)
      .innerJoin(agentChannels, eq(agentChannelAccess.channelId, agentChannels.id))
      .innerJoin(users, eq(agentChannelAccess.userId, users.id))
      .innerJoin(userContacts, eq(agentChannelAccess.contactId, userContacts.id))
      .orderBy(desc(agentChannelAccess.createdAt))
  }

  async updateAgentAccess(id: string, input: UpdateAgentAccessInput) {
    const now = new Date()
    const [access] = await db
      .update(agentChannelAccess)
      .set({
        status: input.status,
        syncError: input.syncError ?? null,
        updatedAt: now,
        lastSyncAt: input.status === 'allowed' || input.status === 'sync_failed' ? now : undefined,
        allowedAt: input.status === 'allowed' ? now : undefined,
        blockedAt: input.status === 'blocked' ? now : undefined,
      })
      .where(eq(agentChannelAccess.id, id))
      .returning()

    if (!access) return null

    await this.audit('system', 'agent_access.updated', 'agent_channel_access', access.id, {
      status: input.status,
    })

    return access
  }

  private async audit(
    actorType: 'admin' | 'user' | 'agent' | 'system',
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
  }
}

export const identityService = new IdentityService()
