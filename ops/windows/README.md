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

`npm start` checks prerequisites, starts Docker services, applies migrations, builds the apps, then starts Nara services through `npm run start:server`.

Start backend for a quick foreground test:

```powershell
npm --workspace @nara/backend run start
```

For the current Windows MVP server, prefer the plain Windows service launcher first:

```powershell
npm run start:server
```

This starts the built backend, OpenClaw gateway, OpenClaw dashboard, and 9router in hidden Windows processes with logs under:

```text
.tmp\service-logs
```

Use this path when setting up the office server under time pressure. PM2 is still documented below, but it has Windows argument parsing quirks and should be treated as optional hardening, not the default path.

For backend-only recovery:

```powershell
npm run start:server:backend
```

Manage the hidden-process services with:

```powershell
npm run server:status
npm run server:logs
npm run server:restart
npm run server:stop
```

For a single service, call the helper directly:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\manage-nara-services.ps1 -Action logs -Service backend -Tail 120
powershell -ExecutionPolicy Bypass -File .\ops\windows\manage-nara-services.ps1 -Action stop -Service openclaw-gateway
```

## Suggested PM2 Commands

Install PM2 globally if the server does not have it:

```powershell
npm install -g pm2
```

Start the built backend manually with PM2:

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

PM2 launches these services through `ops/windows/pm2-ecosystem.config.cjs`, which calls `ops/windows/pm2-service-runner.mjs`. If PM2 still reports `unknown option '--workspace'`, `unknown option '-N'`, or `Process or Namespace nara-backend not found` on a fresh Windows server, stop using PM2 for that setup session and use `npm run start:server` instead.

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

The unauthenticated checks cover Docker, backend `/health`, backend `/api/readiness`, and OpenClaw Control UI. The readiness response includes PostgreSQL, Redis, BullMQ Reminder Worker, OpenClaw Gateway, and WhatsApp bridge checks. Reminder execution is skipped unless credentials are provided.

PM2 checks are optional because the recommended Windows launcher does not use PM2:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\check-nara-health.ps1 -ExpectPm2
```

## Reminder Worker

The backend starts BullMQ reminder and report workers by default:

```env
REMINDER_WORKER_ENABLED=true
REMINDER_WORKER_INTERVAL_MS=60000
REPORT_WORKER_ENABLED=true
REPORT_WORKER_INTERVAL_MS=300000
```

The worker records due reminders, disables one-time reminders after they trigger, advances supported recurring schedules, and writes `reminder.triggered` audit events. The current delivery adapter sends user reminders through OpenClaw WhatsApp when an allowed WhatsApp contact exists. Delivery status is stored in `lastTriggerStatus` and `lastTriggerMessage`.

The web admin Health screen includes a Reminder Worker row from `/api/readiness.dependencies.reminderWorker`. If it shows `DISABLED`, `MISSING`, or `ERROR`, reminders will not fire automatically even when Redis itself is healthy. Check:

