import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  done: boolean('done').default(false),
  dueAt: timestamp('due_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  cronExpr: text('cron_expr').notNull(),
  action: text('action').notNull(),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  contactInfo: text('contact_info'),
  createdAt: timestamp('created_at').defaultNow(),
})
