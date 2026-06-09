# 003. Identity and WhatsApp Allowlist Model

## Status

Accepted

## Context

Nara's main selling point is a WhatsApp-facing agent powered by OpenClaw. The product UI should be branded as Nara, while still respecting OpenClaw and other open source projects in an attribution/settings area.

OpenClaw WhatsApp access is channel-gated. The runtime can use pairing or allowlist-style policies, and approved senders are stored on the server side. Nara needs a product-level model for users, WhatsApp numbers, and access state instead of treating all WhatsApp senders as anonymous agent users.

The web admin dashboard is local to the office server PC. It does not need the same account model as normal app users during the MVP.

## Decision

Nara will use three distinct identity/access concepts:

1. Local admin access for the office-server dashboard.
2. Normal app users stored in the Nara database.
3. WhatsApp contact access for Nara Bot / OpenClaw channel allowlisting.

For MVP, local admin access can remain simple and server-local, backed by environment credentials or a local session token. Normal users and their WhatsApp contacts should be stored in PostgreSQL.

The preferred user flow is:

1. User signs in or is created in the Nara app.
2. User adds their WhatsApp number in the app.
3. Backend stores the number and marks it as pending verification or pending allowlist sync.
4. Nara Bot / OpenClaw pairing or allowlist sync approves the number on the office server.
5. Backend marks the contact as allowed once sync succeeds.
6. WhatsApp messages from that number can be routed into the Nara agent flow.

Nara should own the product wording:

- User-facing UI says "Nara Bot", "WhatsApp access", "pending Nara Bot approval", or similar.
- Admin/debug surfaces may mention OpenClaw when diagnosing the runtime.
- Open source attribution/settings should list OpenClaw and other major OSS dependencies.

## Data Model Direction

Likely tables:

- `users`: app users.
- `user_contacts`: user-owned contact methods such as WhatsApp numbers.
- `agent_channel_access`: channel allowlist status per contact.
- `agent_channels`: channel/runtime config metadata.
- `approval_requests`: agent actions that need user/admin confirmation.
- `audit_logs`: admin/user/agent access changes and sensitive actions.

Initial contact/access statuses:

- `pending_verification`
- `pending_allowlist`
- `allowed`
- `blocked`
- `sync_failed`

## OpenClaw Sync Direction

The backend should not hardcode OpenClaw internals throughout the app. Use an adapter/service boundary such as `AgentAccessService`.

Implementation options to verify:

- OpenClaw CLI command for pairing approval or allowlist mutation.
- OpenClaw Gateway/API support for access management.
- Controlled update of local OpenClaw allowlist files, followed by runtime reload if required.

Until the exact OpenClaw interface is confirmed, Nara DB should be treated as the source of intended access state and OpenClaw as the runtime enforcement layer.

## Consequences

- Admin auth can stay lightweight for the local dashboard during MVP.
- Normal user auth must eventually be database-backed.
- WhatsApp access becomes auditable and visible in both app and admin surfaces.
- The UI can stay Nara-branded without hiding OpenClaw attribution.
- A sync worker/script is needed before WhatsApp access can be fully automated.

## Follow-ups

- Add database schema for users, contacts, channel access, approvals, and audit logs.
- Add an `AgentAccessService` abstraction.
- Research the safest OpenClaw CLI/API mechanism for allowlist sync.
- Add app UI for adding a WhatsApp number.
- Add web admin UI for reviewing users and Nara Bot access status.
- Add open source attribution/settings section.