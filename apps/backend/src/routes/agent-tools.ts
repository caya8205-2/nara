import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { identityService, type AgentChannelType } from '../services/identity.service.js'
import { approvalService, type ApprovalActionType, type ApprovalPayload } from '../services/approval.service.js'
import { contextService } from '../services/context.service.js'
import { groupContextService } from '../services/group-context.service.js'
import { reminderService, type ReminderKind } from '../services/reminder.service.js'
import { taskService, type TaskPriority } from '../services/task.service.js'

/**
 * Agent Tool Endpoints
 * Called by OpenClaw tool calling system.
 * Backend remains the source of truth; OpenClaw only orchestrates these tools.
 * All endpoints return { ok, data?, error? } for consistent agent parsing.
 */

const ok = (data: unknown) => ({ ok: true, data })
const fail = (error: string) => ({ ok: false, error })

const AgentSubjectSchema = z.object({
  userId: z.string().uuid().optional(),
  channelType: z.enum(['whatsapp', 'telegram']).default('whatsapp'),
  contactValue: z.string().min(1).optional(),
})

const AgentGroupSchema = z.object({
  groupExternalId: z.string().trim().min(1),
  groupName: z.string().trim().min(1).optional(),
  groupDescription: z.string().trim().nullable().optional(),
  groupChannelType: z.enum(['whatsapp', 'telegram']).default('whatsapp'),
})

const TaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

type AgentSubjectInput = z.infer<typeof AgentSubjectSchema>

type ResolvedAgentSubject = {
  userId: string
  user: Record<string, unknown>
  channelType: AgentChannelType
  contact?: unknown
  access: unknown[]
}

const parseSubject = (body: unknown) => AgentSubjectSchema.parse(body ?? {})

const accessStatus = (access: unknown) => {
  if (!access || typeof access !== 'object') return null
  const status = (access as { status?: unknown }).status
  return typeof status === 'string' ? status : null
}

const buildAgentInstructions = async (subject: ResolvedAgentSubject) => {
  const [profile, contextEntries] = await Promise.all([
    identityService.getAssistantProfile(subject.userId),
    contextService.getAgentContext(subject.userId, 10),
  ])
  const custom = profile.customPersonality.trim()
  const autonomyRules = {
    Suggest: 'Suggest actions and explain the next step. Do not call mutating tools unless the user explicitly asks again.',
    Confirm: 'Before creating, completing, deleting, or changing records, ask for confirmation. Tool calls should include confirmed: true only after confirmation.',
    Act: 'You may take allowed routine actions directly when the user intent is clear.',
  } as Record<string, string>

  return {
    profile,
    instructions: [
      'You are Nara Bot, a practical WhatsApp-first assistant for this specific Nara user.',
      `User display name: ${subject.user.displayName ?? 'Nara user'}.`,
      `Tone: ${profile.tone}.`,
      `Autonomy: ${profile.autonomy}. ${autonomyRules[profile.autonomy] ?? autonomyRules.Confirm}`,
      custom ? `Custom personality: ${custom}` : null,
      profile.allowTaskCreation
        ? 'You may create task drafts or tasks according to the autonomy rule.'
        : 'Do not create tasks for this user; offer a short suggestion instead.',
      profile.allowReminderDrafts
        ? 'You may draft reminders when the user asks.'
        : 'Do not draft reminders for this user.',
      profile.allowSensitiveActions
        ? 'Sensitive actions are allowed only when the user request is explicit.'
        : 'Sensitive actions must stay disabled and require a future approval flow.',
      'Always use Nara backend tools for stored data. Never claim a task was created, completed, or deleted unless the tool returned ok: true.',
      contextEntries.length > 0
        ? 'Use the provided business context entries when relevant, but do not reveal private notes unless needed to answer the user.'
        : null,
      'Respond in the same language the user uses.',
    ].filter(Boolean),
  }
}

