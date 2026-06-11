# Mobile App

Status: initial Flutter scaffold runs on a physical Android device through wireless debugging.

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
- Settings screen for backend URL, readiness test, and operator login
- Tasks screen can fetch existing backend tasks
- Assistant screen has initial tone and behavior controls
- Android SDK was moved to `C:\Android\Sdk` to avoid whitespace issues with NDK tools

## Run Locally

Run Flutter commands from the mobile app folder:

```powershell
cd apps/mobile-app
flutter pub get
flutter devices
flutter run
```

If Flutter says `No pubspec.yaml file found`, the command was run from the monorepo root instead of `apps/mobile-app`.

## Physical Android Testing

Wireless debugging has been used successfully with a physical Android phone.

When the app runs on a phone, `127.0.0.1` points to the phone itself. Use the backend host LAN IP or Cloudflare Tunnel URL in Settings:

```text
http://192.168.x.x:4000
```

Backend should be running on the office server or development PC:

```powershell
npm run dev
```

## Next Work

1. Persist backend URL and operator token securely.
2. Add task creation and completion actions.
3. Add WhatsApp number entry and Nara Bot access request flow.
4. Add reminders once backend schedule/reminder endpoints are ready.
5. Add approval queue once backend approval endpoints exist.
6. Add notification strategy after reminder behavior is stable.
