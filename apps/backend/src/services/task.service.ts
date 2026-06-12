import { and, desc, eq, isNull, lte } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tasks } from '../db/schema.js'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskSource = 'manual' | 'admin' | 'agent' | 'scheduled'

export interface CreateTaskInput {
  title: string
  description?: string
  userId?: string | null
  dueAt?: Date
  priority?: TaskPriority
  source?: TaskSource
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  done?: boolean
  dueAt?: Date | null
  priority?: TaskPriority
}

export interface TaskFilter {
  done?: boolean
  dueBefore?: Date
  userId?: string | null
}

export interface TaskAccess {
  userId?: string | null
}

export class TaskService {
  async create(input: CreateTaskInput) {
    const [task] = await db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description ?? null,
        userId: input.userId ?? null,
        dueAt: input.dueAt ?? null,
        priority: input.priority ?? 'normal',
        source: input.source ?? 'manual',
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

    if (
      filter &&
      Object.prototype.hasOwnProperty.call(filter, 'userId') &&
      filter.userId !== undefined
    ) {
      conditions.push(
        filter.userId === null
          ? isNull(tasks.userId)
          : eq(tasks.userId, filter.userId)
      )
    }

    return db
      .select()
      .from(tasks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
  }

  async getById(id: string, access?: TaskAccess) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(this.byIdAndAccess(id, access))
    return task ?? null
  }

  async update(id: string, input: UpdateTaskInput, access?: TaskAccess) {
    const [task] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(this.byIdAndAccess(id, access))
      .returning()
    return task ?? null
  }

  async complete(id: string, access?: TaskAccess) {
    return this.update(id, { done: true }, access)
  }

  async delete(id: string, access?: TaskAccess) {
    const [task] = await db
      .delete(tasks)
      .where(this.byIdAndAccess(id, access))
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

  private byIdAndAccess(id: string, access?: TaskAccess) {
    const conditions = [eq(tasks.id, id)]
    if (
      access &&
      Object.prototype.hasOwnProperty.call(access, 'userId') &&
      access.userId !== undefined
    ) {
      conditions.push(
        access.userId === null
          ? isNull(tasks.userId)
          : eq(tasks.userId, access.userId)
      )
    }
    return and(...conditions)
  }
}

export const taskService = new TaskService()
