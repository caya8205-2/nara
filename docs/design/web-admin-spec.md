# Nara Web Admin UX Spec

Status: implementation draft

This spec covers the local web admin dashboard that runs on or near the office server PC. It is not the user-facing app.

## Product Role

The web admin dashboard exists for setup, diagnostics, local operations, and debugging. It should prioritize clarity, density, and low-drama operational feedback.

Admin UI may mention OpenClaw for runtime diagnostics. User-facing surfaces should prefer Nara Bot wording.

## Navigation Model

Use a persistent sidebar on desktop:

- Overview
- Health
- Agent Tools
- Users
- WhatsApp Access
- Logs
- Config
- Backup

If the dashboard is opened on a narrow screen, collapse navigation into a top menu. Mobile support is useful but not the main target.

## Shared Layout Rules

- Use compact page headers.
- Put the most urgent operational status above secondary details.
- Keep diagnostics copy specific and actionable.
- Mask secrets by default.
- Prefer tables, rows, and panels over large decorative cards.
- Any destructive or external-state action requires confirmation.

## Screen: Overview

Purpose: provide one-glance server status.

### Current Direction

The Overview screen is an operator console, not a task workspace. It should not create, complete, or delete tasks directly because task ownership belongs to app users and agent tool flows.

Overview should summarize service state and route the operator to the right admin area:

- Backend readiness.
- Reminder worker status.
- WhatsApp/OpenClaw readiness.
- Operator session state.
- Flagged dependencies.
- Quick links to Health, WhatsApp Access, Backup, Reports, Logs, and Agent Tools.

Task creation belongs in user-scoped app flows or OpenClaw-facing agent tools after `get_user_context` has resolved the Nara user. If a web admin task screen is revisited later, it must make scope explicit, such as selecting a target user or showing that the action is operator-only system work.

### Default Layout

Top row:

- Backend status.
- Database status.
- Redis status.
- OpenClaw status.
- WhatsApp bridge status.

Main areas:

- Recent errors.
- Recent agent tool calls.
- Pending Nara Bot access requests.
- Pending approvals count.
- Latest backup status.

Primary actions:

- Refresh.
- Open logs.
- Run readiness check.

### Key States

All healthy:

- Keep status compact.
- Show last checked time.

Dependency down:

- Highlight dependency.
- Show immediate suggested fix.

No OpenClaw token:

- Show missing config state, not generic failure.

### MVP Components

- DependencyStatusCard
- RecentErrorList
- AgentActionTable
- BackupStatusPanel

### Follow-up UI Work

Use the 21st.dev-style references as visual inspiration only. Do not add a new UI dependency unless there is a clear maintenance benefit. Keep the current React, Tailwind, and lucide stack.

Next refresh pass:

1. Apply the new admin UI primitives to Agent Tools, Users, Clients, and Context. Backup, Reports, WhatsApp Access, Logs, and Config have been refreshed.
2. Replace remaining placeholder/scaffold copy with operator-facing copy.
3. Keep admin pages dense and scannable: rows, tables, status badges, compact panels.
4. Avoid landing-page treatment, decorative gradients, nested cards, and user-facing development copy.
5. Revisit `/tasks`; either remove it from admin navigation or rebuild it as an explicitly scoped admin/user task inspection screen.

## Screen: Health

Purpose: diagnose backend dependencies.

### Default Layout

Dependency rows:

- Backend API.
- PostgreSQL.
- Redis.
- OpenClaw Gateway.
- WhatsApp bridge.

Each row:

- Status.
- Last checked.
- Latency if available.
- Message.
- Suggested action.

Primary actions:

- Recheck all.
- Copy diagnostic summary.

### MVP Components

- HealthTable
- DependencyRow
- DiagnosticCopyButton

## Screen: Agent Tools

Purpose: test and debug tool endpoint behavior.

### Default Layout

Left panel:

- Tool list.
- Tool status.
- Required auth indicator.

Center panel:

