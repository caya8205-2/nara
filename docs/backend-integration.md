# Backend Integration Requirements

> Status: Admin dashboard backend integration complete for MVP.

## Overview

Web admin dashboard screens are built and ready. Logs, enhanced WhatsApp Access, and Backup now have backend integration for MVP usage.

## Priority Order

1. **Done:** Logs endpoint backed by audit events
2. **Done:** WhatsApp Access data joining
3. **Done:** Backup endpoints with local history and export files
4. **Done:** OpenClaw agent tool contract with user context and assistant profile

---

## OpenClaw Agent Tool Integration

**Status:** Implemented for no-WhatsApp simulation and ready for a future WhatsApp channel adapter.

Nara backend remains the source of truth. OpenClaw should orchestrate through Nara backend tools instead of writing tasks or user state directly.

For live WhatsApp usage, install the Nara Bot runtime contract into the OpenClaw WhatsApp agent:

- system prompt: `agent/prompts/system.md`
- tool manifest: `agent/config/tools.json`
- backend tool base: `http://127.0.0.1:4000`
- auth header: `x-agent-secret: <AGENT_API_SECRET>`

The OpenClaw WhatsApp agent must not create OpenClaw-native tasks, spawn sub-agents, or run OpenClaw project automation for normal Nara user requests. It should call `get_user_context` first with the WhatsApp sender number, then call Nara backend tools for task, reminder, approval, context, and summary behavior.

For group conversations, the agent must call `get_group_context` after `get_user_context`, using the WhatsApp group id/JID as `groupExternalId`. Group transcript, digest settings, and summaries are stored in Nara, not OpenClaw runtime memory.

### Authentication

All agent tool endpoints require:

```http
x-agent-secret: <AGENT_API_SECRET>
```

### User Context

Every agent tool call must resolve a Nara user by one of these inputs:

```typescript
{
  userId?: string
  channelType?: 'whatsapp' | 'telegram'
  contactValue?: string
}
```

Use `userId` for local simulation or app-driven testing. Use `channelType + contactValue` when OpenClaw receives a WhatsApp sender number. The backend accepts common WhatsApp phone variants such as `+628...`, `628...`, and local `08...` when resolving a contact.

### Required First Tool

```
POST /api/agent/users/context
```

Returns:

```typescript
{
  user: PublicUser
  assistantProfile: {
    tone: string
    autonomy: 'Suggest' | 'Confirm' | 'Act' | string
    customPersonality: string
    allowTaskCreation: boolean
    allowReminderDrafts: boolean
    allowSensitiveActions: boolean
  }
  taskSummary: {
    pendingTasks: number
    overdueTasks: number
    nextDue: string | null
  }
  reminderSummary: {
    activeReminders: number
    pausedReminders: number
    recurringReminders: number
  }
  instructions: string[]
  toolContext: {
    userId: string
    channelType: 'whatsapp' | 'telegram'
    contactValue: string | null
  }
}
```

OpenClaw should merge `instructions` into the runtime prompt for that conversation. This is what makes Nara Bot follow each user's personality and autonomy settings.

The response also includes `toolContext`. OpenClaw should copy that object into later tool calls so all actions remain scoped to the resolved Nara user.

### Task Tools

Task tools are user-scoped:

- `POST /api/agent/tasks/create`
- `POST /api/agent/tasks/list`
- `POST /api/agent/tasks/complete`
- `POST /api/agent/tasks/delete`
- `POST /api/agent/summary`

Mutating tools respect `assistantProfile.autonomy`. For `Suggest` and `Confirm`, the backend creates a pending approval request unless the request includes `confirmed: true`. The mobile Approvals tab can approve or reject those pending requests.

### Reminder Tools

Reminder tools use the same user resolution and confirmation rules:

- `POST /api/agent/reminders/create`
- `POST /api/agent/reminders/list`
- `POST /api/agent/reminders/update`
- `POST /api/agent/reminders/delete`

