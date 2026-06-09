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