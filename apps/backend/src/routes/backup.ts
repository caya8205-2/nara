import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { backupService } from '../services/backup.service.js'
import { authzService } from '../services/authz.service.js'

const BackupTypeSchema = z.enum(['database', 'reports', 'config', 'full'])

const ExportSchema = z.object({
  type: BackupTypeSchema,
})

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireOperator = authzService.requireOperator.bind(authzService)

  app.post('/', { preHandler: requireOperator }, async () => {
    return backupService.createBackup('full')
  })

  app.post('/export', { preHandler: requireOperator }, async (req, reply) => {
    const body = ExportSchema.parse(req.body)

    try {
      const result = await backupService.createExport(body.type)
      return reply
        .header('Content-Type', 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .header('X-Backup-Id', result.record.id)
        .send(result.stream)
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  app.get('/history', { preHandler: requireOperator }, async (req) => {
    const query = HistoryQuerySchema.parse(req.query)
    return backupService.listHistory(query.limit)
  })
}

export default plugin
