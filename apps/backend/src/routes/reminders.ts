import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authzService } from '../services/authz.service.js'
import type { ReminderAccess, ReminderActor } from '../services/reminder.service.js'
import { reminderService } from '../services/reminder.service.js'

const ReminderKindSchema = z.enum(['once', 'recurring'])

const CreateReminderSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  kind: ReminderKindSchema,
  scheduledAt: z.string().datetime().nullable().optional(),
  cronExpr: z.string().trim().min(1).nullable().optional(),
  timezone: z.string().trim().min(1).default('Asia/Jakarta'),
}).superRefine((value, ctx) => {
  if (value.kind === 'once' && !value.scheduledAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: 'One-time reminders require scheduledAt' })
  }
  if (value.kind === 'recurring' && !value.cronExpr) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cronExpr'], message: 'Recurring reminders require cronExpr' })
  }
})

const UpdateReminderSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  cronExpr: z.string().trim().min(1).nullable().optional(),
  timezone: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = authzService.requireSession.bind(authzService)
  const requireOperator = authzService.requireOperator.bind(authzService)

  const access = (req: FastifyRequest): ReminderAccess => ({
    ...authzService.legacyOperatorGlobalAccess(authzService.session(req)),
  })

  const actor = (req: FastifyRequest): ReminderActor => ({
    ...authzService.actor(authzService.session(req)),
  })

  app.get('/', { preHandler: requireSession }, async (req) => {
    return reminderService.list(access(req))
  })

  app.get('/execution', { preHandler: requireSession }, async (req) => {
    return reminderService.getExecutionSummary(access(req))
  })

  app.post('/process-due', { preHandler: requireOperator }, async () => {
    return reminderService.processDue()
  })

  app.get('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const reminder = await reminderService.getById(id, access(req))
    if (!reminder) return reply.status(404).send({ error: 'Reminder not found' })
    return reminder
  })

  app.post('/', { preHandler: requireSession }, async (req, reply) => {
    const body = CreateReminderSchema.parse(req.body)
    const session = authzService.session(req)
    const reminder = await reminderService.create({
      name: body.name,
      description: body.description,
      kind: body.kind,
      userId: session.accountType === 'user' ? session.sub : null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      cronExpr: body.cronExpr,
      timezone: body.timezone,
      source: session.accountType === 'user' ? 'manual' : 'admin',
    }, actor(req))
    return reply.status(201).send(reminder)
  })

  app.patch('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateReminderSchema.parse(req.body)
    const reminder = await reminderService.update(id, {
      name: body.name,
      description: body.description,
      scheduledAt: body.scheduledAt === undefined
        ? undefined
        : body.scheduledAt === null ? null : new Date(body.scheduledAt),
      cronExpr: body.cronExpr,
      timezone: body.timezone,
      enabled: body.enabled,
    }, access(req), actor(req))
    if (!reminder) return reply.status(404).send({ error: 'Reminder not found' })
    return reminder
  })

  app.delete('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const reminder = await reminderService.delete(id, access(req), actor(req))
    if (!reminder) return reply.status(404).send({ error: 'Reminder not found' })
    return reply.status(204).send()
  })
}

export default plugin
