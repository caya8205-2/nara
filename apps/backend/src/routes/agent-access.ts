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

type AuthPayload = {
  accountType?: string
}

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await req.jwtVerify<AuthPayload>()
      if (payload.accountType !== 'operator') {
        return reply.status(403).send({ error: 'Operator access required' })
      }
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

  app.delete('/:id', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const access = await identityService.deleteAgentAccess(id)
    if (!access) return reply.status(404).send({ error: 'Agent access record not found' })
    return reply.status(204).send()
  })
}

export default plugin
