# Nara Roadmap And Product Notes

This file combines the current planning, architecture, ADR, deployment, and design notes for sharing with other AI agents or collaborators.

## Current Implementation Snapshot

- Mobile task management is connected to user-scoped backend CRUD.
- Mobile reminders are connected to user-scoped create, list, pause, resume, delete, and pull-to-refresh flows.
- Reminder records support one-time schedules through `scheduledAt` and recurring schedules through `cronExpr` plus timezone.
- OpenClaw-facing agent tools support user-scoped task and reminder lifecycles.
- Agent-triggered reminder mutations are written to audit logs.
- Redis/BullMQ reminder delivery, local/push notifications, and approval execution remain future milestones.

---

Source: docs/architecture.md

# Architecture

See `diagram.png` in repo root for the current high-level architecture diagram.

## Current Direction

Nara is local-first. The main backend, database, Redis queue, and OpenClaw runtime are intended to run on one office PC or local server. Client apps connect to that backend API instead of requiring a public web deployment.

The WhatsApp agent should be branded as Nara Bot in user-facing surfaces. OpenClaw remains the runtime layer and should be credited in settings/open-source attribution.

The web dashboard is useful for development and internal diagnostics, but the primary product surfaces are expected to move toward:

1. Flutter mobile app for main day-to-day usage.
2. Tauri desktop app with feature parity where practical.
3. Web admin panel for local server diagnostics and internal operations.
4. WhatsApp or Telegram as later messaging channels through OpenClaw.

See [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) for the user identity, WhatsApp contact, and OpenClaw allowlist model.

## Layers

1. **User Interfaces** - Flutter Mobile, Tauri Desktop, local Web Admin, later WhatsApp/Telegram channels.
2. **Agent Layer** - OpenClaw Runtime: gateway, agent runtime, tool calling, session memory, cron, watchdog, later WhatsApp/Baileys.
3. **Business Logic Layer** - TypeScript/Fastify: REST APIs, auth, tasks, schedules, clients, reports, analytics, agent tool endpoints.
4. **Data Layer** - PostgreSQL + pgvector, Redis + BullMQ, local file storage, logs.

## Deployment Model

- One local office PC can act as the server and database host.
- PostgreSQL + pgvector and Redis can run through Docker/WSL on that server machine.
- The Flutter mobile app should call the backend API over the local office network or Cloudflare Tunnel.
- The Tauri desktop app can share the same API surface and eventually supervise the backend as a sidecar.
- The web admin panel can stay local to the server PC.
- Cloudflare Tunnel can expose only the backend API for remote access without opening router ports.
- Railway/VPS remains a later option if the project outgrows the office-server model.
- Messaging integrations are added later and should call the same backend tool endpoints.
- Windows server setup is documented in `ops/windows/README.md`, with helper scripts for prerequisite checks and OpenClaw WhatsApp account setup without storing secrets in git.

## Key Principles

- Self-hosted, local-first deployment.
- Backend is the source of truth.
- Mobile/desktop clients are operational surfaces, not separate sources of data.
- OpenClaw handles agent orchestration and messaging only.
- Business logic lives in the backend.
- Agent tools communicate with the backend via protected HTTP endpoints.
- Database and Redis stay private and are never exposed through the tunnel.

---

Source: docs/adr/001-fastify-over-express.md

# ADR 001 â€” Fastify over Express

**Status:** Accepted

## Context
Need a TypeScript-first HTTP framework for the backend layer.

## Decision
Use Fastify. Better performance, native TypeScript support, built-in schema validation, and plugin architecture fits modular service design.

## Consequences
- Different plugin/hook model vs Express
- Better DX for schema-validated routes
- Slightly steeper learning curve for Express users

---

Source: docs/adr/002-drizzle-over-prisma.md

# ADR 002 â€” Drizzle ORM over Prisma

**Status:** Accepted

## Context
Need an ORM for PostgreSQL with TypeScript support and pgvector compatibility.

## Decision
Use Drizzle ORM. Lightweight, SQL-first, no code generation step, better raw query access for pgvector operations.

## Consequences
- Less abstraction than Prisma
- More control over query shape
- Manual migration management via drizzle-kit

---

Source: docs/adr/003-identity-and-whatsapp-allowlist.md

# 003. Identity and WhatsApp Allowlist Model

