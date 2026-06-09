import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { identityService } from '../services/identity.service.js'

const UpdateAccessSchema = z.object({
  status: z.enum([
    'pending_verification',
    'pending_allowlist',
    'allowed',
    'blocked',
    'sync_failed',
  ]),
  syncError: z.string().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  app.get('/', { preHandler: requireOperator }, async () => identityService.listAgentAccess())

  app.patch('/:id', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateAccessSchema.parse(req.body)
    const access = await identityService.updateAgentAccess(id, body)
    if (!access) return reply.status(404).send({ error: 'Agent access record not found' })
    return access
  })
}

export default plugin
