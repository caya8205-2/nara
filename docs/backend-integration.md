# Backend Integration Requirements

> Status: Admin UI complete, backend endpoints needed for full functionality

## Overview

Web admin dashboard screens are built and ready. The following backend API endpoints need implementation to enable full functionality for Logs, Backup, and enhanced WhatsApp Access features.

## Priority Order

1. **High Priority:** Logs endpoint (operational diagnostics)
2. **High Priority:** WhatsApp Access data joining (UX improvement)
3. **Medium Priority:** Backup endpoints (data safety)

---

## Logs Screen Integration

**Screen:** `/logs` (`apps/web-admin/src/pages/Logs.tsx`)

**Status:** UI complete with filters, search, and export. Waiting for backend endpoint.

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

**Status:** UI complete with export buttons and status display. Waiting for backend endpoints.

### Required Endpoints

#### 1. Trigger Full Backup

```
POST /api/backup
```

**Request Body:** None (or optional configuration)

**Response:**
```typescript
{
  id: string // backup job ID
  status: 'started' | 'in_progress' | 'success' | 'failed'
  startedAt: string
  message?: string
}
```

**Implementation:**
- Create PostgreSQL dump using `pg_dump`
- Archive reports directory
- Snapshot environment config (redacted secrets)
- Store backup with timestamp: `backup-YYYY-MM-DD-HHmmss.tar.gz`
- Return job ID for status polling if async

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
- `database`: PostgreSQL dump file
- `reports`: Tar archive of reports directory
- `config`: JSON file with redacted environment variables
- `full`: Complete backup archive

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
- Store backup metadata in PostgreSQL `backups` table
- Configure backup directory path via environment variable: `BACKUP_DIR`
- Implement automatic backup rotation (keep last N backups)
- Consider scheduled backups via cron or BullMQ
- Ensure backup directory has proper permissions and disk space monitoring

**Authentication:**
- Requires operator JWT token
- All backup operations should be audit-logged

---

## WhatsApp Access Enhancement

**Screen:** `/whatsapp-access` (`apps/web-admin/src/pages/WhatsAppAccess.tsx`)

**Status:** UI functional but showing user IDs and contact IDs instead of human-readable names.

### Current State

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

### Recommended Enhancement

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
- Modify `apps/backend/src/services/identity.service.ts`
- Join `agent_channel_access` with `users` and `user_contacts` tables
- Use Drizzle ORM joins or raw SQL with joins

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

---

## Testing Checklist

Before marking backend integration complete:

**Logs:**
- [ ] Endpoint returns logs with all required fields
- [ ] Filtering by source works
- [ ] Filtering by level works
- [ ] Search query matches message text
- [ ] Time range filtering works
- [ ] Pagination works correctly
- [ ] Export generates valid log file

**Backup:**
- [ ] Full backup creates complete archive
- [ ] Database export generates valid pg_dump file
- [ ] Reports export creates tar archive
- [ ] Config export includes environment variables (secrets redacted)
- [ ] Backup history lists all backups with correct metadata
- [ ] File download streams work correctly
- [ ] Backup rotation prevents disk space issues

**WhatsApp Access:**
- [ ] Enhanced endpoint returns joined user data
- [ ] Contact value (phone number) is displayed correctly
- [ ] UI shows user displayName instead of UUID
- [ ] Status updates still work with enhanced data structure

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

1. **Create database migration** for `logs` and `backups` tables if using PostgreSQL storage
2. **Implement Logs endpoint** with filtering and pagination
3. **Implement Backup endpoints** with file generation and history tracking
4. **Enhance WhatsApp Access query** to return joined data
5. **Test integration** with web admin UI
6. **Configure scheduled backups** via cron or BullMQ
7. **Document backup restoration procedure** for disaster recovery

---

## Related Documentation

- [Web Admin UX Spec](design/web-admin-spec.md) - Full screen specifications
- [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) - Identity and access model
- [Architecture](architecture.md) - System architecture overview

---

*Document created: 2026-06-10*  
*Last updated: 2026-06-10*  
*Status: Ready for backend implementation*
