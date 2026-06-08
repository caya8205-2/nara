# Nara

Nara is a self-hosted agentic personal assistant platform designed to help manage tasks, schedules, reports, and business workflows through natural conversations.

Built around a WhatsApp-first experience, Nara combines an AI agent layer with traditional backend services, allowing users to interact with business data, automate routine operations, and receive scheduled reports directly from messaging channels.

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

Nara is built around four primary layers:

### User Interfaces

* WhatsApp (Primary Interface)
* Telegram (Optional)
* Web Dashboard (shadcn/ui + Tailwind CSS + TypeScript)
* Flutter Mobile App (Optional)
* Tauri Desktop App (Optional)

### Agent Layer

Powered by OpenClaw Runtime:

* OpenClaw Gateway
* WhatsApp Integration
* Agent Runtime
* Tool Calling System
* Session Memory & Context Storage
* Scheduled Tasks & Cron Jobs
* Reconnect Watchdog

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

## Core Workflow

1. User sends a message through WhatsApp.
2. OpenClaw receives and processes the request.
3. The agent invokes backend tool endpoints.
4. Backend services query databases and business systems.
5. Structured data is returned to the agent.
6. The agent generates a response.
7. The response is delivered back through WhatsApp.

Additionally, scheduled reports and automated workflows can be generated and delivered without direct user interaction.

---

## Key Principles

* Self-hosted by default
* WhatsApp-first user experience
* Agent and backend services run on the same server
* Clear separation between AI orchestration and business logic
* Backend remains the source of truth
* Extensible tool-based architecture
* Designed for automation and operational efficiency

---

## Technology Stack

### Agent Layer

* OpenClaw
* WhatsApp Web / Baileys

### Backend

* TypeScript
* Fastify / Express

### Frontend

* TypeScript
* shadcn/ui
* Tailwind CSS

### Database & Infrastructure

* PostgreSQL
* pgvector
* Redis
* BullMQ
* SQLite (optional)

---

## Roadmap

* [ ] WhatsApp integration
* [ ] Agent tool framework
* [ ] Task management
* [ ] Schedule management
* [ ] Automated reminders
* [ ] Reporting engine
* [ ] Analytics dashboard
* [ ] Web dashboard
* [ ] Mobile application
* [ ] Desktop application

---

## License

TBD