## Status

Accepted

## Context

Nara's main selling point is a WhatsApp-facing agent powered by OpenClaw. The product UI should be branded as Nara, while still respecting OpenClaw and other open source projects in an attribution/settings area.

OpenClaw WhatsApp access is channel-gated. The runtime can use pairing or allowlist-style policies, and approved senders are stored on the server side. Nara needs a product-level model for users, WhatsApp numbers, and access state instead of treating all WhatsApp senders as anonymous agent users.

The web admin dashboard is local to the office server PC. It does not need the same account model as normal app users during the MVP.

## Decision

Nara will use three distinct identity/access concepts:

1. Local admin access for the office-server dashboard.
2. Normal app users stored in the Nara database.
3. WhatsApp contact access for Nara Bot / OpenClaw channel allowlisting.

For MVP, local admin access can remain simple and server-local, backed by environment credentials or a local session token. Normal users and their WhatsApp contacts should be stored in PostgreSQL.

The preferred user flow is:

1. User signs in or is created in the Nara app.
2. User adds their WhatsApp number in the app.
3. Backend stores the number and marks it as pending verification or pending allowlist sync.
4. Nara Bot / OpenClaw pairing or allowlist sync approves the number on the office server.
5. Backend marks the contact as allowed once sync succeeds.
6. WhatsApp messages from that number can be routed into the Nara agent flow.

Nara should own the product wording:

- User-facing UI says "Nara Bot", "WhatsApp access", "pending Nara Bot approval", or similar.
- Admin/debug surfaces may mention OpenClaw when diagnosing the runtime.
- Open source attribution/settings should list OpenClaw and other major OSS dependencies.

## Data Model Direction

Likely tables:

- `users`: app users.
- `user_contacts`: user-owned contact methods such as WhatsApp numbers.
- `agent_channel_access`: channel allowlist status per contact.
- `agent_channels`: channel/runtime config metadata.
- `approval_requests`: agent actions that need user/admin confirmation.
- `audit_logs`: admin/user/agent access changes and sensitive actions.

Initial contact/access statuses:

- `pending_verification`
- `pending_allowlist`
- `allowed`
- `blocked`
- `sync_failed`

## OpenClaw Sync Direction

The backend should not hardcode OpenClaw internals throughout the app. Use an adapter/service boundary such as `AgentAccessService`.

Implementation options to verify:

- OpenClaw CLI command for pairing approval or allowlist mutation.
- OpenClaw Gateway/API support for access management.
- Controlled update of local OpenClaw allowlist files, followed by runtime reload if required.

Until the exact OpenClaw interface is confirmed, Nara DB should be treated as the source of intended access state and OpenClaw as the runtime enforcement layer.

## Consequences

- Admin auth can stay lightweight for the local dashboard during MVP.
- Normal user auth must eventually be database-backed.
- WhatsApp access becomes auditable and visible in both app and admin surfaces.
- The UI can stay Nara-branded without hiding OpenClaw attribution.
- A sync worker/script is needed before WhatsApp access can be fully automated.

## Follow-ups

- Add database schema for users, contacts, channel access, approvals, and audit logs.
- Add an `AgentAccessService` abstraction.
- Research the safest OpenClaw CLI/API mechanism for allowlist sync.
- Add app UI for adding a WhatsApp number.
- Add web admin UI for reviewing users and Nara Bot access status.
- Add open source attribution/settings section.
- Keep OpenClaw WhatsApp credentials as server-local state; when moving to a new office server PC, relink the WhatsApp account on that machine instead of committing or copying secrets through git.

---

Source: docs/deployment/cloudflare-tunnel.md

# Cloudflare Tunnel Deployment

This guide is for exposing the Nara backend from the office PC without moving the database to a cloud host.

## Target Shape

```text
Mobile app / desktop app / future WhatsApp automation
        |
Cloudflare Tunnel public URL
        |
Office PC running Nara backend
        |
PostgreSQL + Redis stay local
```

Only the backend API should be reachable through the tunnel. PostgreSQL and Redis must remain private.

## Why Tunnel Instead of Railway

Cloud hosting is useful later, but it changes the main deployment model. If Railway or a VPS hosts the backend and database, the office PC is no longer the main server. Cloudflare Tunnel keeps the current local-server plan:

