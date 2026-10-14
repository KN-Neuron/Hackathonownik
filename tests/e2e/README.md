# End-to-end tests

These tests talk to a running app and a real PocketBase over HTTP: every role against every page
and endpoint, team submissions, judging from rating to publishing, the admin action password, and
attacks (injection, XSS, CSRF, forged cookies, direct PocketBase access, uploads).

**Never point them at production data.** Each spec creates its own fixtures and deletes them, but it
also changes the shared `event_state` (and restores it), so use a throw-away PocketBase.

## Run

```bash
# 1. A throw-away PocketBase (any free port) with the schema
./pocketbase serve --http 127.0.0.1:8091 --dir /tmp/e2e-pb       # create its superuser first
POCKETBASE_URL=http://127.0.0.1:8091 node scripts/pocketbase-setup.mjs

# 2. The app as a production build against it (the dev server skips SvelteKit's origin check)
ORIGIN=http://localhost:4175 PORT=4175 POCKETBASE_URL=http://127.0.0.1:8091 node build

# 3. The tests (the database must contain no teams of the demo, so wipe it after seed-demo)
POCKETBASE_URL=http://127.0.0.1:8091 APP_URL=http://localhost:4175 npm run test:e2e
```

`POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD`, `ADMIN_ACTION_PASSWORD` and
`COOKIE_ENCRYPTION_KEY` come from `.env`. Files run one after another (`--no-file-parallelism`):
they share the app's short-lived caches and the "adaptive"/"fnirs" categories.

The wrong-password tests stay under the app's lockout limit (5 in a row from one address); a
lockout lasts 15 minutes or until the app restarts.
