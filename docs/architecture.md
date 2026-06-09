# Architecture

See `diagram.png` in repo root for the current high-level architecture diagram.

## Current Direction

Nara is local-first. The main backend, database, Redis queue, and OpenClaw runtime are intended to run on one office PC or local server. Client apps connect to that backend API instead of requiring a public web deployment.

The WhatsApp agent should be branded as Nara Bot in user-facing surfaces. OpenClaw remains the runtime layer and should be credited in settings/open-source attribution.

The web dashboard is useful for development and internal diagnostics, but the primary product surfaces are expected to move toward:

1. Flutter mobile app for main day-to-day usage.
2. Tauri desktop app with feature parity where practical.
3. Web admin panel for local server diagnostics and internal operations.
4. WhatsApp or Telegram as later messaging channels through OpenClaw.

See [ADR 003](adr/003-identity-and-whatsapp-allowlist.md) for the user identity, WhatsApp contact, and OpenClaw allowlist model.

## Layers

1. **User Interfaces** - Flutter Mobile, Tauri Desktop, local Web Admin, later WhatsApp/Telegram channels.
2. **Agent Layer** - OpenClaw Runtime: gateway, agent runtime, tool calling, session memory, cron, watchdog, later WhatsApp/Baileys.
3. **Business Logic Layer** - TypeScript/Fastify: REST APIs, auth, tasks, schedules, clients, reports, analytics, agent tool endpoints.
4. **Data Layer** - PostgreSQL + pgvector, Redis + BullMQ, local file storage, logs.

## Deployment Model

- One local office PC can act as the server and database host.
- PostgreSQL + pgvector and Redis can run through Docker/WSL on that server machine.
- The Flutter mobile app should call the backend API over the local office network or Cloudflare Tunnel.
- The Tauri desktop app can share the same API surface and eventually supervise the backend as a sidecar.
- The web admin panel can stay local to the server PC.
- Cloudflare Tunnel can expose only the backend API for remote access without opening router ports.
- Railway/VPS remains a later option if the project outgrows the office-server model.
- Messaging integrations are added later and should call the same backend tool endpoints.

## Key Principles

- Self-hosted, local-first deployment.
- Backend is the source of truth.
- Mobile/desktop clients are operational surfaces, not separate sources of data.
- OpenClaw handles agent orchestration and messaging only.
- Business logic lives in the backend.
- Agent tools communicate with the backend via protected HTTP endpoints.
- Database and Redis stay private and are never exposed through the tunnel.