```env
REMINDER_WORKER_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Then restart the backend service and run:

```powershell
npm run health-check
```

The report worker processes due report schedules, generates daily or weekly summaries, and can deliver them through the same OpenClaw WhatsApp allowlist path. Delivery status is stored on each report row. Use the web admin `/reports` page or `POST /api/reports/process-due` with an operator token to verify processing without waiting for the repeat interval.

## Backup Worker

The backend starts the scheduled backup worker by default:

```env
BACKUP_DIR=./data/backups
BACKUP_WORKER_ENABLED=true
BACKUP_WORKER_INTERVAL_MS=86400000
POSTGRES_CONTAINER_NAME=nara-postgres-1
```

The worker uses Redis/BullMQ and runs a full backup on the configured interval. A full backup records success only after the PostgreSQL dump succeeds. The backend tries host `pg_dump` first and falls back to Docker:

```powershell
pg_dump --version
docker ps
```

Open the web admin `/backup` page after pulling new code. Confirm:

- Backup Storage is healthy
- Scheduled Backup is running
- Last successful backup is recent after the first run
- Failed records show an actionable message instead of disappearing silently

The same status is included in `/api/readiness` as `backup` and `backupWorker`.

Restore remains manual. Verify any restore on a throwaway database first:

```powershell
createdb nara_restore_check
psql "postgresql://nara:password@localhost:5432/nara_restore_check" -f .\data\backups\database-YYYY-MM-DDTHH-MM-SS.sql
```

Do not restore into the live database until backend services are stopped, the target database is confirmed, and the latest successful backup file has been checked.

## WhatsApp Readiness

The web admin Health screen shows a WhatsApp Bridge row from `/api/readiness`. It checks Nara-side configuration and database allowlist state without sending a WhatsApp message or mutating OpenClaw config.

Before live testing, verify:

```powershell
npm run server:status
npm run health-check
```

Then open `/health` in the web admin and confirm PostgreSQL, Redis, Reminder Worker, OpenClaw Gateway, and WhatsApp Bridge are all healthy or have actionable messages.

## Cloudflare Tunnel

Expose only the backend:

```text
https://api.your-domain.example -> http://127.0.0.1:4000
```

Use `/health` as the tunnel check. Keep PostgreSQL, Redis, OpenClaw Control UI, and the local admin dashboard private.

See `docs/deployment/cloudflare-tunnel.md`.

The backend includes an in-memory rate limiter for tunnel-facing traffic. Tune these values in `.env` if the office PC sees too many legitimate requests:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=240
AUTH_RATE_LIMIT_MAX=12
AGENT_RATE_LIMIT_MAX=120
MUTATION_RATE_LIMIT_MAX=80
```

## OpenClaw WhatsApp Setup

OpenClaw is machine state, not normal repo state. On a new server PC:

1. Install/start OpenClaw.
2. Install the WhatsApp plugin and create the account:

   ```powershell
   openclaw channels add --channel whatsapp --account default --name "Nara Bot"
   ```

3. Configure the dedicated Nara Bot host number:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\ops\windows\setup-openclaw-whatsapp.ps1 -HostPhone +62812xxxxxxx
   ```

   Also set the same E.164 number in `.env`:

   ```env
   OPENCLAW_WHATSAPP_HOST_NUMBER=+62812xxxxxxx
   ```

4. Link WhatsApp for that dedicated number:

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

## Dedicated Host Number

Use a dedicated host number for live Nara Bot access:

- server PC links the Nara Bot host number once
- users add their own WhatsApp numbers in the Nara app
- backend stores access intent in PostgreSQL
- backend syncs allowed WhatsApp senders into the local OpenClaw allowlist
- backend admin approve/retry/block actions update OpenClaw allowlist from backend state

Shared personal-number mode is available only as a temporary recovery path:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\setup-openclaw-whatsapp.ps1 -HostPhone +62812xxxxxxx -SelfPhoneMode
```

While shared personal-number mode is enabled, backend readiness and the web admin Health page mark WhatsApp as not ready for live use. This protects normal personal chat from being treated as bot traffic.

## OpenClaw Allowlist Sync

Nara keeps the database access state as the source of truth. Admin approve/retry/block actions sync the allowed WhatsApp contacts into:

```text
C:\Users\<user>\.openclaw\openclaw.json
channels.whatsapp.accounts.default.allowFrom
```

Nara backend is now the normal source of access state. When a mobile user submits a WhatsApp number and requests Nara Bot access, the backend can write that allowed sender into the OpenClaw config automatically.

Configure the sync path in `.env`:

```env
OPENCLAW_CONFIG_PATH=C:\Users\<user>\.openclaw\openclaw.json
OPENCLAW_WHATSAPP_ACCOUNT=default
OPENCLAW_WHATSAPP_HOST_NUMBER=+62812xxxxxxx
OPENCLAW_WHATSAPP_DM_POLICY=allowlist
OPENCLAW_AUTO_ALLOWLIST_REQUESTS=true
OPENCLAW_ALLOWLIST_SYNC_MODE=auto
OPENCLAW_ALLOWLIST_SYNC_PATH=
OPENCLAW_WHATSAPP_SEND_PATH=/api/channels/whatsapp/send
```

