import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ApprovalAccess, ApprovalActor } from '../services/approval.service.js'
import { approvalService, type ApprovalStatus } from '../services/approval.service.js'

type SessionPayload = {
  sub: string
  role: string
  accountType?: 'operator' | 'user'
}

const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected'])

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.approvalSession = await req.jwtVerify<SessionPayload>()
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  const access = (req: FastifyRequest): ApprovalAccess => ({
    userId: req.approvalSession?.accountType === 'user'
      ? req.approvalSession.sub
      : null,
  })

  const actor = (req: FastifyRequest): ApprovalActor => ({
    type: req.approvalSession?.accountType === 'user' ? 'user' : 'admin',
    id: req.approvalSession?.accountType === 'user' ? req.approvalSession.sub : null,
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

declare module 'fastify' {
  interface FastifyRequest {
    approvalSession?: SessionPayload
  }
}
