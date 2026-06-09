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

Purpose: configure app connection and account behavior.

### Default Layout

Sections:

- Server connection.
- Operator session.
- WhatsApp number.
- Notifications.
- Diagnostics.
- Open source attribution.

Server connection fields:

- Backend API URL.
- Connection test result.
- Last successful connection.

### Key States

Invalid URL:

- Validate before saving.

Connection failed:

- Show reason from readiness response when possible.

Logged out:

- Show login CTA and keep connection settings accessible.

### MVP Components

- ServerUrlForm
- ConnectionStatus
- OperatorSession
- NotificationSettings
- WhatsAppAccessStatus
- OpenSourceAttribution

## First Build Recommendation

Build App Home, Tasks, Assistant, and Approvals first with mock data. Add Settings connection next so the app can point to the office server.

Do not build reports, client management, or advanced schedule editing until the operational core is stable.