import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

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

export const reminderKind = pgEnum('reminder_kind', ['once', 'recurring'])

export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected'])

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

export const assistantProfiles = pgTable(
  'assistant_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    tone: text('tone').default('Balanced').notNull(),
    autonomy: text('autonomy').default('Confirm').notNull(),
    customPersonality: text('custom_personality').default('').notNull(),
    allowTaskCreation: boolean('allow_task_creation').default(true).notNull(),
    allowReminderDrafts: boolean('allow_reminder_drafts').default(true).notNull(),
    allowSensitiveActions: boolean('allow_sensitive_actions').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex('assistant_profiles_user_id_unique').on(table.userId),
  }),
)

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
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  kind: reminderKind('kind').default('once').notNull(),
  scheduledAt: timestamp('scheduled_at'),
  cronExpr: text('cron_expr'),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  action: text('action').default('notify').notNull(),
  source: taskSource('source').default('manual').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  nextRunAt: timestamp('next_run_at'),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastTriggerStatus: text('last_trigger_status'),
  lastTriggerMessage: text('last_trigger_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    title: text('title').notNull(),
    actionType: text('action_type').notNull(),
    source: text('source').default('nara_bot').notNull(),
    riskLevel: text('risk_level').default('low').notNull(),
    status: approvalStatus('status').default('pending').notNull(),
    payload: text('payload').notNull(),
    result: text('result'),
    requestedByType: auditActorType('requested_by_type').default('agent').notNull(),
    requestedById: uuid('requested_by_id'),
    decidedByType: auditActorType('decided_by_type'),
    decidedById: uuid('decided_by_id'),
    decidedAt: timestamp('decided_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userStatusCreated: index('approval_requests_user_status_created_idx')
      .on(table.userId, table.status, table.createdAt),
  }),
)

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  contactInfo: text('contact_info'),
  createdAt: timestamp('created_at').defaultNow(),
})
