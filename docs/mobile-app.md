# Mobile App

Status: Flutter scaffold runs on a physical Android device through wireless debugging and has user login/register wired to the backend.

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
- Home dashboard with server status, task summary, latest tasks, and quick actions
- Auto server readiness refresh when the app opens/resumes and every few minutes
- Pull-to-refresh for Home, Tasks, and Settings connection checks
- Settings screen for backend URL, connection status, account summary, and logout
- Tasks screen can fetch, create, and complete backend tasks
- Assistant screen has initial personality, custom personality, autonomy, allowed-action, and WhatsApp access controls
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

## Next Work

1. Move token storage from `shared_preferences` to secure storage before production hardening.
2. Add WhatsApp number entry and Nara Bot access request flow.
3. Add reminders once backend schedule/reminder endpoints are ready.
4. Add approval queue once backend approval endpoints exist.
5. Add notification strategy after reminder behavior is stable.