One-time reminders require `scheduledAt`. Recurring reminders require `cronExpr` and support a timezone. Supported MVP cron presets are daily `0 9 * * *`, weekly `0 9 * * 1`, and monthly `0 9 1 * *`.

### Approval Requests

**Status:** Implemented for agent tool confirmation paths and mobile review.

Approval endpoints require a normal mobile user or operator JWT:

- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

Agent tool calls store pending records in `approval_requests` with the action type, risk level, source, and payload needed to run the action later. Approval executes the stored payload through the existing task, reminder, or group-context services. Rejection closes the request without running the action. The current supported actions are task create/complete/delete, reminder create/update/delete, and group summary configuration.

### Group Context And Summaries

**Status:** Implemented for backend storage and agent tool contract. WhatsApp runtime ingestion still needs the live OpenClaw group event path.

Group endpoints are agent-tool endpoints protected by `x-agent-secret`:

- `POST /api/agent/groups/context`
- `POST /api/agent/groups/messages/record`
- `POST /api/agent/groups/summary/configure`
- `POST /api/agent/groups/summary/save`

The backing tables are:

- `agent_groups`: channel group identity, digest settings, and last activity
- `agent_group_members`: linked Nara users that have interacted with a group
- `agent_group_messages`: transcript snippets provided by the WhatsApp runtime
- `agent_group_summaries`: saved group digests for a period

Contract:

- `get_user_context` remains first for sender identity and access checks.
- `get_group_context` is required before group tools and returns group `toolContext`.
- `record_group_messages` only stores real messages supplied by the runtime; the agent must not invent transcript content.
- `configure_group_summary` can create an approval request when the user's autonomy requires confirmation.
- `save_group_summary` stores the digest generated by the agent from real provided/recorded messages.

Local simulation:

```powershell
npm run agent:smoke:group -- --cleanup
```

Current limitation: the backend stores group digest schedules (`summaryEnabled`, `summaryCronExpr`, `summaryTimezone`, `digestTarget`), but there is not yet a dedicated group-summary worker that fetches new WhatsApp group messages by itself. The next OpenClaw milestone is wiring real group message events into these tools and then adding automated scheduled digest delivery.

#### Next Group Digest Plan

Continue from commit `f2d73a6e`.

Server verification after pull:

```powershell
npm run db:migrate
npm run server:restart
npm run agent:smoke:group -- --cleanup
npm run openclaw:nara:sync
```

Implementation order:

1. **Inspect OpenClaw WhatsApp group event shape**
   - Find whether OpenClaw exposes group id/JID, group subject, sender phone, sender display name, body text, and timestamp.
   - Keep any raw runtime payload in tool metadata only when useful for debugging.
   - Do not add a direct OpenClaw dependency inside unrelated app services; keep the boundary in agent/openclaw adapter code.

2. **Add group message ingestion path**
   - Map each real group message event to `record_group_messages`.
   - Require `get_user_context` for the sender before any group mutation.
   - Require `get_group_context` before recording or summarizing group messages.
   - Skip messages when the sender cannot be resolved or is not allowed for Nara Bot.

3. **Add group summary worker**
   - Follow the existing reminder/report worker pattern with Redis/BullMQ.
   - Suggested env names:
     - `GROUP_SUMMARY_WORKER_ENABLED=true`
     - `GROUP_SUMMARY_WORKER_INTERVAL_MS=300000`
   - Find groups where `summaryEnabled=true` and the next digest is due.
   - Build a digest from stored `agent_group_messages` since the last summary or within the requested period.
   - Save output to `agent_group_summaries`.
   - Record `lastSummaryAt` and an actionable failure message/status if generation or delivery fails.

4. **Delivery/status**
   - If WhatsApp delivery is unavailable, keep the saved summary and expose status in admin/logs.
   - Once the dedicated Nara Bot number exists, send the digest to `digestTarget=group` through OpenClaw WhatsApp.
   - Avoid user-facing dev copy; admin/debug surfaces may mention OpenClaw.

Non-goals for the next pass:

