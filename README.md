# Nara

Nara is a self-hosted agentic personal assistant platform designed to help manage tasks, schedules, reports, and business workflows from a local office server.

Nara combines a local backend, desktop/mobile control surfaces, and an OpenClaw-powered agent layer. The backend stays on a trusted machine in the office, while desktop and mobile apps call its API for daily operations. Messaging channels such as WhatsApp can be added later as another input surface for the same backend tools.

> Project status: Early Development / R&D

## Vision

The goal of Nara is to provide a practical personal assistant that helps reduce operational overhead by combining:

* Conversational interactions
* Task and schedule management
* Automated reporting
* Business workflow automation
* Agent-driven actions and recommendations

Instead of switching between multiple applications, users can interact with a single assistant that coordinates data, services, and workflows behind the scenes.

---

## Architecture Overview

![Diagram](diagram.png)

Nara is built around four primary layers:

### User Interfaces

* Tauri Desktop App (primary operational surface)
* Flutter Mobile App (mobile companion)
* Web Dashboard (local development and internal preview)
* WhatsApp (later agent channel)
* Telegram (optional later channel)

### Agent Layer

Powered by OpenClaw Runtime:

* OpenClaw Gateway
* Agent Runtime
* Tool Calling System
* Session Memory & Context Storage
* Scheduled Tasks & Cron Jobs
* Reconnect Watchdog
* WhatsApp Integration (later phase)

### Business Logic Layer

Backend services built with TypeScript:

* Fastify or Express APIs
* Authentication Services
* Task Management
* Schedule Management
* Client Management
* Reporting Services
* Analytics Services
* Agent Tool Endpoints

### Data Layer

* PostgreSQL + pgvector
* Redis + BullMQ
* SQLite (Development / MVP)
* Local File Storage
* Reports & Logs

---

## Deployment Model

Nara is intended to run on one office PC or local server:

* Backend API runs locally on the server machine.
* PostgreSQL + pgvector and Redis run on the same machine or local network.
* Tauri desktop app can bundle or supervise the backend as a sidecar for local operation.
* Flutter mobile app connects to the backend API over the office network or Cloudflare Tunnel.
* Web dashboard stays useful for development and local diagnostics, but is not the main deployment target.
* No public web domain is required for the dashboard surface.
* Railway/VPS deployment remains a later option if the project outgrows the office-server model.

---

## Core Workflow

1. User works from the desktop dashboard or mobile app.
2. Client app calls the backend API.
3. Backend services query databases and business systems.
4. Backend returns structured operational data to the client.
5. Agent workflows can invoke backend tool endpoints for automated work.
6. Scheduled reports and reminders can run without direct user interaction.
7. WhatsApp can be added later so user messages go through OpenClaw before invoking the same backend tools.

The backend remains the source of truth whether the request comes from desktop, mobile, scheduled jobs, or a future messaging channel.

---

## Key Principles

* Self-hosted by default
* Local-first desktop and mobile experience
* Agent and backend services can run on the same server
* Clear separation between AI orchestration and business logic
* Backend remains the source of truth
* Extensible tool-based architecture
* Designed for automation and operational efficiency

---

## Technology Stack

### Agent Layer

* OpenClaw
* WhatsApp Web / Baileys (later phase)

### Backend

* TypeScript
* Fastify / Express

### Frontend

* TypeScript
* shadcn/ui
* Tailwind CSS
* Tauri
* Flutter

### Database & Infrastructure

* PostgreSQL
* pgvector
* Redis
* BullMQ
* SQLite (optional)

---

## Local Development

Copy the example environment file and fill the local secrets:

```powershell
Copy-Item .env.example .env
```

Set `OPENCLAW_GATEWAY_TOKEN` from `gateway.auth.token` in:

```text
C:\Users\<username>\.openclaw\openclaw.json
```

Start PostgreSQL + pgvector with Docker:

```powershell
docker compose up -d postgres
```

If Redis is already running in WSL on port `6379`, keep using it. Do not start the Redis container at the same time unless the WSL Redis service is stopped.

Apply the database schema:

```powershell
npm.cmd run db:push
```

Start the backend and dashboard:

```powershell
npm.cmd run dev
```

Open the dashboard at:

