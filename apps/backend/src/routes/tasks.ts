import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { taskService } from '../services/task.service.js'

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime().optional(),
})

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  done: z.boolean().optional(),
  dueAt: z.string().datetime().optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  // GET /api/tasks
  app.get('/', async (req, reply) => {
    const query = req.query as { done?: string }
    const filter = query.done !== undefined
      ? { done: query.done === 'true' }
      : undefined
    return taskService.list(filter)
  })

  // GET /api/tasks/pending
  app.get('/pending', async () => taskService.getPending())

  // GET /api/tasks/overdue
  app.get('/overdue', async () => taskService.getOverdue())

  // GET /api/tasks/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.getById(id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // POST /api/tasks
  app.post('/', async (req, reply) => {
    const body = CreateTaskSchema.parse(req.body)
    const task = await taskService.create({
      ...body,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    })
    return reply.status(201).send(task)
  })

  // PATCH /api/tasks/:id
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateTaskSchema.parse(req.body)
    const task = await taskService.update(id, {
      ...body,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    })
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // PATCH /api/tasks/:id/complete
  app.patch('/:id/complete', async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.complete(id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return task
  })

  // DELETE /api/tasks/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const task = await taskService.delete(id)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.status(204).send()
  })
}

export default plugin
