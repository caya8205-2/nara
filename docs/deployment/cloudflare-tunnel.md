# Cloudflare Tunnel Deployment

This guide is for exposing the Nara backend from the office PC without moving the database to a cloud host.

## Target Shape

```text
Mobile app / desktop app / future WhatsApp automation
        |
Cloudflare Tunnel public URL
        |
Office PC running Nara backend
        |
PostgreSQL + Redis stay local
```

Only the backend API should be reachable through the tunnel. PostgreSQL and Redis must remain private.

## Why Tunnel Instead of Railway

Cloud hosting is useful later, but it changes the main deployment model. If Railway or a VPS hosts the backend and database, the office PC is no longer the main server. Cloudflare Tunnel keeps the current local-server plan:

- backend runs on the office PC
- database stays local
- no router port forwarding
- no public database exposure
- mobile and desktop apps can still reach a public backend URL

## Backend Settings

For local-only development:

```env
PORT=4000
TRUST_PROXY=false
CORS_ORIGINS=
```

For Cloudflare Tunnel:

```env
NODE_ENV=production
PORT=4000
TRUST_PROXY=true
CORS_ORIGINS=https://your-tunnel-hostname.example.com
```

When `NODE_ENV=production` and `CORS_ORIGINS` is empty, browser CORS is disabled by default. Native mobile and desktop clients are not blocked by browser CORS in the same way a web page is, but keeping `CORS_ORIGINS` explicit helps if the local web admin panel is ever opened through the tunnel.

## Cloudflare Tunnel Route

The tunnel should forward public traffic to the local backend:

```text
https://your-tunnel-hostname.example.com -> http://127.0.0.1:4000
```

Do not expose:

```text
localhost:5432  # PostgreSQL
localhost:6379  # Redis
```

## App Client Settings

Mobile and desktop apps should not hardcode `localhost`.

Each app should support a server URL setting:

```text
https://your-tunnel-hostname.example.com
```

For office LAN-only usage, the same setting can point to:

```text
http://192.168.x.x:4000
```

## Security Checklist Before Remote Access

Before using the tunnel for real operations:

- protect all write endpoints with operator authentication
- keep `AGENT_API_SECRET` private
- keep `JWT_SECRET` strong and private
- expose only the backend API, never Postgres or Redis
- configure `CORS_ORIGINS` for any browser-based client URL
- add rate limiting before wider use
- keep dashboard/admin features behind auth

## Suggested MVP Order

1. Keep local LAN development working.
2. Add backend operator auth.
3. Add server URL settings to mobile/desktop clients.
4. Add Cloudflare Tunnel to expose only the backend API.
5. Add WhatsApp integration after agent tools and auth are stable.
