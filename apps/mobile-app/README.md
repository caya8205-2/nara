# Nara Mobile App

Flutter mobile app for the main user-facing Nara experience.

## Current Scope

- Mobile app shell with bottom navigation
- Backend server URL setup
- Secure auth token storage with the Android Keystore-backed local secure store
- Readiness check against the Nara backend
- Operator login against the backend
- Nara-branded onboarding, auth, Home, Tasks, Reminders, Assistant, and Settings screens
- Pending approvals surfaced on Home and Assistant, with the existing Approvals screen still available from those modules
- Android local fallback notifications for due reminders when WhatsApp delivery is unavailable or not connected
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

## Reminder Notifications

The backend worker and OpenClaw WhatsApp delivery path remain the source of truth. On Android, the app also requests notification permission and shows a local fallback notification when:

- a reminder becomes due while the signed-in user does not have allowed WhatsApp access, or
- the backend records `lastTriggerStatus=delivery_failed` or `delivery_skipped`.

Local notifications are delivered through the Android host `MethodChannel` and do not add a Flutter plugin dependency.

## Next Implementation Steps

1. Add richer reminder edit controls.
2. Add push notification delivery if reminders need to alert while the mobile app has not recently synced.
