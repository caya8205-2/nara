# Mobile App

Status: Flutter app runs on a physical Android device through wireless debugging and has user login/register, tasks, assistant preferences, and WhatsApp access request wired to the backend.

## Project Location

```text
apps/mobile-app
```

The mobile app is the main user-facing Nara app. The backend remains the source of truth for tasks, schedules, user identity, Nara Bot access, and future approvals.

## Current Implementation

- Flutter project source scaffold
- Nara visual baseline theme
- Bottom navigation:
  - Home
  - Tasks
  - Reminders
  - Nara
  - Me
- Backend API client using Dart `HttpClient`
- Login/register screen backed by database users
- Production-facing default API URL: `https://narabot.web.id`
- Polished Nara-branded onboarding and welcome/login/register flow, with smooth transition into auth and app shell
- Shared in-memory app state for current user, tasks, and silent backend health
- Persisted auth token through an Android Keystore-backed local secure store; non-sensitive local cache such as user profile, theme, language, assistant preferences, and WhatsApp prompt state remains in `shared_preferences`
- Home dashboard with task summary, completable Today tasks, quick add task, Nara Bot status, and inline WhatsApp access request
- Auto server health refresh when the app opens/resumes and every few minutes
- Pull-to-refresh for Home, Tasks, and Nara data
- Product-grade Me tab with Notifications, Data & Privacy, Terms, Open Source Attribution, About, account summary, and logout
- Tasks screen can fetch, create, and complete signed-in user tasks
- Tasks support priority, due date, source labels, and Today/Open/Done grouping
- Task completion uses optimistic UI and rolls back when the backend rejects the update
- Assistant preferences sync to the backend assistant profile and are cached locally with `shared_preferences`
- Nara screen can save personality, custom personality, autonomy, allowed-action toggles, WhatsApp number, and Nara Bot access request
- First-run WhatsApp setup prompt appears when a signed-in user has not connected a WhatsApp number yet
- WhatsApp access status is loaded from `GET /api/users/:id/agent-access` and shown on Home and Nara
- Pending approvals are surfaced as a high-priority module on Home and Nara, with quick approve/reject actions and the existing Approvals screen kept as the detail view
- Android local fallback notifications alert the signed-in user for due reminders when WhatsApp is not connected/allowed or when backend WhatsApp delivery records a failure/skipped status
- Optional machine-specific Android SDK relocation if a Windows username or SDK path with whitespace causes NDK tooling issues

## Run Locally

Run Flutter commands from the mobile app folder:

```powershell
cd apps/mobile-app
flutter pub get
flutter devices
flutter run
```

If Flutter says `No pubspec.yaml file found`, the command was run from the monorepo root instead of `apps/mobile-app`.

When dependencies change, stop the running app and start `flutter run` again. Hot reload is not enough for newly added plugins such as `shared_preferences`.

## Backend URL

The mobile app reads the backend URL from `NARA_API_BASE_URL` when provided:

```powershell
flutter run --dart-define=NARA_API_BASE_URL=http://192.168.x.x:4000
```

Normal builds default to:

```text
https://narabot.web.id
```

Use `NARA_API_BASE_URL` only for local development overrides. The app no longer exposes a backend URL field in login or Settings.

For connectivity checks, the mobile app uses `/health`. Detailed dependency readiness remains available at `/api/readiness`, but it can be degraded when OpenClaw is not running even while normal backend routes still work.

## Physical Android Testing

Wireless debugging has been used successfully with a physical Android phone.

The app now defaults to the Cloudflare Tunnel URL. For local backend testing from a phone, pass the backend LAN URL at launch:

```powershell
flutter run --dart-define=NARA_API_BASE_URL=http://192.168.x.x:4000
```

Backend should be running on the office server or development PC:

```powershell
npm run dev
```

## Authentication

Mobile auth uses database-backed user accounts:

- `POST /api/auth/register`
- `POST /api/auth/user-login`
- `GET /api/auth/me`

Admin/operator credentials from `.env` remain for the local web admin dashboard and are not the mobile user login path.

The mobile auth token is stored with an Android Keystore-backed MethodChannel store implemented in the app's Android host code. On first launch after upgrading from older builds, the app migrates the legacy `shared_preferences` token into secure storage and removes the old preference key. Non-sensitive app preferences stay in `shared_preferences`.

## Nara Bot and WhatsApp Access

The current mobile MVP uses existing identity endpoints:

- `GET /api/users/:id/contacts`
- `POST /api/users/:id/contacts`
- `GET /api/users/:id/assistant-profile`
- `PUT /api/users/:id/assistant-profile`
- `POST /api/users/:id/agent-access`
- `GET /api/users/:id/agent-access`

The app stores assistant behavior preferences in the backend so Nara Bot/OpenClaw can apply the user's tone, autonomy, and allowed-action settings. A local `shared_preferences` copy remains as a fallback cache. WhatsApp number and access request state are stored in the backend. Mobile reads the signed-in user's access records from the user-scoped endpoint; the global `GET /api/agent-access` endpoint remains for admin-style access management.

## Tasks

Task data is scoped by the signed-in user. The mobile app calls authenticated `/api/tasks` endpoints and only receives tasks where `tasks.user_id` matches the current user token. The local operator dashboard can still inspect all tasks for server-side maintenance.

