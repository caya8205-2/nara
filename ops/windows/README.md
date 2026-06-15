# Nara Windows Server Runbook

This folder is for preparing an office PC as the Nara server. It keeps machine setup repeatable without committing secrets, WhatsApp sessions, or OpenClaw state.

## What Belongs In Repo

- backend, admin, mobile, and desktop source code
- Docker Compose for PostgreSQL and Redis
- migration and smoke-test commands
- safe helper scripts and checklists

## What Stays On The Server PC

Never commit these:

- `.env`
- Cloudflare Tunnel token/config
- `C:\Users\<user>\.openclaw\openclaw.json`
- WhatsApp linked-device credentials under `C:\Users\<user>\.openclaw`
- OpenClaw plugin installs under `C:\Users\<user>\.openclaw\extensions`

Treat OpenClaw WhatsApp state like a password plus an active login session.

## First-Time Server Setup

Run from the repository root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\check-server-prereqs.ps1
npm install
npm run infra:up
npm run db:migrate
npm run build
```

Or run the guided server bootstrap script:

```powershell
npm start
```

Start backend for a quick foreground test:

```powershell
npm --workspace @nara/backend run start
```

For a persistent local process manager, use PM2 or a Windows service wrapper. PM2 is convenient during MVP, but the important contract is the same: backend must run from the repo root with `.env` available.

## Suggested PM2 Commands

Install PM2 globally if the server does not have it:

```powershell
npm install -g pm2
```

Start the built backend:

```powershell
pm2 start npm --name nara-backend -- --workspace @nara/backend run start
pm2 save
```

The same flow can be started through:

```powershell
npm run start:pm2
```

`npm run start:pm2` starts these PM2 processes:

```text
nara-backend
openclaw-gateway
openclaw-dashboard
9router
```

The backend process runs compiled code directly with:

```powershell
node --env-file-if-exists=.env apps/backend/dist/index.js
```

PM2 launches these services through `ops/windows/pm2-ecosystem.config.cjs`, which calls `ops/windows/pm2-service-runner.mjs`. This avoids Windows PM2 argument parsing issues where commands can fail with errors such as `unknown option '--workspace'` or `unknown option '-N'`, and keeps process names stable for `pm2 describe`.

For backend-only recovery:

```powershell
npm run start:pm2:backend
```

For the local admin dashboard, prefer opening the Vite dev server only on the server PC while developing:

```powershell
npm --workspace @nara/web-admin run dev -- --host 127.0.0.1 --port 5173
```

If the admin dashboard needs to run persistently, build it and serve the static output behind a local-only server. Do not expose the admin dashboard publicly until auth and deployment boundaries are stricter.

## Daily Server Checks

Use the health script after boot, after pulling new code, or after changing Cloudflare/OpenClaw settings:

```powershell
npm run health-check
```

To include the authenticated reminder execution summary, pass local operator credentials:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\check-nara-health.ps1 -OperatorUsername admin -OperatorPassword "<password-from-env>"
```

The unauthenticated checks cover Docker, PM2, backend `/health`, backend `/api/readiness`, and OpenClaw Control UI. Reminder execution is skipped unless credentials are provided.

## Reminder Worker

The backend starts a lightweight reminder worker by default:

```env
REMINDER_WORKER_ENABLED=true
REMINDER_WORKER_INTERVAL_MS=60000
```

The worker records due reminders, disables one-time reminders after they trigger, advances supported recurring schedules, and writes `reminder.triggered` audit events. WhatsApp/push/local notification delivery is still a later integration step.

## Cloudflare Tunnel

Expose only the backend:

```text
https://api.your-domain.example -> http://127.0.0.1:4000
```

Use `/health` as the tunnel check. Keep PostgreSQL, Redis, OpenClaw Control UI, and the local admin dashboard private.

See `docs/deployment/cloudflare-tunnel.md`.

## OpenClaw WhatsApp Setup

OpenClaw is machine state, not normal repo state. On a new server PC:

1. Install/start OpenClaw.
2. Install the WhatsApp plugin and create the account:

   ```powershell
   openclaw channels add --channel whatsapp --account default --name "Nara Bot"
   ```

3. Configure owner or host policy:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\ops\windows\setup-openclaw-whatsapp.ps1 -OwnerPhone +62812xxxxxxx -SelfPhoneMode
   ```

4. Link WhatsApp:

   ```powershell
   openclaw channels login --channel whatsapp --account default --verbose
   ```

5. Confirm status:

   ```powershell
   openclaw channels status --channel whatsapp --json
   ```

Expected linked state:

```text
linked: true
running: true
connected: true
healthState: healthy
```

## Self-Phone Mode vs Dedicated Host Number

Self-phone mode is useful for development when the owner only has one WhatsApp number. The same number is linked as the OpenClaw WhatsApp Web session and allowlisted as the owner.

Tradeoff: the phone still receives normal WhatsApp notifications for messages sent to that number. It does not lock the owner out of WhatsApp, but it mixes personal chat and bot-host traffic.

For real use, a dedicated host number is cleaner:

- server PC links the host number once
- users add their own WhatsApp numbers in the Nara app
- backend stores access intent in PostgreSQL
- a later sync worker updates OpenClaw allowlist from backend state

## Current Manual Allowlist Contract

Until backend-to-OpenClaw allowlist sync exists, allowed WhatsApp senders live in:

```text
C:\Users\<user>\.openclaw\openclaw.json
channels.whatsapp.accounts.default.allowFrom
```

Use `setup-openclaw-whatsapp.ps1` to update owner/self-phone setup safely. It creates a timestamped backup before editing OpenClaw config.

## Migration Checklist To A New Server PC

1. Clone repo.
2. Create `.env` from `.env.example`.
3. Start Docker Desktop.
4. Run `check-server-prereqs.ps1`.
5. Run `npm install`.
6. Run `npm run infra:up`.
7. Run `npm run db:migrate`.
8. Run `npm run build`.
9. Start backend with `start-nara-server.ps1` or PM2.
10. Run `check-nara-health.ps1`.
11. Configure Cloudflare Tunnel to `http://127.0.0.1:4000`.
12. Install and configure OpenClaw WhatsApp.
13. Link WhatsApp QR.
14. Run `npm run agent:smoke -- --cleanup`.
15. Confirm mobile app server URL points to the tunnel or LAN backend URL.