const resolveSubject = async (
  input: AgentSubjectInput,
  reply: FastifyReply,
): Promise<ResolvedAgentSubject | null> => {
  if (input.userId) {
    const user = await identityService.getUserById(input.userId)
    if (!user) {
      reply.status(404).send(fail('Agent user not found'))
      return null
    }
    const access = await identityService.listAgentAccessByUser(input.userId)
    return {
      userId: input.userId,
      user: user as Record<string, unknown>,
      channelType: input.channelType,
      access,
    }
  }

  if (!input.contactValue) {
    reply.status(400).send(fail('Agent user context is required: provide userId or contactValue'))
    return null
  }

  if (input.channelType !== 'whatsapp') {
    reply.status(400).send(fail('Contact resolution currently supports WhatsApp only'))
    return null
  }

  const resolved = await identityService.findUserByContact({
    type: 'whatsapp',
    value: input.contactValue,
  })
  if (!resolved) {
    reply.status(404).send(fail('No Nara user is linked to that WhatsApp contact'))
    return null
  }

  const userId = String(resolved.user.id)
  const access = await identityService.listAgentAccessByUser(userId)
  const contactAccess = access.find((record) => {
    if (!record || typeof record !== 'object') return false
    return (record as { contactId?: unknown }).contactId === resolved.contact.id
  })

  if (accessStatus(contactAccess) !== 'allowed') {
    reply.status(403).send(fail('WhatsApp contact is not allowed to use Nara Bot yet'))
    return null
  }

  return {
    userId,
    user: resolved.user as Record<string, unknown>,
    channelType: input.channelType,
    contact: resolved.contact,
    access,
  }
}

const shouldRequireConfirmation = (autonomy: string) =>
  autonomy === 'Confirm' || autonomy === 'Suggest'

