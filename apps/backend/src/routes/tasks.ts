import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { TaskAccess, TaskPriority } from '../services/task.service.js'
import { taskService } from '../services/task.service.js'

type SessionPayload = {
  sub: string
  role: string
  accountType?: 'operator' | 'user'
}

const TaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: TaskPrioritySchema.optional(),
})

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  done: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: TaskPrioritySchema.optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const requireSession = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await req.jwtVerify<SessionPayload>()
      req.taskSession = payload
    } catch {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }

  const getAccess = (req: FastifyRequest): TaskAccess | undefined => {
    return req.taskSession?.accountType === 'user'
      ? { userId: req.taskSession.sub }
      : { userId: null }
  }

  // GET /api/tasks
  app.get('/', { preHandler: requireSession }, async (req) => {
    const query = req.query as { done?: string }
    const filter = query.done !== undefined
      ? { done: query.done === 'true' }
      : undefined
    return taskService.list({
      ...filter,
      userId: getAccess(req)?.userId,
    })
  })

  // GET /api/tasks/pending
  app.get('/pending', { preHandler: requireSession }, async (req) => {
    return taskService.list({
      done: false,
      userId: getAccess(req)?.userId,
    })
  })

  // GET /api/tasks/overdue
  app.get('/overdue', { preHandler: requireSession }, async (req) => {
    return taskService.list({
      done: false,
      dueBefore: new Date(),
      userId: getAccess(req)?.userId,
    })
  })

  // GET /api/tasks/:id
  app.get('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.getById(id, getAccess(req))
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // POST /api/tasks
  app.post('/', { preHandler: requireSession }, async (req, reply) => {
    const body = CreateTaskSchema.parse(req.body)
    const session = req.taskSession
    const isUser = session?.accountType === 'user'
    const task = await taskService.create({
      title: body.title,
      description: body.description,
      userId: isUser ? session.sub : null,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      priority: body.priority as TaskPriority | undefined,
      source: isUser ? 'manual' : 'admin',
    })
    return reply.status(201).send(task)
  })

  // PATCH /api/tasks/:id
  app.patch('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateTaskSchema.parse(req.body)
    const dueAt =
      body.dueAt === undefined
        ? undefined
        : body.dueAt === null
          ? null
          : new Date(body.dueAt)
    const task = await taskService.update(id, {
      title: body.title,
      description: body.description,
      done: body.done,
      dueAt,
      priority: body.priority,
    }, getAccess(req))
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // PATCH /api/tasks/:id/complete
  app.patch('/:id/complete', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.complete(id, getAccess(req))
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // DELETE /api/tasks/:id
  app.delete('/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.delete(id, getAccess(req))
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.status(204).send()
  })
}

export default plugin

declare module 'fastify' {
  interface FastifyRequest {
    taskSession?: SessionPayload
  }
}