- backend runs on the office PC
- database stays local
- no router port forwarding
- no public database exposure
- mobile and desktop apps can still reach a public backend URL

## Backend Settings

For local-only development:

```env
PORT=4000
TRUST_PROXY=false
CORS_ORIGINS=
```

For Cloudflare Tunnel:

```env
NODE_ENV=production
PORT=4000
TRUST_PROXY=true
CORS_ORIGINS=https://your-tunnel-hostname.example.com
```

When `NODE_ENV=production` and `CORS_ORIGINS` is empty, browser CORS is disabled by default. Native mobile and desktop clients are not blocked by browser CORS in the same way a web page is, but keeping `CORS_ORIGINS` explicit helps if the local web admin panel is ever opened through the tunnel.

## Cloudflare Tunnel Route

The tunnel should forward public traffic to the local backend:

```text
https://your-tunnel-hostname.example.com -> http://127.0.0.1:4000
```

Do not expose:

```text
localhost:5432  # PostgreSQL
localhost:6379  # Redis
```

## App Client Settings

Mobile and desktop apps should not hardcode `localhost`.

Each app should support a server URL setting:

```text
https://your-tunnel-hostname.example.com
```

For office LAN-only usage, the same setting can point to:

```text
http://192.168.x.x:4000
```

## Security Checklist Before Remote Access

Before using the tunnel for real operations:

- protect all write endpoints with operator authentication
- keep `AGENT_API_SECRET` private
- keep `JWT_SECRET` strong and private
- expose only the backend API, never Postgres or Redis
- configure `CORS_ORIGINS` for any browser-based client URL
- add rate limiting before wider use
- keep dashboard/admin features behind auth

## Suggested MVP Order

1. Keep local LAN development working.
2. Add backend operator auth.
3. Add server URL settings to mobile/desktop clients.
4. Add Cloudflare Tunnel to expose only the backend API.
5. Add WhatsApp integration after agent tools and auth are stable.

---

Source: docs/design/ui-ux-brief.md

# Nara UI/UX Brief

Status: implementation draft

Detailed screen-level specs:

- [App Frontend UX Spec](app-frontend-spec.md)
- [Web Admin UX Spec](web-admin-spec.md)
- [Visual System Baseline](visual-system.md)

## Product Shape

Nara has two frontend tracks with different jobs:

1. User-facing app frontend for mobile and desktop.
2. Local web admin dashboard for the office server PC.

The OpenClaw WhatsApp agent is the main product selling point. The app and admin dashboard should support that agent experience instead of competing with it.

## Design Direction

Baseline direction:

Light premium operational SaaS with a warm off-white base, white surfaces, dense but readable layouts, small-radius controls, and subtle emerald/teal accents for agent, WhatsApp, OpenClaw, and healthy system states.

This direction is ready for early implementation and can be replaced later if a stronger visual reference is chosen. Avoid highly decorative landing-page styling, large marketing hero sections, playful illustrations, heavy dark-mode-first surfaces, and one-note purple/blue gradients.

## App Frontend

The app is the daily user surface for mobile and desktop. It should feel personal, fast, and calm.

### Primary Users

Operators or business users who want to:

- See what needs attention today.
- Add and complete tasks quickly.
- Set reminders and schedules.
- Configure assistant personality and behavior.
- Approve or reject agent-triggered actions.
- Check whether the app is connected to the office server.

### App Navigation

Mobile:

- Home
- Tasks
- Reminders
- Assistant
- Settings

Desktop:

- Left sidebar with the same sections.
- Main content area optimized for scanning and batch work.
- Right contextual panel only when useful, such as task detail or approval detail.

### App Screens

#### Home

Purpose: daily command center.

Content:

- Today summary.
- Next due tasks.
- Upcoming reminders.
- Agent status.
- Latest WhatsApp/agent activity.
- Pending approvals.

Primary actions:

- Add task.
- Add reminder.
- Review approval.
- Open assistant setup.

#### Tasks

Purpose: manage user work.

Content:

- Task list with status, due date, and source.
- Filters: all, pending, overdue, done.
- Task detail/edit panel.

Primary actions:

- Create task.
- Complete task.
- Reschedule task.
- Add notes.

#### Reminders

Purpose: manage scheduled follow-ups.

Content:

