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

Use `userId` for local simulation or app-driven testing. Use `channelType + contactValue` later when OpenClaw receives a WhatsApp sender number.

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

Agent tool calls store pending records in `approval_requests` with the action type, risk level, source, and payload needed to run the action later. Approval executes the stored payload through the existing task/reminder services. Rejection closes the request without running the action. The current supported actions are task create/complete/delete and reminder create/update/delete.

### Reminder Execution

**Status:** Implemented for backend-side due detection, BullMQ scheduling, and OpenClaw WhatsApp delivery attempts.

The backend starts a BullMQ reminder worker when `REMINDER_WORKER_ENABLED=true`. It requires `REDIS_URL`, schedules a repeat job every `REMINDER_WORKER_INTERVAL_MS` milliseconds, defaults to 60 seconds, and calls `reminderService.processDue()`.

Execution behavior:

- one-time reminders trigger once, set `enabled=false`, clear `nextRunAt`, and record `lastTriggeredAt`
- recurring reminders trigger, keep `enabled=true`, and advance `nextRunAt`
- every trigger writes `reminder.delivery.recorded` and `reminder.triggered` audit events with the delivery status
- user reminders are sent through the OpenClaw WhatsApp delivery adapter when an allowed WhatsApp recipient exists
- delivery failures are stored in `lastTriggerStatus=delivery_failed` and `lastTriggerMessage` for admin visibility
- push or local notification delivery is still a separate follow-up

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
- `dependencies.openclaw`
- `dependencies.whatsapp`

The WhatsApp readiness check is intentionally non-mutating. It verifies required OpenClaw WhatsApp environment values and counts allowed WhatsApp recipients from the Nara database. It does not send a message, pair WhatsApp, or rewrite OpenClaw config.

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

**Status:** Implemented for MVP with local backup history and export files.

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
- Create a full JSON snapshot with redacted config and report manifest
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
- `full`: JSON snapshot with config and reports manifest

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
- Future hardening can move metadata into PostgreSQL and add scheduled backups via BullMQ

**Authentication:**
- Requires operator JWT token
- All backup operations should be audit-logged

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

1. **Install or document pg_dump availability** on the office server PC
2. **Add scheduled backups** via BullMQ or a local scheduler
3. **Add backup restore verification** as a manual admin checklist
4. **Move backup metadata to PostgreSQL** if file-based history becomes limiting
5. **Add cursor pagination** for logs once audit volume grows

---

## Related Documentation

- [Web Admin UX Spec](design/web-admin-spec.md) - Full screen specifications
- [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) - Identity and access model
- [Architecture](architecture.md) - System architecture overview

---

*Document created: 2026-06-10*  
*Last updated: 2026-06-11*
*Status: MVP backend integration complete*
