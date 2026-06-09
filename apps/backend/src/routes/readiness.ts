import type { FastifyPluginAsync } from 'fastify'
import { readinessService } from '../services/readiness.service.js'

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/', async (req, reply) => {
    const report = await readinessService.getReport()
    return reply.status(report.ok ? 200 : 503).send(report)
  })
}

export default plugin