const requestApproval = async (input: {
  subject: ResolvedAgentSubject
  title: string
  actionType: ApprovalActionType
  payload: ApprovalPayload
  riskLevel?: 'low' | 'medium' | 'high'
}) => {
  const approval = await approvalService.create({
    userId: input.subject.userId,
    title: input.title,
    actionType: input.actionType,
    source: input.subject.channelType === 'whatsapp' ? 'whatsapp' : 'nara_bot',
    riskLevel: input.riskLevel ?? 'low',
    payload: input.payload,
  }, { type: 'agent', id: input.subject.userId })

  return ok({
    approvalRequired: true,
    approval,
    message: 'Approval request created. The user can approve or reject it in Nara.',
  })
}

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req, reply) => {
    const secret = req.headers['x-agent-secret']

    if (secret !== env.AGENT_API_SECRET) {
      return reply.status(401).send(fail('Unauthorized agent request'))
    }
  })

  // Tool: get_user_context
  app.post('/users/context', async (req, reply) => {
    try {
      const subject = await resolveSubject(parseSubject(req.body), reply)
      if (!subject) return

      const [{ profile, instructions }, tasks, overdue, reminders, reminderExecution, contextEntries] = await Promise.all([
        buildAgentInstructions(subject),
        taskService.list({ done: false, userId: subject.userId }),
        taskService.list({ done: false, dueBefore: new Date(), userId: subject.userId }),
        reminderService.list({ userId: subject.userId }),
        reminderService.getExecutionSummary({ userId: subject.userId }),
        contextService.getAgentContext(subject.userId, 12),
      ])

      return ok({
        user: subject.user,
        channelType: subject.channelType,
        contact: subject.contact ?? null,
        access: subject.access,
        assistantProfile: profile,
        businessContext: contextEntries,
        taskSummary: {
          pendingTasks: tasks.length,
          overdueTasks: overdue.length,
          nextDue: tasks.find((task) => task.dueAt)?.title ?? null,
        },
        reminderSummary: {
          activeReminders: reminders.filter((reminder) => reminder.enabled).length,
          pausedReminders: reminders.filter((reminder) => !reminder.enabled).length,
          recurringReminders: reminders.filter((reminder) => reminder.kind === 'recurring').length,
          nextRunAt: reminderExecution.nextRunAt,
          lastTriggeredAt: reminderExecution.lastTriggeredAt,
        },
        instructions,
        toolContext: {
          userId: subject.userId,
          channelType: subject.channelType,
          contactValue: req.body && typeof req.body === 'object'
            ? (req.body as { contactValue?: unknown }).contactValue ?? null
            : null,
          naraToolContractVersion: '2026-06-23',
          resolvedBy: 'get_user_context',
        },
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: get_group_context
  app.post('/groups/context', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.merge(AgentGroupSchema).parse(req.body ?? {})
      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const context = await groupContextService.getContext({
        channelType: body.groupChannelType,
        externalId: body.groupExternalId,
        name: body.groupName,
        description: body.groupDescription,
        metadata: {
          resolvedFrom: 'agent_tool',
          requesterUserId: subject.userId,
        },
      }, { type: 'agent', id: subject.userId })

      await groupContextService.addMember(
        context.group.id,
        subject.userId,
        'member',
        { type: 'agent', id: subject.userId },
      )

      return ok({
        ...context,
        requester: {
          userId: subject.userId,
          contact: subject.contact ?? null,
          channelType: subject.channelType,
        },
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: record_group_messages
  app.post('/groups/messages/record', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.merge(AgentGroupSchema).extend({
        messages: z.array(z.object({
          senderContactValue: z.string().trim().nullable().optional(),
          senderDisplayName: z.string().trim().nullable().optional(),
          body: z.string().trim().min(1),
          occurredAt: z.string().datetime().optional(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })).min(1).max(100),
      }).parse(req.body ?? {})
      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const context = await groupContextService.getContext({
        channelType: body.groupChannelType,
        externalId: body.groupExternalId,
        name: body.groupName,
        description: body.groupDescription,
      }, { type: 'agent', id: subject.userId })

      await groupContextService.addMember(context.group.id, subject.userId, 'member', {
        type: 'agent',
        id: subject.userId,
      })

      const result = await groupContextService.recordMessages(
        context.group.id,
        body.messages.map((message) => ({
          senderContactValue: message.senderContactValue,
          senderDisplayName: message.senderDisplayName,
          body: message.body,
          occurredAt: message.occurredAt ? new Date(message.occurredAt) : null,
          metadata: message.metadata ?? null,
        })),
        { type: 'agent', id: subject.userId },
      )

      return ok({
        group: context.group,
        ...result,
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: configure_group_summary
  app.post('/groups/summary/configure', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.merge(AgentGroupSchema).extend({
        summaryEnabled: z.boolean().optional(),
        summaryCronExpr: z.string().trim().nullable().optional(),
        summaryTimezone: z.string().trim().min(1).default('Asia/Jakarta'),
        digestTarget: z.enum(['group', 'owner', 'admin']).default('group'),
        confirmed: z.boolean().optional(),
      }).parse(req.body ?? {})
      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const profile = await identityService.getAssistantProfile(subject.userId)
      if (shouldRequireConfirmation(profile.autonomy) && body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: `Configure group summary: ${body.groupName ?? body.groupExternalId}`,
          actionType: 'configure_group_summary',
          payload: {
            actionType: 'configure_group_summary',
            input: {
              groupExternalId: body.groupExternalId,
              groupName: body.groupName,
              groupChannelType: body.groupChannelType,
              summaryEnabled: body.summaryEnabled,
              summaryCronExpr: body.summaryCronExpr,
              summaryTimezone: body.summaryTimezone,
              digestTarget: body.digestTarget,
            },
          } as ApprovalPayload,
          riskLevel: 'medium',
        }))
      }

      const context = await groupContextService.getContext({
        channelType: body.groupChannelType,
        externalId: body.groupExternalId,
        name: body.groupName,
        description: body.groupDescription,
      }, { type: 'agent', id: subject.userId })
      const group = await groupContextService.configureSummary(context.group.id, {
        summaryEnabled: body.summaryEnabled,
        summaryCronExpr: body.summaryCronExpr,
        summaryTimezone: body.summaryTimezone,
        digestTarget: body.digestTarget,
      }, { type: 'agent', id: subject.userId })

      if (!group) return reply.status(404).send(fail('Group not found'))
      return ok({
        group,
        message: 'Group summary settings saved in Nara.',
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: save_group_summary
  app.post('/groups/summary/save', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.merge(AgentGroupSchema).extend({
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        periodStart: z.string().datetime().nullable().optional(),
        periodEnd: z.string().datetime().nullable().optional(),
        messageCount: z.number().int().nonnegative().optional(),
        metadata: z.record(z.unknown()).nullable().optional(),
      }).parse(req.body ?? {})
      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const context = await groupContextService.getContext({
        channelType: body.groupChannelType,
        externalId: body.groupExternalId,
        name: body.groupName,
        description: body.groupDescription,
      }, { type: 'agent', id: subject.userId })

      const summary = await groupContextService.saveSummary(context.group.id, {
        title: body.title,
        summary: body.summary,
        periodStart: body.periodStart ? new Date(body.periodStart) : null,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
        messageCount: body.messageCount,
        metadata: body.metadata ?? null,
      }, { type: 'agent', id: subject.userId })

      return ok({
        group: context.group,
        summary,
        message: 'Group summary saved in Nara.',
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: create_reminder
  app.post('/reminders/create', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        name: z.string().trim().min(1),
        description: z.string().trim().optional(),
        kind: z.enum(['once', 'recurring']),
        scheduledAt: z.string().datetime().optional(),
        cronExpr: z.string().trim().min(1).optional(),
        timezone: z.string().trim().min(1).default('Asia/Jakarta'),
        confirmed: z.boolean().optional(),
      }).superRefine((value, ctx) => {
        if (value.kind === 'once' && !value.scheduledAt) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: 'One-time reminders require scheduledAt' })
        }
        if (value.kind === 'recurring' && !value.cronExpr) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cronExpr'], message: 'Recurring reminders require cronExpr' })
        }
      }).parse(req.body)

      const subject = await resolveSubject(body, reply)
      if (!subject) return
      const profile = await identityService.getAssistantProfile(subject.userId)
      if (!profile.allowReminderDrafts) {
        return reply.status(403).send(fail('Reminder creation is disabled for this user'))
      }
      if (shouldRequireConfirmation(profile.autonomy) && body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: `Create reminder: ${body.name}`,
          actionType: 'create_reminder',
          payload: {
            actionType: 'create_reminder',
            input: {
              name: body.name,
              description: body.description,
              kind: body.kind as ReminderKind,
              scheduledAt: body.scheduledAt,
              cronExpr: body.cronExpr ?? null,
              timezone: body.timezone,
            },
          },
        }))
      }

      const reminder = await reminderService.create({
        name: body.name,
        description: body.description,
        kind: body.kind as ReminderKind,
        userId: subject.userId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        cronExpr: body.cronExpr ?? null,
        timezone: body.timezone,
        source: 'agent',
      }, { type: 'agent', id: subject.userId })
      return ok({ reminder, message: `Reminder "${reminder.name}" created.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: list_reminders
  app.post('/reminders/list', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        enabled: z.boolean().optional(),
        kind: z.enum(['once', 'recurring']).optional(),
      }).parse(req.body ?? {})
      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const reminders = (await reminderService.list({ userId: subject.userId }))
        .filter((reminder) => body.enabled === undefined || reminder.enabled === body.enabled)
        .filter((reminder) => body.kind === undefined || reminder.kind === body.kind)
      return ok({ reminders, count: reminders.length })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: update_reminder
  app.post('/reminders/update', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        id: z.string().uuid(),
        name: z.string().trim().min(1).optional(),
        description: z.string().trim().nullable().optional(),
        scheduledAt: z.string().datetime().nullable().optional(),
        cronExpr: z.string().trim().min(1).nullable().optional(),
        timezone: z.string().trim().min(1).optional(),
        enabled: z.boolean().optional(),
        confirmed: z.boolean().optional(),
      }).parse(req.body)
      const subject = await resolveSubject(body, reply)
      if (!subject) return
      const profile = await identityService.getAssistantProfile(subject.userId)
      if (shouldRequireConfirmation(profile.autonomy) && body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: 'Update reminder',
          actionType: 'update_reminder',
          payload: {
            actionType: 'update_reminder',
            input: {
              id: body.id,
              name: body.name,
              description: body.description,
              scheduledAt: body.scheduledAt,
              cronExpr: body.cronExpr,
              timezone: body.timezone,
              enabled: body.enabled,
            },
          },
          riskLevel: body.enabled === false ? 'medium' : 'low',
        }))
      }

      const reminder = await reminderService.update(body.id, {
        name: body.name,
        description: body.description,
        scheduledAt: body.scheduledAt === undefined
          ? undefined
          : body.scheduledAt === null ? null : new Date(body.scheduledAt),
        cronExpr: body.cronExpr,
        timezone: body.timezone,
        enabled: body.enabled,
      }, { userId: subject.userId }, { type: 'agent', id: subject.userId })
      if (!reminder) return reply.status(404).send(fail('Reminder not found'))
      return ok({ reminder, message: `Reminder "${reminder.name}" updated.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: delete_reminder
  app.post('/reminders/delete', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        id: z.string().uuid(),
        confirmed: z.boolean().optional(),
      }).parse(req.body)
      const subject = await resolveSubject(body, reply)
      if (!subject) return
      if (body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: 'Delete reminder',
          actionType: 'delete_reminder',
          payload: {
            actionType: 'delete_reminder',
            input: { id: body.id },
          },
          riskLevel: 'high',
        }))
      }

      const reminder = await reminderService.delete(
        body.id,
        { userId: subject.userId },
        { type: 'agent', id: subject.userId },
      )
      if (!reminder) return reply.status(404).send(fail('Reminder not found'))
      return ok({ message: `Reminder "${reminder.name}" deleted.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: create_task
  app.post('/tasks/create', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        title: z.string().min(1),
        description: z.string().optional(),
        dueAt: z.string().datetime().optional(),
        priority: TaskPrioritySchema.optional(),
        confirmed: z.boolean().optional(),
      }).parse(req.body)

      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const profile = await identityService.getAssistantProfile(subject.userId)
      if (!profile.allowTaskCreation) {
        return reply.status(403).send(fail('Task creation is disabled for this user'))
      }
      if (shouldRequireConfirmation(profile.autonomy) && body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: `Create task: ${body.title}`,
          actionType: 'create_task',
          payload: {
            actionType: 'create_task',
            input: {
              title: body.title,
              description: body.description,
              dueAt: body.dueAt,
              priority: body.priority as TaskPriority | undefined,
            },
          },
        }))
      }

      const task = await taskService.create({
        title: body.title,
        description: body.description,
        userId: subject.userId,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        priority: body.priority as TaskPriority | undefined,
        source: 'agent',
      })

      return ok({ task, message: `Task "${task.title}" created.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: list_tasks
  app.post('/tasks/list', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        done: z.boolean().optional(),
        overdue: z.boolean().optional(),
      }).parse(req.body ?? {})

      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const tasks = await taskService.list({
        ...(body.done !== undefined ? { done: body.done } : {}),
        ...(body.overdue ? { done: false, dueBefore: new Date() } : {}),
        userId: subject.userId,
      })
      return ok({ tasks, count: tasks.length })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: complete_task
  app.post('/tasks/complete', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        id: z.string().uuid(),
        confirmed: z.boolean().optional(),
      }).parse(req.body)

      const subject = await resolveSubject(body, reply)
      if (!subject) return

      const profile = await identityService.getAssistantProfile(subject.userId)
      if (shouldRequireConfirmation(profile.autonomy) && body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: 'Complete task',
          actionType: 'complete_task',
          payload: {
            actionType: 'complete_task',
            input: { id: body.id },
          },
        }))
      }

      const task = await taskService.complete(body.id, { userId: subject.userId })
      if (!task) return reply.status(404).send(fail('Task not found'))
      return ok({ task, message: `Task "${task.title}" marked as done.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: delete_task
  app.post('/tasks/delete', async (req, reply) => {
    try {
      const body = AgentSubjectSchema.extend({
        id: z.string().uuid(),
        confirmed: z.boolean().optional(),
      }).parse(req.body)

      const subject = await resolveSubject(body, reply)
      if (!subject) return

      if (body.confirmed !== true) {
        return reply.status(202).send(await requestApproval({
          subject,
          title: 'Delete task',
          actionType: 'delete_task',
          payload: {
            actionType: 'delete_task',
            input: { id: body.id },
          },
          riskLevel: 'high',
        }))
      }

      const task = await taskService.delete(body.id, { userId: subject.userId })
      if (!task) return reply.status(404).send(fail('Task not found'))
      return ok({ message: `Task "${task.title}" deleted.` })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })

  // Tool: get_summary
  app.post('/summary', async (req, reply) => {
    try {
      const subject = await resolveSubject(parseSubject(req.body), reply)
      if (!subject) return

      const [pending, overdue] = await Promise.all([
        taskService.list({ done: false, userId: subject.userId }),
        taskService.list({ done: false, dueBefore: new Date(), userId: subject.userId }),
      ])

      return ok({
        summary: {
          userId: subject.userId,
          pendingTasks: pending.length,
          overdueTasks: overdue.length,
          nextDue: pending.find((task) => task.dueAt)?.title ?? null,
        },
      })
    } catch (e: unknown) {
      return reply.status(400).send(fail(e instanceof Error ? e.message : String(e)))
    }
  })
}

export default plugin