- Do not build Tauri.
- Do not create a public dashboard for group summaries yet.
- Do not implement destructive restore or broad admin redesign.
- Do not claim automated group summaries are live until real OpenClaw group events are verified on the server PC.

### Reminder Execution

**Status:** Implemented for backend-side due detection, BullMQ scheduling, and OpenClaw WhatsApp delivery attempts.

The backend starts a BullMQ reminder worker when `REMINDER_WORKER_ENABLED=true`. It requires `REDIS_URL`, schedules a repeat job every `REMINDER_WORKER_INTERVAL_MS` milliseconds, defaults to 60 seconds, and calls `reminderService.processDue()`.

Worker visibility is exposed through `/health` and `/api/readiness`. `/api/readiness.dependencies.reminderWorker` reports the BullMQ worker state and turns readiness degraded when automatic reminder execution will not run. Common actionable states include:

- `disabled` when `REMINDER_WORKER_ENABLED=false`
- `missing` when `REDIS_URL` is not configured
- `error` when the worker is enabled but failed to start or schedule jobs
- `ok` when the worker is running and repeat scheduling succeeded

Execution behavior:

- one-time reminders trigger once, set `enabled=false`, clear `nextRunAt`, and record `lastTriggeredAt`
- recurring reminders trigger, keep `enabled=true`, and advance `nextRunAt`
- every trigger writes `reminder.delivery.recorded` and `reminder.triggered` audit events with the delivery status
- user reminders are sent through the OpenClaw WhatsApp delivery adapter when an allowed WhatsApp recipient exists
- delivery failures are stored in `lastTriggerStatus=delivery_failed` and `lastTriggerMessage` for admin visibility
- Android mobile fallback notifications can alert the signed-in user locally when WhatsApp access is unavailable or backend delivery records `delivery_failed`/`delivery_skipped`

Useful endpoints:

- `GET /api/reminders/execution` returns user-scoped execution summary
- `POST /api/reminders/process-due` lets an operator manually process due reminders

Local worker verification:

```powershell
npm run infra:up
npm --workspace @nara/backend run db:migrate
npm --workspace @nara/backend run dev
```

Create a one-time reminder due in the near future, then watch backend logs for `reminder worker started` and `processed due reminders`. For manual verification without waiting for the repeat job, sign in as an operator and call `POST /api/reminders/process-due`.

### Reporting Service

**Status:** Implemented for manual generation, scheduled generation, and OpenClaw WhatsApp delivery attempts.

Report endpoints require a normal mobile user or operator JWT:

- `GET /api/reports`
- `POST /api/reports/generate`
- `GET /api/reports/:id`
- `GET /api/reports/schedules`
- `POST /api/reports/schedules`
- `PATCH /api/reports/schedules/:id`
- `DELETE /api/reports/schedules/:id`

Operator-only endpoint:

- `POST /api/reports/process-due`

Report records are stored in PostgreSQL and summarize task, reminder, approval, and audit activity for the selected daily, weekly, or manual period. If `deliver=true`, the report service sends the summary through the same OpenClaw WhatsApp adapter used by reminders. Delivery outcome is stored on `reports.status`, `deliveryStatus`, `deliveryMessage`, and `deliveredAt`.

Scheduled reports use `report_schedules`. Daily and weekly schedules run at 17:00 in the configured timezone. The current MVP supports `Asia/Jakarta` and `UTC`.

The backend starts a BullMQ report worker when `REPORT_WORKER_ENABLED=true`. It requires `REDIS_URL`, schedules a repeat job every `REPORT_WORKER_INTERVAL_MS` milliseconds, defaults to 5 minutes, and calls `reportService.processDue()`.

Local worker verification:

```powershell
npm run infra:up
npm --workspace @nara/backend run db:migrate
npm --workspace @nara/backend run dev
```

Sign in as an operator, open `/reports` in the web admin, create a daily report schedule, then use **Process Due** or `POST /api/reports/process-due` after the schedule is due. Watch backend logs for `report worker started` and `processed due report schedules`. Confirm the report row shows `delivered`, `delivery_failed`, or `delivery_skipped`.

