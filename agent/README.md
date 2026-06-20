# Nara Bot OpenClaw Runtime

This folder contains the runtime contract that should be installed into the OpenClaw WhatsApp agent used by Nara.

Nara backend is the source of truth. OpenClaw should provide WhatsApp transport, model orchestration, and tool calling only.

## Required Agent Contract

Install or paste these into the OpenClaw agent that handles the WhatsApp account:

- System prompt: `agent/prompts/system.md`
- Tool manifest: `agent/config/tools.json`
- Runtime metadata: `agent/config/agent.config.ts`

The WhatsApp agent must follow these rules:

- The first tool call in each WhatsApp conversation is `get_user_context`.
- WhatsApp sender phone number is passed as `contactValue` with `channelType: "whatsapp"`.
- Later tool calls reuse the returned `toolContext`.
- Task, reminder, approval, profile, and context state is read or changed only through Nara backend tools.
- OpenClaw internal task/project/sub-agent behavior is disabled for normal user requests.
- If a Nara backend tool is unavailable, the agent tells the user Nara cannot complete the action yet instead of doing the action inside OpenClaw.

## Backend Tool Base

Default local backend base:

```text
http://127.0.0.1:4000
```

All tools use:

```http
x-agent-secret: <AGENT_API_SECRET>
```

Keep `AGENT_API_SECRET` in `.env` and in the server-local OpenClaw agent/tool configuration. Do not commit real secrets.

## Verification

Use a user ID for no-WhatsApp local simulation:

```powershell
npm run agent:smoke -- --cleanup
npm run agent:smoke -- --user-id <user-uuid> --cleanup
```

Use the WhatsApp sender number after the mobile app has registered the number and Nara has allowed access:

```powershell
npm run agent:smoke -- --contact-value +62812xxxxxxx --cleanup
```

Expected behavior:

1. `get_user_context` resolves the WhatsApp sender to a Nara user.
2. Task create/list/complete uses `/api/agent/tasks/*`.
3. Reminder create/list/update uses `/api/agent/reminders/*`.
4. No task or reminder is created inside OpenClaw internal state.
5. If the user's autonomy is `Confirm` or `Suggest`, unconfirmed mutating calls return an approval item instead of silently executing.

## Current Non-Goal

Group digest is not active yet. Do not let the WhatsApp agent join or summarize groups as a generic OpenClaw action. Add a Nara-owned group digest model, approval flow, message capture policy, and scheduled summarizer before enabling group behavior.