- One-time reminders.
- Recurring reminders.
- Upcoming schedule.
- Delivery channel status.

Primary actions:

- Create reminder.
- Pause recurring reminder.
- Edit recurrence.

#### Assistant

Purpose: configure how Nara behaves.

Content:

- Personality preset.
- Reply tone.
- Action boundaries.
- WhatsApp behavior.
- Confirmation rules.
- Memory/context preferences.

Primary actions:

- Update personality.
- Test sample reply.
- Toggle confirmation requirements.

#### Approvals

Purpose: review agent-triggered actions before execution.

Content:

- Action summary.
- Source message or trigger.
- Risk level.
- Proposed payload.
- Previous related context.

Primary actions:

- Approve.
- Reject.
- Edit before approval.

#### Settings

Purpose: app connection and account setup.

Content:

- Backend server URL.
- Connection status.
- Operator login status.
- Notification preferences.
- App version and diagnostics.

Primary actions:

- Save server URL.
- Test connection.
- Log out.

## Web Admin Dashboard

The web dashboard is local admin tooling for the office PC. It should feel like a server control surface, not the main app.

### Primary Users

Admin/operator on the office PC who needs to:

- Verify the backend is healthy.
- Debug OpenClaw and tool endpoints.
- Inspect logs.
- Check local config.
- Manage backups and exports.

### Admin Navigation

- Overview
- Health
- Agent Tools
- Logs
- Config
- Backup

### Admin Screens

#### Overview

Purpose: high-level operational state.

Content:

- Backend status.
- PostgreSQL status.
- Redis status.
- OpenClaw status.
- WhatsApp bridge status.
- Recent errors.
- Recent agent actions.

Primary actions:

- Refresh status.
- Open logs.
- Run readiness check.

#### Health

Purpose: dependency diagnostics.

Content:

- Service status cards.
- Latency/last checked time.
- Human-readable failure messages.
- Suggested fix notes.

Primary actions:

- Recheck.
- Copy diagnostic summary.

#### Agent Tools

Purpose: debug tool endpoint behavior.

Content:

- Tool list.
- Input editor.
- Result panel.
- Last request/response.

Primary actions:

- Run tool test.
- Reset payload.
- Copy result.

#### Logs

Purpose: inspect local runtime behavior.

Content:

- Backend logs.
- Agent logs.
- Readiness events.
- Error filter.

Primary actions:

- Filter logs.
- Copy selected log.
- Export log bundle.

#### Config

Purpose: verify setup without exposing secrets.

Content:

- Environment variable presence.
- Masked token status.
- API URL.
- Tunnel status.
- Storage paths.

Primary actions:

- Recheck config.
- Copy redacted diagnostics.

#### Backup

Purpose: local data safety.

Content:

- Last backup.
- Export targets.
- Database export status.
- Report archive status.

Primary actions:

- Run backup.
- Export data.
- Download report bundle.

## Shared Interaction Rules

- Read-only surfaces may be accessible after connection checks.
- Write actions require authenticated operator token.
- Sensitive agent actions require explicit approval.
- Destructive actions require confirmation.
- Empty states should say what is missing and offer one clear next action.
- Error states should include the failing dependency and one suggested fix.
- Loading states should preserve layout size to avoid jumping.

## Component System

Shared primitives:

- App shell.
- Sidebar or bottom navigation.
- Header action bar.
- Status badge.
- Dependency status row.
- Task row.
- Reminder row.
- Approval card.
- Settings form section.
- Log row.
- Tool test panel.
- Confirmation dialog.

Icon guidance:

- Use lucide icons for web/Tauri where available.
- Use platform-native icon equivalents in Flutter.
- Prefer icons for recurring tool actions such as refresh, copy, approve, reject, edit, save, and settings.

## Visual Constraints

- Use compact headings inside panels.
- Keep cards for repeated items and tool panels only.
- Do not nest cards inside cards.
- Keep buttons stable in width and height.
- Use 8px radius or less unless platform conventions require otherwise.
- Do not use viewport-width-based font sizing.
- Avoid text overlap at mobile widths.
- Avoid decorative orbs, bokeh backgrounds, and large gradient hero sections.

## First Prototype Scope

Build only enough to validate structure:

1. App Home.
2. App Tasks.
3. App Assistant setup.
4. App Approvals.
5. Admin Overview.
6. Admin Agent Tools.
7. Admin Config/Health.

