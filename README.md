# Checklist Playwright automation 

This project tests the standalone Checklist App 

## Setup

Set `APP_USERNAME` / `APP_PASSWORD`

```bash
npm install
npx playwright install chromium
```

## Test projects

| Project | Timeout per test | Retries | Auth |
| --- | --- | --- | --- |
| `setup` | 10 seconds | 2 | UI login; writes `.auth/user.json` |
| `e2e` | 60 seconds | 1 | Browser uses saved storage state |
| `api` | 30 seconds | 1 | APIRequestContext uses saved storage state |

Commands:

```bash
npm run test:setup
npm run test:e2e
npm run test:api
npm test
npm run report
```

Running `test:e2e` or `test:api` automatically runs the setup dependency first. Playwright's project dependencies execute setup before dependent projects. Setup failure blocks dependent tests. `--no-deps` bypasses setup; avoid it unless intentionally reusing a recent session.

## Important session details

- The server uses an HTTP-only `checklist.sid` cookie. `storageState` preserves the cookie; tests do not need to read it via browser JavaScript.
- The server uses a **rolling 15-minute inactivity timeout** by default. This is not a hard lifetime; successful requests renew expiry. A saved session is only valid while its server-side session remains alive. The setup dependency re-authenticates for each run.
- API and E2E tests reuse the same authenticated session, so this demo runs sequentially (`workers: 1`). Do not run independent Playwright commands against the same server concurrently.
- The app has one shared checklist. Each test creates uniquely named items and removes its own data; do not run against a production or shared instance.
- Do not commit `.auth/user.json` or `.env`; they contain sensitive session/credential data.
- The rolling-cookie API test checks that responses send a renewed cookie, **not** actual idle-expiration timing. A separate controlled test with a short server timeout would be needed for expiry behavior.
- A server restart or a short idle timeout can invalidate saved sessions; rerun setup.