### Local Smoke Test

```powershell
npm run agent:smoke
npm --workspace @nara/backend run agent:smoke -- --cleanup
npm --workspace @nara/backend run agent:smoke -- --user-id <user-uuid>
```

The smoke test does not require a WhatsApp host number.

## Access Control Matrix

**Status:** Implemented with shared backend authorization helpers in `authz.service.ts`.

Session roles:

- `operator`: local office-server admin from environment credentials.
- `user` with role `admin`: database-backed app admin.
- `user` with role `user`: normal app user.

Access rules:

- Server operations are operator-only: logs, backup/export, OpenClaw allowlist admin actions, and manual worker triggers.
- App admin users can manage app data across users: users, approvals, reports, and clients.
- Normal users can only access owner-scoped data: their own tasks, reminders, approvals, clients, contacts, assistant profile, and Nara Bot access records.
- Agent tool endpoints keep using `x-agent-secret` and resolve user scope from `userId` or allowed WhatsApp contact context.

Route implementation should use `authzService.requireSession`, `requireOperator`, `requirePrivileged`, or `requireUserOwnerOrPrivileged` instead of route-local `jwtVerify` logic.

## WhatsApp Readiness

**Screen:** `/health` (`apps/web-admin/src/pages/Health.tsx`)

**Status:** Implemented for Nara-side WhatsApp bridge readiness.

`GET /api/readiness` returns:

- `dependencies.database`
- `dependencies.redis`
- `dependencies.reminderWorker`
- `dependencies.openclaw`
- `dependencies.whatsapp`

The WhatsApp readiness check is intentionally non-mutating. It verifies required OpenClaw WhatsApp environment values and counts allowed WhatsApp recipients from the Nara database. It does not send a message, pair WhatsApp, or rewrite OpenClaw config.

For live use, the readiness check also expects the OpenClaw WhatsApp account to have a dedicated `hostNumber` and `selfChatMode=false`. Set `OPENCLAW_WHATSAPP_HOST_NUMBER` to the same E.164 number when it is available. If shared personal-number mode is enabled, readiness reports WhatsApp as not ready for live use so operators do not accidentally route normal personal chat through Nara Bot.

Server-side E2E verification still needs to be run on the PC that has the active OpenClaw WhatsApp session:

1. Pull this branch and run `npm --workspace @nara/backend run db:migrate`.
2. Restart Nara services.
3. Confirm `/api/readiness` shows healthy OpenClaw and WhatsApp rows.
4. Add or approve a user WhatsApp contact in Nara.
5. Send a WhatsApp message from the allowlisted number to the linked host number.
6. Confirm OpenClaw routes to `/api/agent/users/context` or task/reminder tools and backend audit logs record the action.

## Business Context Storage

**Screen:** `/context` (`apps/web-admin/src/pages/Context.tsx`)

**Status:** Implemented for manual context entry management and agent context reads.

Context endpoints require a normal mobile user, DB-admin user, or operator JWT:

- `GET /api/context`
- `POST /api/context`
- `GET /api/context/:id`
- `PATCH /api/context/:id`
- `DELETE /api/context/:id`

Context records are stored in `context_entries` and can be scoped to a user, a client, or both. Supported kinds are `note`, `preference`, `summary`, and `instruction`. Entries include `importance`, `pinned`, `source`, and optional JSON metadata.

Agent integration:

- `POST /api/agent/users/context` now includes `businessContext`.
- Agent instructions tell Nara Bot to use context entries when relevant without exposing private notes unnecessarily.
- The current MVP uses pinned/importance/update time ordering, not vector search. Embeddings can be added later without changing the API shape.

Security behavior:

- normal user JWTs can only access context where `context_entries.user_id` matches their user id
- operator and DB-admin user JWTs can list and manage all context entries
- create, update, and delete operations write audit events

## Client And Contact Management

**Screen:** `/clients` (`apps/web-admin/src/pages/Clients.tsx`)

**Status:** Implemented for backend CRUD and web admin management.