Use realistic mock data first. Wire live backend only where it already exists and does not slow design iteration.

See the detailed specs for implementation-ready screen requirements and component candidates.

## Open Questions

- First implementation target: web prototype, Flutter scaffold, or Tauri shell.
- Whether the app frontend should share React/Tauri UI first before Flutter, or Flutter should be the first app implementation.

---

Source: docs/design/app-frontend-spec.md

# Nara App Frontend UX Spec

Status: implementation draft

This spec covers the user-facing app experience for mobile and desktop. It should guide Flutter and Tauri UI work without deciding final visual styling.

## Product Role

The app is the daily control surface for the person using Nara. WhatsApp remains the most conversational surface, but the app is where the user reviews work, configures Nara, and approves sensitive actions.

User-facing wording should use Nara Bot for the WhatsApp agent experience. Avoid exposing OpenClaw terminology in normal user flows except inside open source attribution or diagnostics.

## Navigation Model

Mobile uses bottom navigation:

- Home
- Tasks
- Reminders
- Assistant
- Settings

Desktop uses a persistent left sidebar:

- Home
- Tasks
- Reminders
- Assistant
- Approvals
- Settings

On mobile, Approvals should appear as a high-priority module on Home and inside Assistant until it becomes frequent enough to deserve a bottom-nav slot.

## Shared Layout Rules

- Screen title appears at the top with one primary action at most.
- Dense lists should use rows, not large decorative cards.
- Detail/edit views should be sheets on mobile and side panels on desktop.
- Empty states should include one action.
- Blocking errors should include the backend dependency or connection that failed.
- Successful write actions should use quiet confirmations, not modal interruptions.

## Screen: Home

Purpose: show what needs attention now.

### Default Layout

Top area:

- Greeting or current day label.
- Server/agent status chip.
- Nara Bot WhatsApp access status when available.
- Primary action: add task.

Main sections:

- Today summary.
- Pending approvals.
- Next tasks.
- Upcoming reminders.
- Recent agent activity.
- WhatsApp access state.

### Key States

Connected:

- Show live status and current data.

Disconnected:

- Keep cached/mock layout visible if available.
- Show a connection warning with "Open Settings" and "Retry".

No tasks:

- Show short empty state and "Add Task".

Pending approvals:

- Put approvals above normal tasks.
- Use risk labels: low, medium, high.

### MVP Components

- StatusChip
- SummaryMetric
- TaskRow
- ReminderRow
- ApprovalPreview
- ActivityRow

## Screen: Tasks

Purpose: create, review, complete, and reschedule tasks.

### Default Layout

Top controls:

- Search.
- Filter segmented control: Pending, Overdue, Done, All.
- Primary action: add task.

List:

- Status icon.
- Title.
- Due date.
- Source: app, WhatsApp, schedule, agent.
- Optional description preview.

Detail panel/sheet:

- Title.
- Description.
- Due date.
- Status.
- Source metadata.
- Notes.

### Key States

Creating:

- Required title.
- Optional description.
- Optional due date.

Completing:

- Optimistically mark complete.
- Restore on failed request.

Overdue:

- Clear date treatment.
- Do not rely only on color.

### MVP Components

- TaskFilter
- TaskRow
- TaskEditor
- DueDatePicker
- SourceBadge

## Screen: Reminders

Purpose: manage one-time and recurring reminders.

### Default Layout

Sections:

- Upcoming.
- Recurring.
- Paused.

Reminder row:

- Title.
- Next run.
- Recurrence summary.
- Delivery channel.
- Enabled state.

### Key States

No reminders:

- Show "Create Reminder".

Paused:

- Keep visible, but lower emphasis.

Delivery issue:

- Show channel status and suggested fix.

### MVP Components

- ReminderRow
- RecurrenceSummary
- ChannelBadge
- ReminderEditor

## Screen: Assistant

Purpose: configure Nara's behavior.

### Default Layout

Sections:

- Personality.
- Reply tone.
- Action boundaries.
- WhatsApp behavior.
- WhatsApp number access.
- Confirmation rules.
- Memory/context.

### Personality Controls

Suggested controls:

- Preset selector.
- Tone slider or segmented control.
- Short instruction textarea.
- Sample reply preview.

Presets:

