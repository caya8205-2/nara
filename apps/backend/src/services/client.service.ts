import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLogs, clientContacts, clients } from '../db/schema.js'

export type ClientContactType = 'email' | 'phone' | 'whatsapp' | 'other'
export type ClientActorType = 'admin' | 'user' | 'agent' | 'system'

export interface ClientAccess {
  userId?: string | null
}

export interface ClientActor {
  type: ClientActorType
  id?: string | null
}

export interface CreateClientInput {
  userId?: string | null
  name: string
  company?: string | null
  contactInfo?: string | null
  notes?: string | null
  status?: string
}

export interface UpdateClientInput {
  name?: string
  company?: string | null
  contactInfo?: string | null
  notes?: string | null
  status?: string
}

export interface CreateClientContactInput {
  clientId: string
  type: ClientContactType
  value: string
  label?: string | null
  isPrimary?: boolean
  notes?: string | null
}

export interface UpdateClientContactInput {
  type?: ClientContactType
  value?: string
  label?: string | null
  isPrimary?: boolean
  notes?: string | null
}

type ClientRow = typeof clients.$inferSelect
type ClientContactRow = typeof clientContacts.$inferSelect

export class ClientService {
  async list(access?: ClientAccess) {
    const rows = await db
      .select()
      .from(clients)
      .where(this.accessCondition(access))
      .orderBy(desc(clients.createdAt))

    return this.withContacts(rows)
  }

  async getById(id: string, access?: ClientAccess) {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), this.accessCondition(access)))

    if (!client) return null
    const [withContact] = await this.withContacts([client])
    return withContact ?? null
  }

  async create(input: CreateClientInput, actor: ClientActor) {
    const [client] = await db
      .insert(clients)
      .values({
        userId: input.userId ?? null,
        name: input.name,
        company: input.company ?? null,
        contactInfo: input.contactInfo ?? null,
        notes: input.notes ?? null,
        status: input.status ?? 'active',
      })
      .returning()

    await this.audit(actor, 'client.created', client.id, {
      userId: client.userId,
      status: client.status,
    })

    const [withContact] = await this.withContacts([client])
    return withContact
  }

  async update(id: string, input: UpdateClientInput, access: ClientAccess | undefined, actor: ClientActor) {
    const [client] = await db
      .update(clients)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), this.accessCondition(access)))
      .returning()

    if (!client) return null

    await this.audit(actor, 'client.updated', client.id, {
      userId: client.userId,
      status: client.status,
    })

    const [withContact] = await this.withContacts([client])
    return withContact
  }

  async delete(id: string, access: ClientAccess | undefined, actor: ClientActor) {
    const existing = await this.getById(id, access)
    if (!existing) return null

    await db
      .delete(clientContacts)
      .where(eq(clientContacts.clientId, id))

    const [client] = await db
      .delete(clients)
      .where(and(eq(clients.id, id), this.accessCondition(access)))
      .returning()

    if (!client) return null

    await this.audit(actor, 'client.deleted', client.id, {
      userId: client.userId,
      contactCount: existing.contacts.length,
    })

    return client
  }

  async addContact(input: CreateClientContactInput, access: ClientAccess | undefined, actor: ClientActor) {
    const client = await this.getById(input.clientId, access)
    if (!client) return null

    if (input.isPrimary) {
      await this.clearPrimaryContact(input.clientId)
    }

    const [contact] = await db
      .insert(clientContacts)
      .values({
        clientId: input.clientId,
        type: input.type,
        value: input.value,
        label: input.label ?? null,
        isPrimary: input.isPrimary ?? false,
        notes: input.notes ?? null,
      })
      .returning()

    await this.audit(actor, 'client_contact.created', contact.id, {
      clientId: input.clientId,
      type: contact.type,
      isPrimary: contact.isPrimary,
    })

    return contact
  }

  async updateContact(
    clientId: string,
    contactId: string,
    input: UpdateClientContactInput,
    access: ClientAccess | undefined,
    actor: ClientActor,
  ) {
    const client = await this.getById(clientId, access)
    if (!client) return null

    if (input.isPrimary) {
      await this.clearPrimaryContact(clientId)
    }

    const [contact] = await db
      .update(clientContacts)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientContacts.id, contactId),
        eq(clientContacts.clientId, clientId),
      ))
      .returning()

    if (!contact) return null

    await this.audit(actor, 'client_contact.updated', contact.id, {
      clientId,
      type: contact.type,
      isPrimary: contact.isPrimary,
    })

    return contact
  }

  async deleteContact(clientId: string, contactId: string, access: ClientAccess | undefined, actor: ClientActor) {
    const client = await this.getById(clientId, access)
    if (!client) return null

    const [contact] = await db
      .delete(clientContacts)
      .where(and(
        eq(clientContacts.id, contactId),
        eq(clientContacts.clientId, clientId),
      ))
      .returning()

    if (!contact) return null

    await this.audit(actor, 'client_contact.deleted', contact.id, {
      clientId,
      type: contact.type,
    })

    return contact
  }

  private async withContacts(rows: ClientRow[]) {
    if (rows.length === 0) return []

    const contacts = await db
      .select()
      .from(clientContacts)
      .where(inArray(clientContacts.clientId, rows.map((client) => client.id)))
      .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt))

    const byClientId = new Map<string, ClientContactRow[]>()
    for (const contact of contacts) {
      const current = byClientId.get(contact.clientId) ?? []
      current.push(contact)
      byClientId.set(contact.clientId, current)
    }

    return rows.map((client) => ({
      ...client,
      contacts: byClientId.get(client.id) ?? [],
    }))
  }

  private accessCondition(access?: ClientAccess) {
    if (!access || !Object.prototype.hasOwnProperty.call(access, 'userId')) return undefined
    return access.userId === null ? isNull(clients.userId) : eq(clients.userId, access.userId!)
  }

  private async clearPrimaryContact(clientId: string) {
    await db
      .update(clientContacts)
      .set({
        isPrimary: false,
        updatedAt: new Date(),
      })
      .where(eq(clientContacts.clientId, clientId))
  }

  private async audit(
    actor: ClientActor,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id ?? null,
      action,
      targetType: 'client',
      targetId,
      metadata: JSON.stringify(metadata),
    })
  }
}

export const clientService = new ClientService()
