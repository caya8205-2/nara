import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import { contextService, type ContextAccess, type ContextActor } from '../services/context.service.js'

const ContextKindSchema = z.enum(['note', 'preference', 'summary', 'instruction'])
const ContextImportanceSchema = z.enum(['low', 'normal', 'high'])

const ListContextQuerySchema = z.object({
  kind: ContextKindSchema.optional(),
  clientId: z.string().uuid().nullable().optional(),
  pinned: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

const CreateContextSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  kind: ContextKindSchema.default('note'),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  source: z.string().trim().min(1).default('manual'),
  importance: ContextImportanceSchema.default('normal'),
  pinned: z.boolean().default(false),
  metadata: z.record(z.unknown()).nullable().optional(),
})

const UpdateContextSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  kind: ContextKindSchema.optional(),
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  importance: ContextImportanceSchema.optional(),
  pinned: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = authzService.requireSession.bind(authzService)

  const access = (req: FastifyRequest): ContextAccess | undefined => (
    authzService.userOwnedAccess(authzService.session(req))
  )

  const actor = (req: FastifyRequest): ContextActor => ({
    ...authzService.actor(authzService.session(req)),
  })

  const requestedUserId = (req: FastifyRequest, userId?: string | null) => (
    authzService.requestedUserId(authzService.session(req), userId)
  )

  app.get('/', { preHandler: requireSession }, async (req) => {
    const query = ListContextQuerySchema.parse(req.query ?? {})
    return contextService.list(query, access(req))
  })

  app.post('/', { preHandler: requireSession }, async (req, reply) => {
    const body = CreateContextSchema.parse(req.body)
    const entry = await contextService.create({
      userId: requestedUserId(req, body.userId),
      clientId: body.clientId,
      kind: body.kind,
      title: body.title,
      body: body.body,
      source: body.source,
      importance: body.importance,
      pinned: body.pinned,
      metadata: body.metadata,
    }, access(req), actor(req))
    if (!entry) return reply.status(404).send({ error: 'Context target not found' })
    return reply.status(201).send(entry)
  })

  app.get('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const entry = await contextService.getById(id, access(req))
    if (!entry) return reply.status(404).send({ error: 'Context entry not found' })
    return entry
  })

  app.patch('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateContextSchema.parse(req.body)
    const entry = await contextService.update(id, body, access(req), actor(req))
    if (!entry) return reply.status(404).send({ error: 'Context entry not found' })
    return entry
  })

  app.delete('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const entry = await contextService.delete(id, access(req), actor(req))
    if (!entry) return reply.status(404).send({ error: 'Context entry not found' })
    return reply.status(204).send()
  })
}

export default plugin
