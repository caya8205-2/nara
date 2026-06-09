import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { identityService } from '../services/identity.service.js'

const CreateUserSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
})

const AddContactSchema = z.object({
  type: z.enum(['whatsapp', 'email']),
  value: z.string().min(1),
  label: z.string().optional(),
})

const RequestAccessSchema = z.object({
  contactId: z.string().uuid(),
  channelType: z.enum(['whatsapp', 'telegram']).optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  app.get('/', { preHandler: requireOperator }, async () => identityService.listUsers())

  app.post('/', { preHandler: requireOperator }, async (req, reply) => {
    const body = CreateUserSchema.parse(req.body)
    const user = await identityService.createUser(body)
    return reply.status(201).send(user)
  })

  app.get('/:id', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await identityService.getUserById(id)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  app.get('/:id/contacts', { preHandler: requireOperator }, async (req) => {
    const { id } = req.params as { id: string }
    return identityService.listUserContacts(id)
  })

  app.post('/:id/contacts', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = AddContactSchema.parse(req.body)
    const contact = await identityService.addContact({
      userId: id,
      ...body,
    })
    if (!contact) return reply.status(404).send({ error: 'User not found' })
    return reply.status(201).send(contact)
  })

  app.post('/:id/agent-access', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = RequestAccessSchema.parse(req.body)
    const access = await identityService.requestAgentAccess({
      userId: id,
      contactId: body.contactId,
      channelType: body.channelType,
    })
    if (!access) return reply.status(404).send({ error: 'User contact not found' })
    return reply.status(201).send(access)
  })
}

export default plugin