```text
http://localhost:5173
```

The dashboard reads:

* `GET /api/readiness`
* `GET /api/tasks`
* `POST /api/tasks`
* `PATCH /api/tasks/:id/complete`

Test the agent tool endpoints without WhatsApp:

```powershell
npm.cmd run agent:smoke
```

To delete the smoke-test task after the run:

```powershell
npm.cmd --workspace @nara/backend run agent:smoke -- --cleanup
```

Useful checks:

```powershell
docker compose ps
docker exec nara-postgres-1 pg_isready -U nara -d nara_db
docker exec nara-postgres-1 psql -U nara -d nara_db -c "\dt"
```

Stop PostgreSQL when not needed:

```powershell
docker compose stop postgres
```

---

## Remote Access

For access outside the office network, use Cloudflare Tunnel to expose only the backend API:

```text
Cloudflare Tunnel URL -> http://127.0.0.1:4000
```

Do not expose PostgreSQL or Redis. Keep them local to the server PC.

Remote mobile and desktop apps should store a configurable server URL, for example:

```text
https://your-tunnel-hostname.example.com
```

See [Cloudflare Tunnel Deployment](docs/deployment/cloudflare-tunnel.md) for the deployment model and security checklist.

---

## Roadmap

### Implementation Plan

1. Harden backend access before exposing it outside the office network:
   operator auth, protected write endpoints, admin auth, rate limiting, and audit logs.
2. Keep the office PC as the server:
   PostgreSQL and Redis stay local, backend runs on the server PC, and Cloudflare Tunnel exposes only the backend API.
3. Make every client configurable:
   mobile and desktop apps must store a server URL instead of hardcoding `localhost`.
4. Build the main user surfaces:
   Flutter mobile first, then Tauri desktop with feature parity where practical, then local web admin for server operations.
5. Add agent workflows after the core app is stable:
   OpenClaw tool expansion, confirmation flow, memory/context storage, reports, and schedules.
6. Add messaging channels last:
   WhatsApp first when the assistant phone number is ready, Telegram only if useful later.

### Phase 1: Local Backend Foundation

* [x] Monorepo scaffold
* [x] PostgreSQL + pgvector Docker setup
* [x] Redis connection support
* [x] Task schema and initial migration
* [x] Protected agent tool endpoints
* [x] Local agent smoke test without WhatsApp
* [x] Backend readiness checks for database, Redis, and OpenClaw

### Phase 2: Remote Access and Security

* [ ] Backend operator authentication
* [ ] Protect write endpoints
* [ ] Admin/dashboard authentication
* [ ] Server URL settings for mobile and desktop clients
* [ ] Cloudflare Tunnel setup for backend API
* [ ] Rate limiting for exposed endpoints
* [ ] Document backup and recovery basics

### Phase 3: Operational Core

* [ ] Task management CRUD
* [ ] Schedule management CRUD
* [ ] Reminder worker with Redis/BullMQ
* [ ] Reporting service
* [ ] Client/contact management
* [ ] Basic authentication and operator access control
* [ ] Audit logs for agent-triggered actions

### Phase 4: Mobile App

* [ ] Flutter app scaffold
* [ ] Backend API connection settings
* [ ] Mobile task and reminder views
* [ ] Push or local notification strategy
* [ ] Approval screen for agent-triggered actions

### Phase 5: Desktop App

* [ ] Tauri desktop shell
* [ ] Full feature parity with mobile where practical
* [ ] Backend sidecar start/stop supervision for server PC usage
* [ ] Local server settings and health screen
* [ ] Desktop task and schedule screens
* [ ] Local backup/export controls

### Phase 6: Web Admin Panel

* [ ] Local admin dashboard authentication
* [ ] System health and logs
* [ ] Tool endpoint debugging
* [ ] Server configuration checks

### Phase 7: Agent Automation

* [ ] Expand OpenClaw tool definitions
* [ ] Scheduled report generation
* [ ] Agent-safe confirmation flow for destructive actions
* [ ] Memory/context storage for business workflows

### Phase 8: Messaging Channels

* [ ] WhatsApp integration
* [ ] Telegram integration (optional)
* [ ] Messaging delivery for reminders and reports

---

## License

TBD
