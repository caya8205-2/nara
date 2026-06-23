import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

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

export const clientContactType = pgEnum('client_contact_type', ['email', 'phone', 'whatsapp', 'other'])

export const contextKind = pgEnum('context_kind', ['note', 'preference', 'summary', 'instruction'])

export const reportKind = pgEnum('report_kind', ['manual', 'daily', 'weekly'])

export const reportStatus = pgEnum('report_status', [
  'generated',
  'delivered',
  'delivery_failed',
  'delivery_skipped',
  'failed',
])

export const reportScheduleFrequency = pgEnum('report_schedule_frequency', ['daily', 'weekly'])

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

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    title: text('title').notNull(),
    kind: reportKind('kind').default('manual').notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    summary: text('summary').notNull(),
    payload: text('payload').notNull(),
    status: reportStatus('status').default('generated').notNull(),
    deliveryStatus: text('delivery_status'),
    deliveryMessage: text('delivery_message'),
    deliveredAt: timestamp('delivered_at'),
    generatedAt: timestamp('generated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userCreated: index('reports_user_created_idx').on(table.userId, table.createdAt),
    period: index('reports_period_idx').on(table.periodStart, table.periodEnd),
  }),
)

export const reportSchedules = pgTable(
  'report_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    frequency: reportScheduleFrequency('frequency').default('daily').notNull(),
    timezone: text('timezone').default('Asia/Jakarta').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    deliver: boolean('deliver').default(true).notNull(),
    nextRunAt: timestamp('next_run_at'),
    lastRunAt: timestamp('last_run_at'),
    lastRunStatus: text('last_run_status'),
    lastRunMessage: text('last_run_message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    due: index('report_schedules_due_idx').on(table.enabled, table.nextRunAt),
    userCreated: index('report_schedules_user_created_idx').on(table.userId, table.createdAt),
  }),
)

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    company: text('company'),
    contactInfo: text('contact_info'),
    notes: text('notes'),
    status: text('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userCreated: index('clients_user_created_idx').on(table.userId, table.createdAt),
    status: index('clients_status_idx').on(table.status),
  }),
)

export const clientContacts = pgTable(
  'client_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id').references(() => clients.id).notNull(),
    type: clientContactType('type').notNull(),
    value: text('value').notNull(),
    label: text('label'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    clientCreated: index('client_contacts_client_created_idx').on(table.clientId, table.createdAt),
  }),
)

export const contextEntries = pgTable(
  'context_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    clientId: uuid('client_id').references(() => clients.id),
    kind: contextKind('kind').default('note').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    source: text('source').default('manual').notNull(),
    importance: text('importance').default('normal').notNull(),
    pinned: boolean('pinned').default(false).notNull(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userCreated: index('context_entries_user_created_idx').on(table.userId, table.createdAt),
    clientCreated: index('context_entries_client_created_idx').on(table.clientId, table.createdAt),
    kind: index('context_entries_kind_idx').on(table.kind),
  }),
)

export const agentGroups = pgTable(
  'agent_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelType: agentChannelType('channel_type').default('whatsapp').notNull(),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').default('active').notNull(),
    summaryEnabled: boolean('summary_enabled').default(false).notNull(),
    summaryCronExpr: text('summary_cron_expr'),
    summaryTimezone: text('summary_timezone').default('Asia/Jakarta').notNull(),
    digestTarget: text('digest_target').default('group').notNull(),
    lastMessageAt: timestamp('last_message_at'),
    lastSummaryAt: timestamp('last_summary_at'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    channelExternalUnique: uniqueIndex('agent_groups_channel_external_unique')
      .on(table.channelType, table.externalId),
    statusUpdated: index('agent_groups_status_updated_idx').on(table.status, table.updatedAt),
  }),
)

export const agentGroupMembers = pgTable(
  'agent_group_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id').references(() => agentGroups.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    role: text('role').default('member').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    groupUserUnique: uniqueIndex('agent_group_members_group_user_unique').on(table.groupId, table.userId),
    groupCreated: index('agent_group_members_group_created_idx').on(table.groupId, table.createdAt),
  }),
)

export const agentGroupMessages = pgTable(
  'agent_group_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id').references(() => agentGroups.id).notNull(),
    senderContactValue: text('sender_contact_value'),
    senderDisplayName: text('sender_display_name'),
    body: text('body').notNull(),
    occurredAt: timestamp('occurred_at').defaultNow(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    groupOccurred: index('agent_group_messages_group_occurred_idx').on(table.groupId, table.occurredAt),
  }),
)

export const agentGroupSummaries = pgTable(
  'agent_group_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id').references(() => agentGroups.id).notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    periodStart: timestamp('period_start'),
    periodEnd: timestamp('period_end'),
    messageCount: integer('message_count').default(0).notNull(),
    source: text('source').default('agent').notNull(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    groupCreated: index('agent_group_summaries_group_created_idx').on(table.groupId, table.createdAt),
    period: index('agent_group_summaries_period_idx').on(table.periodStart, table.periodEnd),
  }),
)
