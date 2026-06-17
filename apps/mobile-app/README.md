# Nara Mobile App

Flutter mobile app for the main user-facing Nara experience.

## Current Scope

- Mobile app shell with bottom navigation
- Backend server URL setup
- Secure auth token storage with `flutter_secure_storage`
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

1. Polish auth/welcome UI for production.
2. Add richer reminder edit controls.
3. Add push, local, or WhatsApp delivery for reminder notifications.