Client endpoints require a normal mobile user or operator JWT:

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`
- `POST /api/clients/:id/contacts`
- `PATCH /api/clients/:id/contacts/:contactId`
- `DELETE /api/clients/:id/contacts/:contactId`

Client records are stored in `clients` and can be scoped to a normal app user through `userId`. Contacts are stored in `client_contacts` and support `email`, `phone`, `whatsapp`, and `other` types. A client can have one primary contact; setting a new primary contact clears the previous primary flag for that client.

Security behavior:

- normal user JWTs can only access client records where `clients.user_id` matches their user id
- operator and DB-admin user JWTs can list and manage all client records
- all create, update, and delete operations write audit events

## Logs Screen Integration

**Screen:** `/logs` (`apps/web-admin/src/pages/Logs.tsx`)

**Status:** Implemented with filters, search, and export. Current MVP reads from audit events.

### Required Endpoint

```
GET /api/logs
```

**Query Parameters:**
- `source` (optional): Filter by log source
  - Values: `backend`, `database`, `redis`, `openclaw`, `agent`, `system`
- `level` (optional): Filter by severity level
  - Values: `debug`, `info`, `warn`, `error`
- `search` (optional): Search query for message text
- `from` (optional): ISO timestamp for time range start
- `to` (optional): ISO timestamp for time range end
- `limit` (optional): Number of entries to return (default: 100)

**Response Format:**
```typescript
{
  logs: Array<{
    id: string
    timestamp: string // ISO 8601
    source: 'backend' | 'database' | 'redis' | 'openclaw' | 'agent' | 'system'
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    metadata?: Record<string, unknown> // Optional structured data
  }>
  total: number
  hasMore: boolean
}
```

**Example Response:**
```json
{
  "logs": [
    {
      "id": "log-uuid-1",
      "timestamp": "2026-06-10T10:15:32.123Z",
      "source": "backend",
      "level": "info",
      "message": "Task created successfully",
      "metadata": {
        "taskId": "task-uuid",
        "userId": "user-uuid"
      }
    },
    {
      "id": "log-uuid-2",
      "timestamp": "2026-06-10T10:14:28.456Z",
      "source": "openclaw",
      "level": "error",
      "message": "WhatsApp sync failed: connection timeout",
      "metadata": {
        "contactId": "contact-uuid",
        "error": "ETIMEDOUT"
      }
    }
  ],
  "total": 245,
  "hasMore": true
}
```

**Implementation Notes:**
- Store logs in PostgreSQL table or use structured log file with rotation
- Index on `timestamp`, `source`, and `level` for fast filtering
- Consider log retention policy (e.g., keep 30 days)
- Metadata field should be JSONB in PostgreSQL for queryability

**Authentication:**
- Requires operator JWT token
- All log access should be audit-logged

---

## Backup Screen Integration

**Screen:** `/backup` (`apps/web-admin/src/pages/Backup.tsx`)

**Status:** Implemented for MVP with local backup history, export files, readiness checks, and scheduled backup execution.

### Required Endpoints

#### 1. Trigger Full Backup

```
POST /api/backup
```

**Request Body:** None (or optional configuration)

**Response:**
```typescript
{
  id: string
  type: 'full'
  timestamp: string
  size: string
  status: 'success' | 'failed'
  location: string
  error?: string
}
```

**Implementation:**
- Create a full JSON snapshot with redacted config, report manifest, and a companion PostgreSQL dump
- Record the backup as failed if the PostgreSQL dump cannot be created
- Store backup history in `BACKUP_DIR/history.json`
- Audit backup success/failure to `audit_logs`

#### 2. Export Specific Data

```
POST /api/backup/export
```

**Request Body:**
```typescript
{
  type: 'database' | 'reports' | 'config' | 'full'
}
```

**Response:**
- File download stream (application/octet-stream or application/x-gzip)
- Content-Disposition header with filename

**Implementation:**
- `database`: PostgreSQL dump file through host `pg_dump` or Docker container `pg_dump`
- `reports`: JSON manifest of report files
- `config`: JSON file with redacted environment variables
- `full`: JSON snapshot with config, reports manifest, and a companion PostgreSQL dump

#### 3. List Backup History

```
GET /api/backup/history
```

**Query Parameters:**
- `limit` (optional): Number of records (default: 20)

**Response:**
```typescript
{
  backups: Array<{
    id: string
    type: 'database' | 'reports' | 'config' | 'full'
    timestamp: string
    size: string // Human-readable, e.g., "45.2 MB"
    status: 'success' | 'failed' | 'in_progress'
    location: string // File path or storage identifier
    error?: string // If status is failed
  }>
}
```

**Example Response:**
```json
{
  "backups": [
    {
      "id": "backup-uuid-1",
      "type": "full",
      "timestamp": "2026-06-10T02:00:00.000Z",
      "size": "128.5 MB",
      "status": "success",
      "location": "/var/nara/backups/backup-2026-06-10-020000.tar.gz"
    },
    {
      "id": "backup-uuid-2",
      "type": "database",
      "timestamp": "2026-06-09T02:00:00.000Z",
      "size": "89.3 MB",
      "status": "success",
      "location": "/var/nara/backups/db-backup-2026-06-09-020000.sql.gz"
    }
  ]
}
```

**Implementation Notes:**
- Store backup metadata in `BACKUP_DIR/history.json`
- Configure backup directory path via environment variable: `BACKUP_DIR`
- Configure reports directory path via environment variable: `REPORTS_DIR`
- Configure Docker PostgreSQL container via `POSTGRES_CONTAINER_NAME` when using Docker Desktop
- Keep the latest 50 backup history records
- Future hardening can move metadata into PostgreSQL and add a guided restore flow after manual restore checks are reliable

**Authentication:**
- Requires operator JWT token
- All backup operations should be audit-logged

#### 4. Backup Status

```
GET /api/backup/status
```

Returns backup storage readiness and scheduled worker runtime state for the web admin Backup page.

**Implementation:**
- Verifies `BACKUP_DIR` is writable
- Checks whether host `pg_dump` or Docker fallback is available
- Reports the latest backup, latest successful backup, and latest failure message from `history.json`
- Reports BullMQ backup worker state, including disabled, missing Redis, startup error, last run, and interval

Scheduled full backups run when:

```env
BACKUP_WORKER_ENABLED=true
BACKUP_WORKER_INTERVAL_MS=86400000
REDIS_URL=redis://localhost:6379
```

The worker uses the existing Redis/BullMQ setup and records success/failure through the same backup history and audit log path as manual backups.

#### 5. Restore Verification Helper

Restore remains manual and non-destructive by default. Use the Windows helper to verify the latest backup against a throwaway database:

```powershell
npm run backup:verify-restore
npm run backup:verify-restore -- -Execute -ResetCheckDatabase
```

The helper resolves the latest `full-*.json` or `database-*.sql` backup, refuses to target the live `DATABASE_URL` database, restores into `nara_restore_check`, and verifies that public tables exist. Pass `-BackupPath` to check a specific dump.

---

## WhatsApp Access Enhancement

**Screen:** `/whatsapp-access` (`apps/web-admin/src/pages/WhatsAppAccess.tsx`)

**Status:** Implemented. Endpoint returns joined user and contact data, and admin actions sync OpenClaw allowlist state.

### Previous State

Existing endpoint:
```
GET /api/agent-access
```

Returns:
```typescript
Array<{
  id: string
  channelId: string
  userId: string // Just ID, not joined
  contactId: string // Just ID, not joined
  status: 'pending_verification' | 'pending_allowlist' | 'allowed' | 'blocked' | 'sync_failed'
  requestedAt: string
  // ... other fields
}>
```

### Implemented Enhancement

Update `identityService.listAgentAccess()` to return joined data:

**Enhanced Response:**
```typescript
Array<{
  id: string
  channelId: string
  userId: string
  contactId: string
  status: 'pending_verification' | 'pending_allowlist' | 'allowed' | 'blocked' | 'sync_failed'
  requestedAt: string
  allowedAt?: string
  blockedAt?: string
  lastSyncAt?: string
  syncError?: string
  // NEW: Joined user data
  user: {
    id: string
    displayName: string
    email?: string
    role: 'admin' | 'user'
  }
  // NEW: Joined contact data
  contact: {
    id: string
    type: 'whatsapp' | 'email'
    value: string // e.g., "+628123456789"
    label?: string
  }
}>
```

**Implementation:**
- `apps/backend/src/services/identity.service.ts` joins `agent_channel_access` with `users` and `user_contacts`
- `GET /api/users/:id/agent-access` returns the same joined data scoped to one user for the mobile app
- `apps/web-admin/src/pages/WhatsAppAccess.tsx` displays user names and WhatsApp numbers from the joined response
- `PATCH /api/agent-access/:id` with `status=allowed` syncs the contact into OpenClaw before storing `allowed`; sync failures store `sync_failed`, `lastSyncAt`, and `syncError`
- `POST /api/agent-access/:id/retry-sync` retries an allowlist sync for failed approvals
- `PATCH /api/agent-access/:id` with `status=blocked` removes the contact from the generated allowlist and persists any sync error for admin visibility

**SQL Example:**
```sql
SELECT 
  aca.*,
  u.id as user_id,
  u.display_name as user_name,
  u.email as user_email,
  u.role as user_role,
  uc.id as contact_id,
  uc.type as contact_type,
  uc.value as contact_value,
  uc.label as contact_label