- JSON input editor.
- Example payload selector.
- Run button.

Right panel:

- Result summary.
- Raw response.
- Duration and timestamp.

Initial tools:

- create_task.
- list_tasks.
- complete_task.
- delete_task.
- summary.

### Key States

Invalid JSON:

- Block run and show parse error.

Unauthorized:

- Show agent secret/auth issue.

Tool failure:

- Show returned error and raw payload.

### MVP Components

- ToolList
- PayloadEditor
- ToolResultPanel
- ExamplePayloadMenu

## Screen: Users

Purpose: manage app users and their access state.

### Default Layout

User table:

- Name.
- Login identifier.
- Role.
- WhatsApp number.
- Nara Bot access status.
- Last active.

Primary actions:

- Create user.
- Disable user.
- Open user detail.
- Review WhatsApp access.

### MVP Components

- UserTable
- UserStatusBadge
- UserDetailPanel

## Screen: WhatsApp Access

Purpose: review and sync Nara Bot allowlist access.

### Default Layout

Access request table:

- User.
- WhatsApp number.
- Status.
- Source.
- Last sync.
- Error message when sync failed.

Statuses:

- pending verification.
- pending Nara Bot approval.
- allowed.
- blocked.
- sync failed.

Primary actions:

- Approve/sync allowlist.
- Block number.
- Retry sync.
- Copy OpenClaw diagnostic detail.

### OpenClaw Runtime Notes

This screen can expose OpenClaw-specific details because it is an admin/debug surface. Keep normal user wording as Nara Bot.

### MVP Components

- WhatsAppAccessTable
- AccessStatusBadge
- AllowlistSyncAction
- SyncErrorPanel

## Screen: Logs

Purpose: inspect local runtime behavior.

### Default Layout

Top controls:

- Source filter.
- Severity filter.
- Search.
- Time range.

Log list:

- Timestamp.
- Source.
- Level.
- Message.
- Optional metadata drawer.

Primary actions:

- Copy selected log.
- Export filtered logs.
- Clear local view filter.

### MVP Components

- LogFilterBar
- LogRow
- LogMetadataDrawer
- ExportLogsButton

## Screen: Config

Purpose: verify setup safely.

### Default Layout

Sections:

- Backend.
- Database.
- Redis.
- OpenClaw.
- WhatsApp.
- Tunnel/API access.
- Storage paths.

Field row:

- Config key.
- Present/missing.
- Redacted value when safe.
- Required/optional.
- Help text.

### Key States

Missing required value:

- Mark as blocking.
- Explain which feature is affected.

Secret present:

- Show "configured" and last loaded time.
- Do not show raw secret.

### MVP Components

- ConfigSection
- ConfigRow
- RedactedValue
- ConfigImpactNote

## Screen: Open Source Attribution

Purpose: list major open source software used to build and run Nara.

Content:

- OpenClaw.
- Fastify.
- React.
- Vite.
- Tailwind CSS.
- PostgreSQL / pgvector.
- Redis.
- Other major runtime dependencies.

This may live under Config or Settings rather than as a top-level nav item.

## Screen: Backup

Purpose: protect local office-server data.

### Default Layout

Top summary:

- Last backup time.
- Last backup result.
- Backup location.

Sections:

- Database export.
- Report archive.
- Config snapshot.
- Restore notes.

Primary actions:

- Run backup.
- Export data.
- Open backup folder.

### Key States

Backup never run:

- Show setup CTA.

Backup failed:

- Show error and last known good backup.

Restore:

- Document-only initially. Avoid implementing restore until backup flow is reliable.

### MVP Components

- BackupSummary
- BackupActionRow
- ExportHistoryTable

## First Build Recommendation

Build Overview, Health, Agent Tools, Users, WhatsApp Access, and Config first. Logs and Backup can follow once backend endpoints exist.

The current web dashboard can evolve into this admin dashboard. Keep existing login and readiness checks, then split the current all-in-one dashboard into dedicated routes.
