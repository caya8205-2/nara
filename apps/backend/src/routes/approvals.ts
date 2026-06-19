import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import type { ApprovalAccess, ApprovalActor } from '../services/approval.service.js'
import { approvalService, type ApprovalStatus } from '../services/approval.service.js'

const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected'])

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = authzService.requireSession.bind(authzService)

  const access = (req: FastifyRequest): ApprovalAccess => ({
    ...authzService.userOwnedAccess(authzService.session(req)),
  })

  const actor = (req: FastifyRequest): ApprovalActor => ({
    ...authzService.actor(authzService.session(req)),
  })

  app.get('/', { preHandler: requireSession }, async (req) => {
    const query = z.object({
      status: ApprovalStatusSchema.default('pending'),
    }).parse(req.query ?? {})

    return approvalService.list(access(req), query.status as ApprovalStatus)
  })

  app.post('/:id/approve', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const approval = await approvalService.approve(id, access(req), actor(req))
    if (!approval) return reply.status(404).send({ error: 'Approval request not found' })
    return approval
  })

  app.post('/:id/reject', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const approval = await approvalService.reject(id, access(req), actor(req))
    if (!approval) return reply.status(404).send({ error: 'Approval request not found' })
    return approval
  })
}

export default plugin
