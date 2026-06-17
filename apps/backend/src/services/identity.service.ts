import { and, desc, eq } from 'drizzle-orm'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '../db/index.js'
import { env } from '../config/env.js'
import {
  agentChannelAccess,
  agentChannels,
  assistantProfiles,
  auditLogs,
  userContacts,
  users,
} from '../db/schema.js'
import { openClawService } from './openclaw.service.js'

const scrypt = promisify(scryptCallback)
const passwordKeyLength = 64

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
  password?: string
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

export interface AssistantProfileInput {
  tone?: string
  autonomy?: string
  customPersonality?: string
  allowTaskCreation?: boolean
  allowReminderDrafts?: boolean
  allowSensitiveActions?: boolean
}

const defaultAssistantProfile = (userId: string) => ({
  userId,
  tone: 'Balanced',
  autonomy: 'Confirm',
  customPersonality: '',
  allowTaskCreation: true,
  allowReminderDrafts: true,
  allowSensitiveActions: false,
})

export class IdentityService {
  async createUser(input: CreateUserInput) {
    const email = input.email?.toLowerCase()
    const passwordHash = input.password
      ? await this.hashPassword(input.password)
      : null

    const [user] = await db
      .insert(users)
      .values({
        displayName: input.displayName,
        email: email ?? null,
        passwordHash,
        role: input.role ?? 'user',
      })
      .returning()

    await this.audit('system', 'user.created', 'user', user.id, {
      role: user.role,
    })

    return this.toPublicUser(user)
  }

  async listUsers() {
    const rows = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
    return rows.map((user) => this.toPublicUser(user))
  }