The sync writes a timestamped backup before replacing `openclaw.json`. Nara-managed senders are tracked in `meta.naraManagedAllowFrom`, so manually maintained `allowFrom` entries are preserved.

Use `setup-openclaw-whatsapp.ps1` only for initial owner/host setup or recovery. It is no longer the normal way to add every mobile user number.

## WhatsApp End-To-End Smoke Test

After the dedicated host number is linked:

1. Validate or export the Nara Bot runtime contract:

   ```powershell
   npm run openclaw:nara:validate
   npm run openclaw:nara:export
   ```

   The validate command checks the runtime contract and confirms the WhatsApp account has a dedicated host number. The export writes `.tmp\openclaw-nara-bot-contract.json` plus `.system.md` and `.tools.json` sidecar files for manual import/paste into OpenClaw when the exact agent schema is managed through the OpenClaw UI.

2. Install the Nara Bot runtime contract into the OpenClaw WhatsApp agent:
   - system prompt: `agent/prompts/system.md`
   - tool manifest: `agent/config/tools.json`
   - backend tool base: `http://127.0.0.1:4000`
   - header: `x-agent-secret: <AGENT_API_SECRET>`

   To write contract metadata into `openclaw.json` with a timestamped backup:

   ```powershell
   npm run openclaw:nara:sync
   ```

   If the exact OpenClaw agent object path is known, patch it with Nara Bot prompt/tool pointers and diagnostics:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\ops\windows\sync-openclaw-nara-bot.ps1 -Action sync -AgentPath "agents.nara"
   ```

3. Log in to the mobile app through the Cloudflare Tunnel backend.
4. Add the user's WhatsApp number in Nara.
5. Request Nara Bot access.
6. Confirm the access status becomes `allowed`; if it becomes `sync_failed`, inspect `syncError` in the admin WhatsApp Access screen.
7. Confirm the number appears under `channels.whatsapp.accounts.default.allowFrom`.
8. Verify Nara backend contact resolution and approval flow directly:

   ```powershell
   npm run agent:smoke -- --contact-value +62812xxxxxxx --cleanup
   npm run agent:smoke:approval -- --cleanup
   ```

9. Send a WhatsApp message from the user number to the linked host number.
10. Confirm OpenClaw calls `get_user_context` first, then routes task/reminder actions into `/api/agent/*` Nara backend tools.

If the WhatsApp agent tries to create an OpenClaw task, spawn a sub-agent, or act like an OpenClaw operator, the OpenClaw agent prompt/tool setup is not using the Nara Bot runtime contract yet.

Use `setup-openclaw-whatsapp.ps1` to update host-number setup safely. It creates a timestamped backup before editing OpenClaw config. The backend sync also creates timestamped backups before editing `openclaw.json`.

## Migration Checklist To A New Server PC

1. Clone repo.
2. Create `.env` from `.env.example`.
3. Start Docker Desktop.
4. Run `check-server-prereqs.ps1`.
5. Run `npm install`.
6. Run `npm run infra:up`.
7. Run `npm run db:migrate`.
8. Run `npm run build`.
9. Start services with `npm run start:server`.
10. Run `check-nara-health.ps1`.
11. Configure Cloudflare Tunnel to `http://127.0.0.1:4000`.
12. Install and configure OpenClaw WhatsApp.
13. Link WhatsApp QR.
14. Confirm `.env` has the OpenClaw allowlist sync values.
15. Run `npm run agent:smoke -- --cleanup`.
16. Confirm mobile app server URL points to the tunnel or LAN backend URL.
17. Run the WhatsApp end-to-end smoke test above.