- Balanced.
- Formal.
- Concise.
- Proactive.

### Action Boundaries

Controls:

- Require approval for destructive actions.
- Require approval for external sends.
- Allow task creation from WhatsApp.
- Allow schedule creation from WhatsApp.

### WhatsApp Access

Purpose: let the user connect their WhatsApp number to Nara Bot.

Content:

- WhatsApp phone number.
- Access status: pending verification, pending Nara Bot approval, allowed, blocked, sync failed.
- Last sync time.
- Help text that tells the user which number to message when ready.

Primary actions:

- Add or update number.
- Request Nara Bot access.
- Retry sync when failed.

### MVP Components

- PresetSelector
- ToneControl
- BoundaryToggle
- SampleReplyPreview
- ConfirmationRuleRow

## Screen: Approvals

Purpose: approve, reject, or edit agent-triggered actions.

### Default Layout

Approval item:

- Action title.
- Source message.
- Proposed payload.
- Risk level.
- Timestamp.
- Related task/client when available.

Actions:

- Approve.
- Reject.
- Edit.

### Key States

High-risk:

- Require explicit confirmation.
- Show why it is high-risk.

Edited before approval:

- Show edited fields before submit.

Rejected:

- Ask for optional reason only when useful.

### MVP Components

- ApprovalCard
- RiskBadge
- PayloadPreview
- ApprovalActions

## Screen: Settings

Purpose: configure account, privacy, notifications, legal, and app information without exposing backend implementation details.

### Default Layout

Sections:

- Account.
- Nara Bot and WhatsApp setup.
- Notifications.
- Data and Privacy.
- Terms and Privacy Policy.
- Appearance.
- Open Source Attribution.
- About Nara.

### Key States

Backend unavailable:

- Keep health checks silent until a user action fails.
- Show user-facing recovery copy, not backend diagnostics.

Logged out:

- Show login CTA. Backend routing remains build-configured, not user-edited.

### MVP Components

- NotificationSettings
- WhatsAppAccessStatus
- OpenSourceAttribution
- DataPrivacySummary
- LegalPolicyScreen
- AboutScreen

## First Build Recommendation

Build App Home, Tasks, Assistant, and Approvals first with mock data. Keep backend routing hidden from normal users; use build configuration for development overrides.

Do not build reports, client management, or advanced schedule editing until the operational core is stable.

---

Source: docs/design/web-admin-spec.md

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

---

Source: docs/design/visual-system.md

# Nara Visual System Baseline

Status: baseline for implementation, replaceable after visual review

This document defines the default visual direction for early Nara UI implementation. It is intentionally restrained so both the app frontend and web admin dashboard can ship without requiring a full brand exercise first.

## Direction

Use a light premium operational SaaS style:

- Warm off-white base.
- Dense but readable layout.
- Small-radius controls.
- Clear status language.
- Subtle emerald/teal accents for agent, WhatsApp, OpenClaw, and healthy states.
- Minimal decoration.

The interface should feel calm, polished, and trustworthy, not playful or marketing-led.

## Palette

Use these roles rather than hardcoding meaning into one color:

- Background: warm off-white.
- Surface: white.
- Surface raised: soft neutral.
- Border: light stone/slate.
- Text primary: deep slate.
- Text secondary: muted slate.
- Accent primary: teal for primary actions and focus.
- Accent agent: green for healthy agent/WhatsApp/OpenClaw states.
- Warning: amber.
- Danger: rose/red.

Tailwind-friendly starting values:

- Background: `stone-50`
- Surface: `white`
- Surface raised: `slate-50`
- Border: `slate-200`
- Border strong: `slate-300`
- Text primary: `slate-950`
- Text secondary: `slate-600`
- Text muted: `slate-500`
- Primary: `teal-600`
- Primary hover: `teal-700`
- Agent/healthy: `emerald-600`
- Warning: `amber-500`
- Danger: `rose-600`

## Typography

- Use compact headings.
- Avoid oversized hero type inside the app or admin dashboard.
- Use normal letter spacing.
- Keep body copy short and operational.

Suggested hierarchy:

- Page title: 24px desktop, 20px mobile.
- Section title: 16px.
- Row title: 14px.
- Supporting text: 13px.
- Metadata: 12px.

## Radius And Spacing

