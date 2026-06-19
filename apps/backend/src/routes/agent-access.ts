import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { identityService } from '../services/identity.service.js'
import { authzService } from '../services/authz.service.js'

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
  const requireOperator = authzService.requireOperator.bind(authzService)

  app.get('/', { preHandler: requireOperator }, async () => identityService.listAgentAccess())

  app.patch('/:id', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateAccessSchema.parse(req.body)
    const access = body.status === 'allowed'
      ? await identityService.approveAgentAccess(id)
      : body.status === 'blocked'
        ? await identityService.blockAgentAccess(id)
        : await identityService.updateAgentAccess(id, body)
    if (!access) return reply.status(404).send({ error: 'Agent access record not found' })
    return access
  })

  app.post('/:id/retry-sync', { preHandler: requireOperator }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const access = await identityService.retryAgentAccessSync(id)
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
