import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import type { ReportAccess, ReportActor } from '../services/report.service.js'
import { reportService } from '../services/report.service.js'

const ReportKindSchema = z.enum(['manual', 'daily', 'weekly'])
const ReportFrequencySchema = z.enum(['daily', 'weekly'])

const GenerateReportSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  kind: ReportKindSchema.default('manual'),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  deliver: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if ((value.periodStart && !value.periodEnd) || (!value.periodStart && value.periodEnd)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['periodStart'],
      message: 'periodStart and periodEnd must be provided together',
    })
  }
})

const CreateScheduleSchema = z.object({
  name: z.string().trim().min(1),
  userId: z.string().uuid().nullable().optional(),
  frequency: ReportFrequencySchema,
  timezone: z.string().trim().min(1).default('Asia/Jakarta'),
  enabled: z.boolean().default(true),
  deliver: z.boolean().default(true),
})

const UpdateScheduleSchema = z.object({
  name: z.string().trim().min(1).optional(),
  frequency: ReportFrequencySchema.optional(),
  timezone: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  deliver: z.boolean().optional(),
})

const ProcessDueSchema = z.object({
  limit: z.number().int().positive().max(50).optional(),
}).optional()

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = authzService.requireSession.bind(authzService)
  const requireOperator = authzService.requireOperator.bind(authzService)

  const access = (req: FastifyRequest): ReportAccess | undefined => (
    authzService.userOwnedAccess(authzService.session(req))
  )

  const actor = (req: FastifyRequest): ReportActor => ({
    ...authzService.actor(authzService.session(req)),
  })

  const requestedUserId = (req: FastifyRequest, userId?: string | null) => (
    authzService.requestedUserId(authzService.session(req), userId)
  )

  app.get('/', { preHandler: requireSession }, async (req) => {
    return reportService.list(access(req))
  })

  app.post('/generate', { preHandler: requireSession }, async (req, reply) => {
    const body = GenerateReportSchema.parse(req.body)
    const report = await reportService.generate({
      userId: requestedUserId(req, body.userId),
      kind: body.kind,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      deliver: body.deliver,
    }, actor(req))
    return reply.status(201).send(report)
  })

  app.get('/schedules', { preHandler: requireSession }, async (req) => {
    return reportService.listSchedules(access(req))
  })

  app.post('/schedules', { preHandler: requireSession }, async (req, reply) => {
    const body = CreateScheduleSchema.parse(req.body)
    const schedule = await reportService.createSchedule({
      name: body.name,
      userId: requestedUserId(req, body.userId),
      frequency: body.frequency,
      timezone: body.timezone,
      enabled: body.enabled,
      deliver: body.deliver,
    }, actor(req))
    return reply.status(201).send(schedule)
  })

  app.patch('/schedules/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateScheduleSchema.parse(req.body)
    const schedule = await reportService.updateSchedule(id, body, access(req), actor(req))
    if (!schedule) return reply.status(404).send({ error: 'Report schedule not found' })
    return schedule
  })

  app.delete('/schedules/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const schedule = await reportService.deleteSchedule(id, access(req), actor(req))
    if (!schedule) return reply.status(404).send({ error: 'Report schedule not found' })
    return reply.status(204).send()
  })

  app.post('/process-due', { preHandler: requireOperator }, async (req) => {
    const body = ProcessDueSchema.parse(req.body)
    return reportService.processDue({ limit: body?.limit })
  })

  app.get('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const report = await reportService.getById(id, access(req))
    if (!report) return reply.status(404).send({ error: 'Report not found' })
    return report
  })
}

export default plugin