- Default radius: 6px.
- Maximum card/panel radius: 8px.
- Button height: 40px desktop, 44px mobile when touch target matters.
- Icon button: stable square size, 36px or 40px.
- Panel padding: 16px desktop, 14px mobile.
- List row vertical padding: 12px.

## Component Treatment

### Panels

Use panels for bounded tools and repeated content groups. Do not put panels inside panels unless it is a modal, drawer, or code/result viewer.

### Lists

Use rows for tasks, reminders, approvals, logs, tools, and config fields. Rows should remain scannable and stable.

### Buttons

Use icon + text for primary commands when space allows. Use icon-only buttons for repeated tools such as refresh, copy, edit, save, approve, reject, settings, and close.

### Status

Every status should have:

- Label.
- Color.
- Optional icon.
- Human-readable message when unhealthy.

Do not rely only on color.

### Forms

Use grouped sections with clear labels. Avoid long forms on mobile; use sheets or step sections for assistant setup.

## App-Specific Feel

The app frontend should feel calmer and more personal than the admin dashboard:

- More whitespace than admin.
- Home screen focuses on today and pending decisions.
- Assistant setup can use clearer explanatory labels, but avoid tutorial-like paragraphs.
- WhatsApp/agent status should feel central but not noisy.

## Admin-Specific Feel

The web admin dashboard should feel denser and more technical:

- Tables and diagnostic rows are preferred.
- Status, logs, and config should be easy to scan.
- Copy/debug/export actions should be visible near the data they affect.
- Do not add consumer-app flourishes.

## Avoid

- Large marketing hero sections.
- Decorative gradients as primary backgrounds.
- Floating decoration or glow-heavy layouts.
- Purple/blue-only palettes.
- Beige/brown/orange product themes that overpower the operational UI.
- Heavy dark-mode-first surfaces.
- Text-heavy onboarding panels on operational screens.
- Hiding important server errors behind vague "something went wrong" messages.



---

## Phase 6 Web Admin Panel - Completion Status

**Status:** Core screens complete (Updated: 2026-06-10)

### Completed Items

All Phase 6 admin dashboard screens are now built and functional:

1. **Overview (Dashboard)** - `/`
   - Refactored to use shared Layout component
   - Operator authentication integrated
   - Dependency status cards (Backend, PostgreSQL, Redis, OpenClaw)
   - Task management with create/complete functionality
   - Consistent visual styling with other admin pages

2. **Health** - `/health`
   - Dependency diagnostics for all services
   - Status cards with last checked timestamps
   - Recheck button with loading states
   - Copy diagnostics for debugging
   - Suggested fixes for unhealthy services

3. **Agent Tools** - `/agent-tools`
   - Tool endpoint testing interface
   - JSON payload editor with validation
   - Test runner with x-agent-secret authentication
   - Response viewer with status, duration, timestamp
   - Pre-populated example payloads for all tools

4. **Users** - `/users`
   - User table with name, email, role, status, created date
   - Create user form (inline)
   - Role badges (admin/user with visual distinction)
   - Status indicators (active/disabled)
   - Empty state with CTA

5. **WhatsApp Access** - `/whatsapp-access`
   - Access request table with status tracking
   - Status management: approve, block, retry sync
   - Status badges for all states (pending, allowed, blocked, sync_failed)
   - Sync error display and resolution
   - Status guide documentation

6. **Logs** - `/logs`
   - Filter controls: source, severity, search, time range
   - Log table with expandable metadata
   - Export functionality
   - Ready for backend `/api/logs` integration
   - Empty state with backend integration instructions

7. **Config** - `/config`
   - Environment verification display
   - Required/optional config indicators
   - Status checks from readiness API + localStorage
   - Category grouping (Backend, Database, Redis, OpenClaw, Agent, Frontend)
   - Copy report functionality
   - Configuration notes and help text

8. **Backup** - `/backup`
   - Backup status summary
   - Export sections: Database, Reports, Config
   - Run backup action (ready for backend)
   - Backup history table placeholder
   - Restore procedure documentation

### Technical Implementation

- **Shared Layout:** All admin pages now use unified Layout component with functional sidebar navigation
- **Routing:** Complete routing setup in App.tsx for all 10 admin routes
- **API Integration:** Added types and functions to lib/api.ts for users and agent access
- **Visual Consistency:** All screens follow visual system specs (stone-50 bg, teal accents, emerald success states)
- **TypeScript:** All code type-safe, compilation verified with no errors
- **Files Changed:** 19 files, 2,573 insertions, 218 deletions

