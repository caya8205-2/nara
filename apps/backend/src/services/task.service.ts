import { eq, desc, and, isNull, lte } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tasks } from '../db/schema.js'

export interface CreateTaskInput {
  title: string
  description?: string
  dueAt?: Date
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  done?: boolean
  dueAt?: Date
}

export interface TaskFilter {
  done?: boolean
  dueBefore?: Date
}

export class TaskService {
  async create(input: CreateTaskInput) {
    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description ?? null,
        dueAt: input.dueAt ?? null,
      })
      .returning()
    return task
  }

  async list(filter?: TaskFilter) {
    const conditions = []

    if (filter?.done !== undefined) {
      conditions.push(eq(tasks.done, filter.done))
    }

    if (filter?.dueBefore) {
      conditions.push(lte(tasks.dueAt, filter.dueBefore))
    }

    return db
      .select()
      .from(tasks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
  }

  async getById(id: string) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
    return task ?? null
  }

  async update(id: string, input: UpdateTaskInput) {
    const [task] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
    return task ?? null
  }

  async complete(id: string) {
    return this.update(id, { done: true })
  }

  async delete(id: string) {
    const [task] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning()
    return task ?? null
  }

  async getPending() {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.done, false))
      .orderBy(tasks.dueAt)
  }

  async getOverdue() {
    return db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.done, false),
          lte(tasks.dueAt, new Date()),
        )
      )
  }
}

export const taskService = new TaskService()
