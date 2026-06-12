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
- Animated welcome screen before login/register, with smooth transition into auth and app shell
- Shared in-memory app state for current user, tasks, and silent backend health
- Persisted auth token and user profile through `shared_preferences`
- Home dashboard with task summary, completable Today tasks, quick add task, Nara Bot status, and inline WhatsApp access request
- Auto server health refresh when the app opens/resumes and every few minutes
- Pull-to-refresh for Home, Tasks, and Nara data
- Product-grade Me tab with Notifications, Data & Privacy, Terms, Open Source Attribution, About, account summary, and logout
- Tasks screen can fetch, create, and complete signed-in user tasks
- Tasks support priority, due date, source labels, and Today/Open/Done grouping
- Task completion uses optimistic UI and rolls back when the backend rejects the update
- Assistant preferences are persisted locally with `shared_preferences`
- Nara screen can save personality, custom personality, autonomy, allowed-action toggles, WhatsApp number, and Nara Bot access request
- First-run WhatsApp setup prompt appears when a signed-in user has not connected a WhatsApp number yet
- WhatsApp access status is loaded from `GET /api/users/:id/agent-access` and shown on Home and Nara
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

## Nara Bot and WhatsApp Access

The current mobile MVP uses existing identity endpoints:

- `GET /api/users/:id/contacts`
- `POST /api/users/:id/contacts`
- `POST /api/users/:id/agent-access`
- `GET /api/users/:id/agent-access`

The app stores assistant behavior preferences locally. WhatsApp number and access request state are stored in the backend. Mobile reads the signed-in user's access records from the user-scoped endpoint; the global `GET /api/agent-access` endpoint remains for admin-style access management.

## Tasks

Task data is scoped by the signed-in user. The mobile app calls authenticated `/api/tasks` endpoints and only receives tasks where `tasks.user_id` matches the current user token. The local operator dashboard can still inspect all tasks for server-side maintenance.

Task rows include:

- title and optional notes
- priority: low, normal, high, urgent
- due date
- source: manual, admin, Nara, or schedule

## Validation

From the mobile app folder:

```powershell
$env:DART_SUPPRESS_ANALYTICS='true'
$env:APPDATA='C:\Users\ThinkPad T470\Desktop\Coding\nara\.tmp\appdata'
& 'C:\Users\ThinkPad T470\flutter\bin\cache\dart-sdk\bin\dart.exe' analyze lib
```

The `APPDATA` override is only needed inside the Codex sandbox when Dart telemetry cannot write to the real user AppData folder.

## Next Work

1. Move token storage from `shared_preferences` to secure storage before production hardening.
2. Add stricter server-side authorization to the existing contact create/read endpoints.
3. Add reminders once backend schedule/reminder endpoints are ready.
4. Add approval queue once backend approval endpoints exist.
5. Add notification strategy after reminder behavior is stable.
