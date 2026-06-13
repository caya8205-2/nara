# OpenClaw WhatsApp Migration Notes

OpenClaw WhatsApp is not only configuration. It includes a linked-device session created by scanning a QR code. That session lives on the server machine under the user's `.openclaw` directory.

## Recommended Production Shape

Use a dedicated host number for Nara Bot.

```text
Customer/user WhatsApp number
        |
WhatsApp chat
        |
Dedicated Nara Bot host number
        |
OpenClaw WhatsApp Web session on server PC
        |
Nara backend agent tools
```

This keeps the owner's personal WhatsApp separate from bot traffic and notifications.

## Development Shape

When only one number is available, enable self-phone mode:

```text
channels.whatsapp.accounts.default.selfChatMode = true
channels.whatsapp.accounts.default.dmPolicy = "allowlist"
channels.whatsapp.accounts.default.allowFrom = ["+62...owner"]
```

The owner's phone still works normally. The tradeoff is that bot traffic is mixed with personal WhatsApp traffic and notifications on that number.

## Move To A New Server PC

Cleanest path:

1. Install OpenClaw on the new server PC.
2. Install the WhatsApp channel plugin:

   ```powershell
   openclaw channels add --channel whatsapp --account default --name "Nara Bot"
   ```

3. Apply the owner or host allowlist:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\ops\windows\setup-openclaw-whatsapp.ps1 -OwnerPhone +62812xxxxxxx -SelfPhoneMode
   ```

4. Link again by QR:

   ```powershell
   openclaw channels login --channel whatsapp --account default --verbose
   ```

5. Confirm:

   ```powershell
   openclaw channels status --channel whatsapp --json
   ```

Trying to copy `.openclaw` credentials between machines may work in some cases, but it is fragile and sensitive. Prefer QR relink unless downtime is unacceptable.

## Future Nara Allowlist Sync

The backend should remain the source of truth:

```text
Mobile app adds WhatsApp number
        |
Backend stores user_contact + agent_channel_access
        |
Admin/user approval sets access = allowed
        |
OpenClawChannelAccessService syncs allowed numbers to OpenClaw
        |
OpenClaw reloads/restarts WhatsApp channel if needed
```

Implementation target:

- read allowed WhatsApp contacts from PostgreSQL
- normalize to E.164
- update `channels.whatsapp.accounts.default.allowFrom`
- preserve existing owner/host number
- write a timestamped backup before editing OpenClaw config
- run `openclaw channels status --channel whatsapp --json` after sync

Do not expose OpenClaw Control UI or `.openclaw` files over the network.
