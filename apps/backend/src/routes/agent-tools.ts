import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { taskService } from '../services/task.service.js'

/**
 * Agent Tool Endpoints
 * Called by OpenClaw tool calling system.
 * All endpoints return { ok, data?, error? } for consistent agent parsing.
 */

const ok = (data: unknown) => ({ ok: true, data })
const fail = (error: string) => ({ ok: false, error })

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req, reply) => {
    const secret = req.headers['x-agent-secret']

    if (secret !== env.AGENT_API_SECRET) {
      return reply.status(401).send(fail('Unauthorized agent request'))
    }
  })

  // Tool: create_task
  app.post('/tasks/create', async (req, reply) => {
    try {
      const body = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        userId: z.string().uuid().optional(),
        dueAt: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      }).parse(req.body)

      const task = await taskService.create({
        title: body.title,
        description: body.description,
        userId: body.userId,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        priority: body.priority,
        source: 'agent',
      })

      return ok({ task, message: `Task "${task.title}" created.` })
    } catch (e: any) {
      return reply.status(400).send(fail(e.message))
    }
  })

  // Tool: list_tasks
  app.post('/tasks/list', async (req) => {
    const body = z.object({
      done: z.boolean().optional(),
      overdue: z.boolean().optional(),
      userId: z.string().uuid().optional(),
    }).parse(req.body ?? {})

    if (body.overdue) {
      const tasks = await taskService.list({
        done: false,
        dueBefore: new Date(),
        userId: body.userId,
      })
      return ok({ tasks, count: tasks.length })
    }

    const tasks = await taskService.list({
      ...(body.done !== undefined ? { done: body.done } : {}),
      userId: body.userId,
    })
    return ok({ tasks, count: tasks.length })
  })

  // Tool: complete_task
  app.post('/tasks/complete', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.body)
      const task = await taskService.complete(id)
      if (!task) return reply.status(404).send(fail('Task not found'))
      return ok({ task, message: `Task "${task.title}" marked as done.` })
    } catch (e: any) {
      return reply.status(400).send(fail(e.message))
    }
  })

  // Tool: delete_task
  app.post('/tasks/delete', async (req, reply) => {
    try {
      const body = z.object({
        id: z.string().uuid(),
        userId: z.string().uuid().nullable().optional(),
      }).parse(req.body)
      const access = Object.prototype.hasOwnProperty.call(body, 'userId')
        ? { userId: body.userId ?? null }
        : undefined
      const task = await taskService.delete(body.id, access)
      if (!task) return reply.status(404).send(fail('Task not found'))
      return ok({ message: `Task "${task.title}" deleted.` })
    } catch (e: any) {
      return reply.status(400).send(fail(e.message))
    }
  })

  // Tool: get_summary — buat laporan singkat buat agent
  app.post('/summary', async () => {
    const [pending, overdue] = await Promise.all([
      taskService.getPending(),
      taskService.getOverdue(),
    ])

    return ok({
      summary: {
        pendingTasks: pending.length,
        overdueTasks: overdue.length,
        nextDue: pending.find(t => t.dueAt)?.title ?? null,
      },
    })
  })
}

export default plugin