FROM agent_channel_access aca
JOIN users u ON aca.user_id = u.id
JOIN user_contacts uc ON aca.contact_id = uc.id
ORDER BY aca.requested_at DESC
```

**Benefits:**
- Better UX: Shows actual user names and phone numbers
- Fewer API calls: No need for client to fetch users separately
- Easier filtering: Can filter by user name or phone number
- Safer operations: PostgreSQL remains the source of truth and OpenClaw sync failure is visible in admin state

---

## Testing Checklist

Before marking backend integration complete:

**Logs:**
- [x] Endpoint returns logs with all required fields
- [x] Filtering by source works
- [x] Filtering by level works
- [x] Search query matches message text
- [x] Time range filtering works
- [ ] Pagination works correctly beyond the MVP limit response
- [x] Export generates valid log file

**Backup:**
- [x] Full backup creates an MVP JSON snapshot
- [ ] Database export generates valid pg_dump file when pg_dump is installed
- [x] Reports export creates a reports manifest
- [x] Config export includes environment variables with secrets redacted
- [x] Backup history lists all backups with correct metadata
- [x] File download streams work correctly
- [x] Backup history is capped to prevent unbounded growth

**WhatsApp Access:**
- [x] Enhanced endpoint returns joined user data
- [x] Contact value (phone number) is displayed correctly
- [x] UI shows user displayName instead of UUID
- [x] Status updates still work with enhanced data structure

---

## Additional Recommendations

### Error Handling
- Return consistent error format: `{ error: string, details?: unknown }`
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)
- Log all errors with context for debugging

### Performance
- Add database indexes on frequently queried fields
- Implement pagination for large result sets
- Consider caching for backup history if storage is slow
- Use streaming for large file downloads

### Security
- Validate all input parameters
- Sanitize file paths to prevent directory traversal
- Rate limit backup operations to prevent abuse
- Audit log all backup and log access operations

### Monitoring
- Track backup success/failure rates
- Alert on backup failures
- Monitor backup storage usage
- Track log volume and performance

---

## Next Steps for Implementation

1. **Move backup metadata to PostgreSQL** if file-based history becomes limiting
2. **Add cursor pagination** for logs once audit volume grows

---

## Related Documentation

- [Web Admin UX Spec](design/web-admin-spec.md) - Full screen specifications
- [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) - Identity and access model
- [Architecture](architecture.md) - System architecture overview

---

*Document created: 2026-06-10*  
*Last updated: 2026-06-11*
*Status: MVP backend integration complete*