### Pending Items

- [x] Open source attribution section
- [x] Backend API integration for Logs screen
- [x] Backend API integration for Backup screen
- [x] Enhanced WhatsApp Access with joined user/contact data

### Backend Integration Status

See **[Backend Integration Requirements](backend-integration.md)** for detailed specifications.

**Completed:**

1. **Logs System**
   - `GET /api/logs` with filtering, search, pagination
   - Current MVP reads from audit events in PostgreSQL
   - Response includes timestamp, source, level, message, metadata
   - Backend process writes structured request/error logs to `BACKEND_LOG_DIR` or `.tmp/logs/backend.ndjson`

2. **WhatsApp Access Enhancement**
   - `GET /api/agent-access` returns joined user + contact data
   - Admin UI shows displayName and phone number instead of UUIDs

3. **Backup System**
   - `POST /api/backup` - trigger full backup
   - `POST /api/backup/export` - export specific data type
   - `GET /api/backup/history` - list backup records
   - MVP writes local backup history and JSON snapshots
   - Database export uses pg_dump from the host or Docker PostgreSQL container

### Next Steps

1. Harden mobile auth storage by moving tokens from shared preferences to secure storage
2. Tighten server-side authorization for user contact read/create endpoints
3. Add reminders once backend schedule/reminder endpoints are ready
4. Add approval queue once backend approval endpoints exist
5. Consider scheduled backup automation via BullMQ after mobile MVP is moving

### Related Documentation

- [Mobile App Notes](mobile-app.md) - Flutter run commands, physical device notes, and next mobile work
- [Backend Integration Requirements](backend-integration.md) - Detailed API specifications
- [Web Admin UX Spec](design/web-admin-spec.md) - Complete screen specifications
- [Visual System Baseline](design/visual-system.md) - Design system and styling guide
- [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) - Identity and access model

---

*Phase 6 update: 2026-06-11*
*Admin dashboard core screens: Complete*

*Phase 4 mobile update: 2026-06-11*
*Mobile login/register is backed by database users. Admin/operator env credentials remain for the local web admin dashboard. Mobile now defaults to the Nara backend tunnel and keeps backend routing hidden from normal users, while `NARA_API_BASE_URL` remains available for development overrides. Tasks can create and complete backend tasks from mobile. The app persists the user session with shared_preferences, auto-refreshes silently on app resume and timer, uses pull-to-refresh for data refresh, and supports custom assistant personality input.*
*Phase 4 mobile update: 2026-06-12*
*Assistant preferences are persisted locally, WhatsApp number/contact registration is wired to the existing identity API, Nara Bot access requests are sent from mobile, and Home/Assistant now show live access status from user-scoped backend agent-access data. Next hardening: secure token storage and stricter contact endpoint authorization.*
*Phase 4 mobile update: 2026-06-12*
*Tasks are now scoped by signed-in user tokens, with priority, due date, and source metadata. Mobile Tasks groups work into Today, Open, and Done; Home now highlights Today tasks instead of a generic latest-task list.*
*Phase 4 mobile update: 2026-06-12*
*Mobile no longer exposes backend URL, backend mode, or connection-test UX to normal users. The app defaults to `https://narabot.web.id`, keeps backend health checks silent, adds animated tab transitions, and expands Settings with Notifications, Data and Privacy, Terms, Open Source Attribution, Appearance, and About screens. Admin task endpoints now show global/admin tasks by default rather than user task content.*
*Mobile auth UI handoff: 2026-06-13*
*Next mobile polish should redesign the welcome/login/register surface away from scaffold-like infrastructure copy and toward a distinctive user-facing Nara assistant identity. See `docs/mobile-app.md` for the auth UI redesign brief.*
*Phase 7 agent update: 2026-06-13*
*OpenClaw integration now has user-context-first tool contracts. Agent tools resolve user context by userId or future WhatsApp contact value, load backend assistant profiles for per-user tone/autonomy/action permissions, and scope task create/list/complete/delete to that user. `npm run agent:smoke` verifies the no-WhatsApp simulation path.*
*Backend integration: MVP complete*
