import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['admin', 'user'])

export const contactType = pgEnum('contact_type', ['whatsapp', 'email'])

export const agentChannelType = pgEnum('agent_channel_type', ['whatsapp', 'telegram'])

export const agentAccessStatus = pgEnum('agent_access_status', [
  'pending_verification',
  'pending_allowlist',
  'allowed',
  'blocked',
  'sync_failed',
])

export const auditActorType = pgEnum('audit_actor_type', ['admin', 'user', 'agent', 'system'])

export const taskPriority = pgEnum('task_priority', ['low', 'normal', 'high', 'urgent'])

export const taskSource = pgEnum('task_source', ['manual', 'admin', 'agent', 'scheduled'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    displayName: text('display_name').notNull(),
    email: text('email'),
    passwordHash: text('password_hash'),
    role: userRole('role').default('user').notNull(),
    disabled: boolean('disabled').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
)

export const userContacts = pgTable('user_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: contactType('type').notNull(),
  value: text('value').notNull(),
  label: text('label'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agentChannels = pgTable('agent_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: agentChannelType('type').notNull(),
  name: text('name').notNull(),
  accountId: text('account_id'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agentChannelAccess = pgTable('agent_channel_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => agentChannels.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contactId: uuid('contact_id').references(() => userContacts.id).notNull(),
  status: agentAccessStatus('status').default('pending_verification').notNull(),
  requestedAt: timestamp('requested_at').defaultNow(),
  allowedAt: timestamp('allowed_at'),
  blockedAt: timestamp('blocked_at'),
  lastSyncAt: timestamp('last_sync_at'),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorType: auditActorType('actor_type').notNull(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  done: boolean('done').default(false),
  dueAt: timestamp('due_at'),
  priority: taskPriority('priority').default('normal').notNull(),
  source: taskSource('source').default('manual').notNull(),
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
