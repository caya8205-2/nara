import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { logService } from '../services/log.service.js'

const ListLogsQuerySchema = z.object({
  source: z.enum(['backend', 'database', 'redis', 'openclaw', 'agent', 'system']).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  app.get('/', { preHandler: requireOperator }, async (req) => {
    const query = ListLogsQuerySchema.parse(req.query)
    return logService.listLogs(query)
  })
}

export default plugin
