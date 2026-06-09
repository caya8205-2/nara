# Architecture

See `diagram.png` in repo root for the full architecture diagram.

## Layers

1. **User Interfaces** — WhatsApp (primary), Telegram, Web Dashboard, Flutter Mobile, Tauri Desktop
2. **Agent Layer** — OpenClaw Runtime: gateway, WhatsApp/Baileys, tool calling, session memory, cron, watchdog
3. **Business Logic Layer** — TypeScript/Fastify: REST APIs, auth, tasks, schedules, clients, reports, analytics, agent tool endpoints
4. **Data Layer** — PostgreSQL + pgvector, Redis + BullMQ, SQLite (dev), local file storage, logs

## Key Principles
- Self-hosted, single machine
- Backend is source of truth
- OpenClaw handles agent/messaging only — business logic lives in backend
- Agent communicates with backend via HTTP tool endpoints exclusively