  async getUserById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
    return user ? this.toPublicUser(user) : null
  }

  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
    return user ?? null
  }

  async registerUser(input: { displayName: string; email: string; password: string }) {
    const existing = await this.getUserByEmail(input.email)
    if (existing) return null

    return this.createUser({
      displayName: input.displayName,
      email: input.email,
      password: input.password,
      role: 'user',
    })
  }

  async verifyUserPassword(email: string, password: string) {
    const user = await this.getUserByEmail(email)
    if (!user || user.disabled || !user.passwordHash) return null

    const valid = await this.verifyPassword(password, user.passwordHash)
    if (!valid) return null

    return this.toPublicUser(user)
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

  async findUserByContact(input: { type: ContactType; value: string }) {
    const [row] = await db
      .select({
        user: users,
        contact: userContacts,
      })
      .from(userContacts)
      .innerJoin(users, eq(userContacts.userId, users.id))
      .where(
        and(
          eq(userContacts.type, input.type),
          eq(userContacts.value, input.value),
        )
      )

    if (!row) return null

    return {
      user: this.toPublicUser(row.user),
      contact: row.contact,
    }
  }

  async getAssistantProfile(userId: string) {
    const [profile] = await db
      .select()
      .from(assistantProfiles)
      .where(eq(assistantProfiles.userId, userId))

    return profile ?? defaultAssistantProfile(userId)
  }

  async updateAssistantProfile(userId: string, input: AssistantProfileInput) {
    const values = {
      ...defaultAssistantProfile(userId),
      ...input,
      userId,
      updatedAt: new Date(),
    }

    const [profile] = await db
      .insert(assistantProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: assistantProfiles.userId,
        set: {
          tone: values.tone,
          autonomy: values.autonomy,
          customPersonality: values.customPersonality,
          allowTaskCreation: values.allowTaskCreation,
          allowReminderDrafts: values.allowReminderDrafts,
          allowSensitiveActions: values.allowSensitiveActions,
          updatedAt: values.updatedAt,
        },
      })
      .returning()

    await this.audit('user', 'assistant_profile.updated', 'assistant_profile', profile.id, {
      userId,
      tone: profile.tone,
      autonomy: profile.autonomy,
    })

    return profile
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

    if (existing) return this.autoAllowlistRequest(existing)

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

    return this.autoAllowlistRequest(access)
  }

  async listAgentAccess() {
    const rows = await db
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

    return rows.map((row) => ({
      ...row.access,
      channel: row.channel,
      user: row.user,
      contact: row.contact,
    }))
  }

  async listAgentAccessByUser(userId: string) {
    const rows = await db
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
      .where(eq(agentChannelAccess.userId, userId))
      .orderBy(desc(agentChannelAccess.createdAt))

    return rows.map((row) => ({
      ...row.access,
      channel: row.channel,
      user: row.user,
      contact: row.contact,
    }))
  }

  async updateAgentAccess(id: string, input: UpdateAgentAccessInput) {
    const now = new Date()
    const [access] = await db
      .update(agentChannelAccess)
      .set({
        status: input.status,
        syncError: input.syncError ?? null,
        updatedAt: now,
        lastSyncAt: input.status === 'allowed' ||
          input.status === 'sync_failed' ||
          input.status === 'blocked' ||
          input.syncError !== undefined
          ? now
          : undefined,
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

  async approveAgentAccess(id: string) {
    const sync = await openClawService.syncWhatsAppAllowlist({
      override: { accessId: id, status: 'allowed' },
    })

    const access = await this.updateAgentAccess(id, {
      status: sync.ok ? 'allowed' : 'sync_failed',
      syncError: sync.ok ? undefined : sync.message,
    })
    if (!access) return null

    await this.audit('system', 'agent_access.allowlist_sync', 'agent_channel_access', access.id, {
      requestedStatus: 'allowed',
      sync,
    })

    return access
  }

  async retryAgentAccessSync(id: string) {
    return this.approveAgentAccess(id)
  }

  async blockAgentAccess(id: string) {
    const access = await this.updateAgentAccess(id, { status: 'blocked' })
    if (!access) return null

    const sync = await openClawService.syncWhatsAppAllowlist({
      override: { accessId: id, status: 'blocked' },
    })

    if (!sync.ok) {
      const updated = await this.updateAgentAccess(id, {
        status: 'blocked',
        syncError: sync.message,
      })
      if (!updated) return null
      await this.audit('system', 'agent_access.allowlist_sync', 'agent_channel_access', updated.id, {
        requestedStatus: 'blocked',
        sync,
      })
      return updated
    }

    await this.audit('system', 'agent_access.allowlist_sync', 'agent_channel_access', access.id, {
      requestedStatus: 'blocked',
      sync,
    })

    return access
  }

  async deleteAgentAccess(id: string, scope?: { userId?: string }) {
    const detail = await this.getAgentAccessDetail(id)
    const conditions = [eq(agentChannelAccess.id, id)]
    if (scope?.userId) {
      conditions.push(eq(agentChannelAccess.userId, scope.userId))
    }

    const [access] = await db
      .delete(agentChannelAccess)
      .where(and(...conditions))
      .returning()

    if (!access) return null

    await this.audit('system', 'agent_access.deleted', 'agent_channel_access', access.id, {
      userId: access.userId,
      contactId: access.contactId,
      status: access.status,
    })

    if (detail?.channel.type === 'whatsapp') {
      try {
        await this.syncOpenClawAllowlist()
      } catch (error) {
        await this.audit('system', 'agent_access.sync_failed', 'agent_channel_access', access.id, {
          userId: access.userId,
          contactId: access.contactId,
          error: error instanceof Error ? error.message : 'OpenClaw allowlist sync failed',
        })
      }
    }

    return access
  }

  private async autoAllowlistRequest<T extends { id: string; status: AgentAccessStatus }>(access: T) {
    if (!env.OPENCLAW_AUTO_ALLOWLIST_REQUESTS) return access
    if (access.status === 'allowed' || access.status === 'blocked') return access

    const detail = await this.getAgentAccessDetail(access.id)
    if (!detail || detail.channel.type !== 'whatsapp' || detail.contact.type !== 'whatsapp') {
      return access
    }

    const now = new Date()
    const [allowedAccess] = await db
      .update(agentChannelAccess)
      .set({
        status: 'allowed',
        syncError: null,
        allowedAt: now,
        updatedAt: now,
      })
      .where(eq(agentChannelAccess.id, access.id))
      .returning()

    if (!allowedAccess) return access

    try {
      await this.syncOpenClawAllowlist()
      const [syncedAccess] = await db
        .update(agentChannelAccess)
        .set({
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChannelAccess.id, allowedAccess.id))
        .returning()
      return syncedAccess ?? allowedAccess
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenClaw allowlist sync failed'
      const [failedAccess] = await db
        .update(agentChannelAccess)
        .set({
          status: 'sync_failed',
          syncError: message,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChannelAccess.id, allowedAccess.id))
        .returning()
      return failedAccess ?? allowedAccess
    }
  }

  private async syncOpenClawAllowlistAfterStatusChange(accessId: string, status: AgentAccessStatus) {
    const detail = await this.getAgentAccessDetail(accessId)
    if (!detail || detail.channel.type !== 'whatsapp') return null

    try {
      await this.syncOpenClawAllowlist()
      if (status === 'allowed') {
        const [syncedAccess] = await db
          .update(agentChannelAccess)
          .set({
            syncError: null,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(agentChannelAccess.id, accessId))
          .returning()
        return syncedAccess ?? null
      }
    } catch (error) {
      if (status !== 'allowed') throw error

      const message = error instanceof Error ? error.message : 'OpenClaw allowlist sync failed'
      const [failedAccess] = await db
        .update(agentChannelAccess)
        .set({
          status: 'sync_failed',
          syncError: message,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChannelAccess.id, accessId))
        .returning()
      return failedAccess ?? null
    }

    return null
  }

  private async syncOpenClawAllowlist() {
    const rows = await db
      .select({
        status: agentChannelAccess.status,
        channelType: agentChannels.type,
        contactType: userContacts.type,
        contactValue: userContacts.value,
      })
      .from(agentChannelAccess)
      .innerJoin(agentChannels, eq(agentChannelAccess.channelId, agentChannels.id))
      .innerJoin(userContacts, eq(agentChannelAccess.contactId, userContacts.id))

    const sync = await openClawService.syncWhatsAppAllowlist()
    if (!sync.ok) {
      throw new Error(sync.message)
    }
  }

  private async getAgentAccessDetail(id: string) {
    const [row] = await db
      .select({
        access: agentChannelAccess,
        channel: agentChannels,
        contact: userContacts,
      })
      .from(agentChannelAccess)
      .innerJoin(agentChannels, eq(agentChannelAccess.channelId, agentChannels.id))
      .innerJoin(userContacts, eq(agentChannelAccess.contactId, userContacts.id))
      .where(eq(agentChannelAccess.id, id))

    return row ?? null
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

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = (await scrypt(password, salt, passwordKeyLength)) as Buffer
    return `scrypt:${salt}:${derivedKey.toString('hex')}`
  }

  private async verifyPassword(password: string, passwordHash: string) {
    const [algorithm, salt, storedKey] = passwordHash.split(':')
    if (algorithm !== 'scrypt' || !salt || !storedKey) return false

    const derivedKey = (await scrypt(password, salt, passwordKeyLength)) as Buffer
    const storedBuffer = Buffer.from(storedKey, 'hex')
    if (storedBuffer.length !== derivedKey.length) return false

    return timingSafeEqual(storedBuffer, derivedKey)
  }

  private toPublicUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash: _passwordHash, ...publicUser } = user
    return publicUser
  }
}

export const identityService = new IdentityService()
