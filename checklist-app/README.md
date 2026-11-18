# Checklist App

A simple checklist application that requires user login.

## Requirements
- Node.js 20+

## Start

```bash
npm install
cp .env.example .env
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the credentials from `.env`.

## Features
- Login and logout with server-side sessions
- Rolling idle timeout (default: 15 minutes)
- Add, complete/uncomplete and remove checklist items
- Items persisted to `data/items.json`
- Sessions persisted in `sessions/` so they can survive a development restart

## Session behaviour
Every authenticated HTTP request renews the session cookie expiry. **Mouse movement or typing without a request does not renew the session.** If no requests occur within the idle timeout, the next protected request returns 401 and the interface returns to login. Session renewal on `/api/session` also occurs for already logged-in users.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/session` | Session status |
| POST | `/api/login` | Login (`username`, `password`) |
| POST | `/api/logout` | Logout |
| GET | `/api/items` | List items (authenticated) |
| POST | `/api/items` | Add item (`text`) |
| PATCH | `/api/items/:id` | Set `completed` boolean |
| DELETE | `/api/items/:id` | Remove item |

## Scope / limitations
This is a **single-user localhost demo**, not a production authentication service. The password is provided through environment variables, not stored in a database; there is no signup, rate limiting, password reset or per-user item isolation. The file-backed item store is intended for a single Node.js process. Session cookies use `httpOnly` and `sameSite=lax`; use HTTPS and an appropriate proxy configuration before any production deployment. Do not expose the demo publicly without hardening authentication, CSRF protections and storage.
