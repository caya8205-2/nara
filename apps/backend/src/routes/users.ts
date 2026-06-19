import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import { identityService } from '../services/identity.service.js'
import { taskService } from '../services/task.service.js'

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

const AssistantProfileSchema = z.object({
  tone: z.string().min(1).optional(),
  autonomy: z.string().min(1).optional(),
  customPersonality: z.string().optional(),
  allowTaskCreation: z.boolean().optional(),
  allowReminderDrafts: z.boolean().optional(),
  allowSensitiveActions: z.boolean().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requirePrivileged = authzService.requirePrivileged.bind(authzService)
  const requireUserOwnerOrPrivileged = authzService.requireUserOwnerOrPrivileged('id')

  app.get('/', { preHandler: requirePrivileged }, async () => identityService.listUsers())

  app.post('/', { preHandler: requirePrivileged }, async (req, reply) => {
    const body = CreateUserSchema.parse(req.body)
    const user = await identityService.createUser(body)
    return reply.status(201).send(user)
  })

  app.get('/:id', { preHandler: requireUserOwnerOrPrivileged }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await identityService.getUserById(id)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  app.get('/:id/contacts', { preHandler: requireUserOwnerOrPrivileged }, async (req) => {
    const { id } = req.params as { id: string }
    return identityService.listUserContacts(id)
  })

  app.get('/:id/assistant-profile', { preHandler: requireUserOwnerOrPrivileged }, async (req) => {
    const { id } = req.params as { id: string }
    return identityService.getAssistantProfile(id)
  })

  app.put('/:id/assistant-profile', { preHandler: requireUserOwnerOrPrivileged }, async (req) => {
    const { id } = req.params as { id: string }
    const body = AssistantProfileSchema.parse(req.body)
    return identityService.updateAssistantProfile(id, body)
  })

  app.get('/:id/agent-access', { preHandler: requireUserOwnerOrPrivileged }, async (req) => {
    const { id } = req.params as { id: string }
    return identityService.listAgentAccessByUser(id)
  })

  app.delete('/:id/tasks/:taskId', { preHandler: requirePrivileged }, async (req, reply) => {
    const { id, taskId } = req.params as { id: string; taskId: string }
    const task = await taskService.delete(taskId, { userId: id })
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.status(204).send()
  })

  app.post('/:id/contacts', { preHandler: requireUserOwnerOrPrivileged }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = AddContactSchema.parse(req.body)
    const contact = await identityService.addContact({
      userId: id,
      ...body,
    })
    if (!contact) return reply.status(404).send({ error: 'User not found' })
    return reply.status(201).send(contact)
  })

  app.post('/:id/agent-access', { preHandler: requireUserOwnerOrPrivileged }, async (req, reply) => {
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

  app.delete('/:id/agent-access/:accessId', { preHandler: requireUserOwnerOrPrivileged }, async (req, reply) => {
    const { id, accessId } = req.params as { id: string; accessId: string }
    const access = await identityService.deleteAgentAccess(accessId, { userId: id })
    if (!access) return reply.status(404).send({ error: 'Agent access record not found' })
    return reply.status(204).send()
  })
}

export default plugin