Task rows include:

- title and optional notes
- priority: low, normal, high, urgent
- due date
- source: manual, admin, Nara, or schedule

## Reminders

Reminder data is stored in PostgreSQL and scoped to the signed-in mobile user through authenticated endpoints:

- `GET /api/reminders`
- `GET /api/reminders/execution`
- `GET /api/reminders/:id`
- `POST /api/reminders`
- `PATCH /api/reminders/:id`
- `DELETE /api/reminders/:id`

The mobile screen supports creating, listing, pausing, resuming, deleting, and pull-to-refresh. One-time reminders use `scheduledAt`. Recurring reminders currently offer daily, weekly, and monthly presets backed by cron expressions and the `Asia/Jakarta` timezone.

The backend now records due reminders through a BullMQ worker backed by Redis. Mobile reads execution fields from reminder list responses, including `nextRunAt`, `lastTriggeredAt`, `lastTriggerStatus`, and `lastTriggerMessage`, and shows next/last recorded timing in the reminder list. The first delivery path sends due user reminders through OpenClaw WhatsApp when an allowed WhatsApp contact exists.

Android fallback notifications are local to the app. The Flutter layer periodically refreshes reminders while a signed-in session is active, then uses the Android host `nara/local_notifications` channel to show a notification once per due or failed-delivery event. This covers cases where WhatsApp is not allowed/connected or the backend records `delivery_failed`/`delivery_skipped`. It does not replace backend processing and it is not a push notification service; if the app has not synced recently, the backend/OpenClaw path remains the primary delivery path.

## Approvals

The existing Approvals screen is connected to backend approval records:

- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

Agent tool calls that need confirmation now create pending approval records. Approving a record runs the stored action payload, then refreshes tasks, reminders, and approvals in the app. Rejecting a record closes it without running the action.

Approvals no longer need a primary bottom-navigation slot. Home and Nara show a high-priority pending approval module with counts and quick approve/reject controls; opening the module still uses the existing Approvals screen for the full list/detail flow.

## Validation

From the mobile app folder:

```powershell
$env:DART_SUPPRESS_ANALYTICS='true'
$env:APPDATA='C:\Users\ThinkPad T470\Desktop\Coding\nara\.tmp\appdata'
& 'C:\Users\ThinkPad T470\flutter\bin\cache\dart-sdk\bin\dart.exe' analyze lib
```

The `APPDATA` override is only needed inside the Codex sandbox when Dart telemetry cannot write to the real user AppData folder.

## Auth UI Redesign Handoff

The current welcome/login/register surface is functional, but it still feels too generic and too close to a scaffold. The next UI pass should make the first screen feel like Nara as a personal work assistant, not like an infrastructure dashboard.

### Product Direction

- Keep the first screen user-facing and benefit-led.
- Avoid developer-facing copy such as private server, backend mode, public cloud, API URL, connection status, agent workflow, or similar infrastructure language.
- Present Nara as an assistant for keeping tasks, follow-ups, reminders, and WhatsApp-powered work conversations organized.
- Keep OpenClaw, tunnel, server, and backend details in Settings, About, admin diagnostics, or docs only.

### Visual Direction

- Replace the current template-like grid/background treatment with a more distinctive assistant/workspace identity.
- Make the screen feel warm, focused, and mobile-native rather than a generic SaaS landing page.
- Use visual cues around daily work, command center, tasks, reminders, and future Nara Bot access without relying on emoji placeholders.
- Keep the hero simple: the app name can stay prominent, while the supporting text explains the everyday benefit.

### Copy Direction

Suggested tone:

```text
Nara
Asisten kerja pribadi untuk menjaga tugas, pengingat, dan follow-up tetap rapi.
```

Other acceptable copy themes:

- "Mulai hari kerja dengan daftar yang jelas."
- "Catat tugas, atur pengingat, dan siapkan Nara Bot untuk membantu lewat WhatsApp."
- "Atur cara Nara merespons sesuai gaya kerja kamu."

Avoid copy themes:

- "Private server"
- "Not a public cloud"
- "Agent workflows"
- "Backend health"
- "Self-hosted command center"
- "OpenClaw powered" on the first-run auth screen

### Interaction Requirements

- Login and register should remain real flows, not static cards.
- Feature cards, if kept, should connect to real destinations or state:
  - sign in
  - create account
  - view today's tasks after login
  - request/connect WhatsApp access after login
  - edit assistant personality after login
- Auth errors should use natural user-facing language.
- Loading states should be visible but quiet.
- After successful login/register, transition directly into the app shell without exposing server details.

### Implementation Notes

- Keep backend URL configuration hidden from normal users.
- Do not introduce new dependencies just for the redesign unless the existing Flutter toolkit cannot produce the needed interaction.
- Preserve existing auth behavior, token storage, task loading, and assistant profile syncing.
- Use screenshots from a physical phone or `scrcpy` during polish because Flutter web/Chrome can misrepresent the Android feel.

## Next Work

1. Add push notification delivery if reminders must alert when the app has not synced recently.
2. Add reminder edit controls beyond pause/resume and the current recurrence presets.
