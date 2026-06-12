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
  - Assistant
  - Settings
- Backend API client using Dart `HttpClient`
- Login/register screen backed by database users
- Shared in-memory app state for backend connection, current user, and tasks
- Persisted backend URL, auth token, and user profile through `shared_preferences`
- Home dashboard with server status, task summary, latest tasks, Nara Bot status, and quick actions
- Auto server health refresh when the app opens/resumes and every few minutes
- Pull-to-refresh for Home, Tasks, and Settings connection checks
- Settings screen for backend URL, connection status, account summary, and logout
- Tasks screen can fetch, create, and complete backend tasks
- Task completion uses optimistic UI and rolls back when the backend rejects the update
- Assistant preferences are persisted locally with `shared_preferences`
- Assistant screen can save personality, custom personality, autonomy, allowed-action toggles, WhatsApp number, and Nara Bot access request
- WhatsApp access status is loaded from `GET /api/users/:id/agent-access` and shown on Home and Assistant
- Settings screen validates the backend URL and includes an explicit connection test action
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

Debug builds still provide convenient local defaults:

- Android emulator: `http://10.0.2.2:4000`
- Windows desktop/debug host: `http://127.0.0.1:4000`

Release builds should pass `NARA_API_BASE_URL` or let the user enter the server URL during sign in. Do not rely on a developer PC IP as a product default.

For connectivity checks, the mobile app uses `/health`. Detailed dependency readiness remains available at `/api/readiness`, but it can be degraded when OpenClaw is not running even while normal backend routes still work.

## Physical Android Testing

Wireless debugging has been used successfully with a physical Android phone.

When the app runs on a phone, `127.0.0.1` points to the phone itself. Use the backend host LAN IP or Cloudflare Tunnel URL during sign in or in Settings:

```text
http://192.168.x.x:4000
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

## Assistant and WhatsApp Access

The current mobile MVP uses existing identity endpoints:

- `GET /api/users/:id/contacts`
- `POST /api/users/:id/contacts`
- `POST /api/users/:id/agent-access`
- `GET /api/users/:id/agent-access`

The app stores assistant behavior preferences locally. WhatsApp number and access request state are stored in the backend. Mobile reads the signed-in user's access records from the user-scoped endpoint; the global `GET /api/agent-access` endpoint remains for admin-style access management.

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
2. Scope tasks by signed-in user. Current `/api/tasks` data is global, so tasks created from the admin dashboard also appear in the mobile app.
3. Add stricter server-side authorization to the existing contact create/read endpoints.
4. Add reminders once backend schedule/reminder endpoints are ready.
5. Add approval queue once backend approval endpoints exist.
6. Add notification strategy after reminder behavior is stable.
