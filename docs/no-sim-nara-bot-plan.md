# No-SIM Nara Bot Testing Plan

Date: 2026-06-26

This plan is for continuing Nara Bot validation while the dedicated WhatsApp SIM is not available yet. The goal is to prove the Nara-side agent logic end to end without pretending that live WhatsApp delivery or group ingestion is already solved.

## Objective

Verify that Nara Bot can resolve a user, create tasks, create reminders, create approval requests, execute approved actions, and expose the result in mobile/admin surfaces without requiring a real WhatsApp session.

The dedicated SIM remains the final live-channel gate. Until then, treat the backend tools and OpenClaw contract as testable, while the WhatsApp runtime adapter remains pending real-device verification.

## Current Starting Point

- Backend agent tools already support no-WhatsApp smoke testing.
- `npm run agent:smoke` exercises user-scoped task and reminder tool paths.
- `npm run agent:smoke:approval -- --cleanup` exercises approval request creation and execution paths.
- `npm run agent:smoke:group -- --cleanup` exercises group-context tools without live group traffic.
- OpenClaw runtime contract lives in `agent/prompts/system.md` and `agent/config/tools.json`.
- The backend remains the source of truth for users, contacts, Nara Bot access state, tasks, reminders, approvals, group context, and reports.

## Working Rule

Do not add user-facing copy that says WhatsApp group summaries or live WhatsApp chat are ready until a dedicated Nara Bot number is linked and verified on the server PC.

Admin/debug docs may mention OpenClaw and simulated/local channels. Normal mobile user-facing copy should keep using Nara Bot wording.

## Milestone 1 - Baseline Local Smoke

Run these from the repo root after pulling latest changes:

```powershell
npm run agent:smoke -- --cleanup
npm run agent:smoke:approval -- --cleanup
npm run agent:smoke:group -- --cleanup
```

Expected result:

- Task tool creates, lists, and completes user-scoped records.
- Reminder tool creates one-time and recurring reminder records.
- Approval smoke creates pending approval records and proves approve/reject execution behavior.
- Group smoke verifies group context, digest configuration, and stored summary paths without real WhatsApp traffic.

If these fail, fix backend tool contracts before touching WhatsApp/OpenClaw live setup.

## Milestone 2 - Existing User Simulation

Use a real app user from the local database or mobile app registration flow.

```powershell
npm --workspace @nara/backend run agent:smoke -- --user-id <user-uuid>
npm --workspace @nara/backend run agent:smoke:approval -- --user-id <user-uuid>
```

Expected result:

- New task/reminder data appears for that same user in the mobile app after refresh.
- Pending approvals appear on mobile Home and Assistant modules.
- Approving from mobile creates or updates the intended record.
- Rejecting from mobile closes the request without running the action.

## Milestone 3 - Sender Number Simulation

After a user has a WhatsApp contact record and Nara Bot access state in the database, simulate the sender-number path without chatting through WhatsApp:

```powershell
npm run agent:smoke -- --contact-value +6281xxxxxxxx --cleanup
npm run agent:smoke:approval -- --contact-value +6281xxxxxxxx --cleanup
```

Expected result:

- `get_user_context` resolves the Nara user from the contact number.
- Tool calls remain scoped to the resolved user.
- If the contact is not allowed, the tool path should fail safely or request approval according to the existing contract.
- No OpenClaw-native task, sub-agent, or unrelated runtime project state is created.

## Milestone 4 - Simulated Chat Harness

Next implementation target when coding resumes:

1. Add a local dev-only command or script that accepts a natural-language message plus user identity:

   ```powershell
   npm run agent:simulate -- --user-id <user-uuid> --message "ingatkan follow up invoice besok jam 9"
   npm run agent:simulate -- --contact-value +6281xxxxxxxx --message "buat task cek proposal sore ini"
   ```

2. Route the simulation through the same Nara Bot contract sequence:
   - resolve context with `get_user_context`
   - load assistant preferences
   - call task/reminder/approval tools
   - record audit/log output

3. Keep this explicitly local/dev-only. It should not be exposed as a public unauthenticated endpoint.

Expected result:

- The team can test realistic Nara Bot requests without the SIM.
- The test output shows which tool would be called and what backend record changed.
- Mobile/admin surfaces can be refreshed to verify the created records.

## Milestone 5 - Admin Visibility

Make simulated activity obvious in admin/debug surfaces only:

- Approval source can remain `nara_bot` or similar existing source if already supported.
- Audit/log entries should make it clear when a record came from local simulation.
- Health/readiness should still report WhatsApp as not ready for live use until a dedicated number is linked.

Do not make normal users see "simulator", "test harness", or OpenClaw internals in mobile flows.

## Milestone 6 - Reminder And Report Delivery Without SIM

Use local/backend evidence instead of live WhatsApp delivery:

```powershell
npm run reminders:process-due
npm run reports:process-due
```

Expected result:

- Due reminders are processed.
- Delivery status records `delivery_skipped` or `delivery_failed` when WhatsApp is unavailable.
- Android local fallback notification can still alert after mobile refresh/sync.
- Reports can be generated and marked with delivery state even if live WhatsApp send is skipped.

## Stop Conditions

Pause no-SIM work and wait for the dedicated SIM when the remaining issue is only:

- QR/linking WhatsApp on the server PC.
- Real WhatsApp sender identity shape.
- Real OpenClaw group event payload.
- Sending summaries back into WhatsApp groups.

Those are live-channel verification tasks, not core Nara backend/mobile tasks.

## Dedicated SIM Handoff

When the SIM is available:

1. Link the dedicated number to OpenClaw on the server PC.
2. Set `OPENCLAW_WHATSAPP_HOST_NUMBER` to the dedicated number.
3. Keep `selfChatMode=false` for live use.
4. Request Nara Bot access from mobile.
5. Approve from web admin and confirm allowlist sync.
6. Test real WhatsApp chat:
   - create task
   - create one-time reminder
   - create recurring reminder
   - trigger an approval-required action
   - verify mobile/admin state after each action

Only after this should Nara claim live WhatsApp Nara Bot usage is ready.
