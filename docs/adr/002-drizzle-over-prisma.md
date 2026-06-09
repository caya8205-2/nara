# ADR 002 — Drizzle ORM over Prisma

**Status:** Accepted

## Context
Need an ORM for PostgreSQL with TypeScript support and pgvector compatibility.

## Decision
Use Drizzle ORM. Lightweight, SQL-first, no code generation step, better raw query access for pgvector operations.

## Consequences
- Less abstraction than Prisma
- More control over query shape
- Manual migration management via drizzle-kit
