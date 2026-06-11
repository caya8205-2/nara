import { and, desc, eq } from 'drizzle-orm'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '../db/index.js'
import {
  agentChannelAccess,
  agentChannels,
  auditLogs,
  userContacts,
  users,
} from '../db/schema.js'

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
