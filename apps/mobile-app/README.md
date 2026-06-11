# Nara Mobile App

Flutter mobile app for the main user-facing Nara experience.

## Current Scope

- Mobile app shell with bottom navigation
- Backend server URL setup
- Readiness check against the Nara backend
- Operator login against the backend
- Home, Tasks, Reminders, Assistant, and Settings screens
- Physical Android device run through wireless debugging

## Local Setup

Run from this folder:

```powershell
cd apps/mobile-app
flutter pub get
flutter run
```

The backend API remains the source of truth. The mobile app should call the office server backend through LAN or Cloudflare Tunnel.

When testing on a physical Android phone, do not use `127.0.0.1` as the backend URL. Use the office server or laptop LAN IP instead, for example:

```text
http://192.168.x.x:4000
```

## Next Implementation Steps

1. Persist backend URL and operator token securely.
2. Add task creation and completion actions.
3. Connect WhatsApp number and Nara Bot access flow.
4. Add approval queue once backend approval endpoints exist.
