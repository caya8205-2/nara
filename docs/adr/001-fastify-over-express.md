# ADR 001 — Fastify over Express

**Status:** Accepted

## Context
Need a TypeScript-first HTTP framework for the backend layer.

## Decision
Use Fastify. Better performance, native TypeScript support, built-in schema validation, and plugin architecture fits modular service design.

## Consequences
- Different plugin/hook model vs Express
- Better DX for schema-validated routes
- Slightly steeper learning curve for Express users
