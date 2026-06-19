import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import type { ClientAccess, ClientActor } from '../services/client.service.js'
import { clientService } from '../services/client.service.js'

const ClientStatusSchema = z.enum(['active', 'inactive', 'lead', 'archived'])
const ClientContactTypeSchema = z.enum(['email', 'phone', 'whatsapp', 'other'])

const CreateClientSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1),
  company: z.string().trim().nullable().optional(),
  contactInfo: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  status: ClientStatusSchema.default('active'),
})

const UpdateClientSchema = z.object({
  name: z.string().trim().min(1).optional(),
  company: z.string().trim().nullable().optional(),
  contactInfo: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  status: ClientStatusSchema.optional(),
})

const CreateContactSchema = z.object({
  type: ClientContactTypeSchema,
  value: z.string().trim().min(1),
  label: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().trim().nullable().optional(),
})

const UpdateContactSchema = z.object({
  type: ClientContactTypeSchema.optional(),
  value: z.string().trim().min(1).optional(),
  label: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().nullable().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = authzService.requireSession.bind(authzService)

  const access = (req: FastifyRequest): ClientAccess | undefined => (
    authzService.userOwnedAccess(authzService.session(req))
  )

  const actor = (req: FastifyRequest): ClientActor => ({
    ...authzService.actor(authzService.session(req)),
  })

  const requestedUserId = (req: FastifyRequest, userId?: string | null) => (
    authzService.requestedUserId(authzService.session(req), userId)
  )

  app.get('/', { preHandler: requireSession }, async (req) => {
    return clientService.list(access(req))
  })

  app.post('/', { preHandler: requireSession }, async (req, reply) => {
    const body = CreateClientSchema.parse(req.body)
    const client = await clientService.create({
      userId: requestedUserId(req, body.userId),
      name: body.name,
      company: body.company,
      contactInfo: body.contactInfo,
      notes: body.notes,
      status: body.status,
    }, actor(req))
    return reply.status(201).send(client)
  })

  app.get('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const client = await clientService.getById(id, access(req))
    if (!client) return reply.status(404).send({ error: 'Client not found' })
    return client
  })

  app.patch('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateClientSchema.parse(req.body)
    const client = await clientService.update(id, body, access(req), actor(req))
    if (!client) return reply.status(404).send({ error: 'Client not found' })
    return client
  })

  app.delete('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const client = await clientService.delete(id, access(req), actor(req))
    if (!client) return reply.status(404).send({ error: 'Client not found' })
    return reply.status(204).send()
  })

  app.post('/:id/contacts', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = CreateContactSchema.parse(req.body)
    const contact = await clientService.addContact({
      clientId: id,
      type: body.type,
      value: body.value,
      label: body.label,
      isPrimary: body.isPrimary,
      notes: body.notes,
    }, access(req), actor(req))
    if (!contact) return reply.status(404).send({ error: 'Client not found' })
    return reply.status(201).send(contact)
  })

  app.patch('/:id/contacts/:contactId', { preHandler: requireSession }, async (req, reply) => {
    const { id, contactId } = req.params as { id: string; contactId: string }
    const body = UpdateContactSchema.parse(req.body)
    const contact = await clientService.updateContact(id, contactId, body, access(req), actor(req))
    if (!contact) return reply.status(404).send({ error: 'Client contact not found' })
    return contact
  })

  app.delete('/:id/contacts/:contactId', { preHandler: requireSession }, async (req, reply) => {
    const { id, contactId } = req.params as { id: string; contactId: string }
    const contact = await clientService.deleteContact(id, contactId, access(req), actor(req))
    if (!contact) return reply.status(404).send({ error: 'Client contact not found' })
    return reply.status(204).send()
  })
}

export default plugin
