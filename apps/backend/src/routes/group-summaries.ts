import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import { groupContextService } from '../services/group-context.service.js'

const ProcessDueSchema = z.object({
  limit: z.number().int().positive().max(50).optional(),
}).optional()

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = authzService.requireOperator.bind(authzService)

  app.get('/', { preHandler: requireOperator }, async (req) => {
    const query = ListQuerySchema.parse(req.query)
    return groupContextService.listDigestStatus(query.limit)
  })

  app.post('/process-due', { preHandler: requireOperator }, async (req) => {
    const body = ProcessDueSchema.parse(req.body)
    return groupContextService.processDue({ limit: body?.limit })
  })
}

export default plugin
