# Deploying and testing Hackathonownik

For the people who put the app on a server and for those who test it before and during the event.
Short version of the product is in the [README](../README.md), history and decisions in
[PROJECT-LOG.md](PROJECT-LOG.md).

## 1. What runs where

| Part | What it is | Who needs it |
| --- | --- | --- |
| App | SvelteKit on Node 20, built with `adapter-node`, one process | everybody uses it |
| PocketBase 0.40 | database, accounts, uploaded PDFs. Participants and jurors can reach its API with their own login, so its rules matter | the app talks to it as superuser |
| Reverse proxy | TLS, optional. Must set `X-Forwarded-For` | recommended |

The app keeps short caches (2 s) and revocation of logged-out sessions in memory: run **one** process
if you can. Several processes work (the load test covered two), but data may be up to 2 s old and a
logout is only known to the process that handled it.

## 2. Checklist for the deployer

1. **PocketBase**: install 0.40.x, create the superuser, start it (`./pocketbase serve --http 127.0.0.1:8090`). Put it behind HTTPS if participants can reach it.
2. **Schema**: `POCKETBASE_URL=… POCKETBASE_ADMIN_EMAIL=… POCKETBASE_ADMIN_PASSWORD=… node scripts/pocketbase-setup.mjs`. It creates collections, fields and API rules, makes the PDF fields *protected* and can be run again at any time (also on an existing database).
3. **First admin**: in the PocketBase admin UI create a user in `users` with `role = admin`, a verified e-mail and a strong password. Everything else (jurors, teams, participants) is done in the app.
4. **`.env`** (copy `.env.example`):
   - `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD`: the superuser the app uses.
   - `COOKIE_ENCRYPTION_KEY`: `openssl rand -base64 32`. Changing it logs everybody out.
   - `ADMIN_ACTION_PASSWORD`: the second password for decisions, long and different from every login. Without it publishing, people and imports stay locked.
   - `ORIGIN`: the public address, e.g. `https://hotb.example.org` (needed for SvelteKit's cross-site checks).
   - `PORT` (default 3000). Behind a proxy that sets `X-Forwarded-For`: `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`. Without it the whole venue looks like one address to the login limiter. Do not expose the app directly when these are set.
   - **Never set `NODE_ENV=development`.** Vite reads it at build time and the build then skips the cross-site form check.
5. **Config**: `app_config.yaml`: the three Sunday deadlines (`presentation_deadline`, `deadline`, `final_presentation_deadline`, always with a UTC offset, `+01:00` in November), `checkin_deadline`, categories, criteria, schedule.
6. **Build and start**: `npm ci && npm run build && npm start` (that is `node build`). Keep it alive with systemd, pm2 or a container, and restart on failure.
7. **Smoke test** (section 4).
8. **Data**: log in as admin, unlock sensitive actions, add jurors (*Admin Dashboard*), assign them to categories, import teams and participants from CSV (*Import*) and hand out the generated passwords (shown once, download the CSV).

Example nginx location (adapt TLS):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # not $proxy_add_x_forwarded_for, so it cannot be forged
    client_max_body_size 45m;                         # PDFs up to 40 MB
}
```

Environment of the app and of PocketBase must allow uploads of 40 MB (PocketBase limit is set by the schema script).

## 3. Roles and what each one does

- **Participant**: `/upload` (PDF, repo link, video link, later the final PDF), `/my-submission`, the ranking once their category is published.
- **Jury**: `/rate_presentation` (only assigned categories), `/presentations`, own private notes, confirms ratings per category; sees the category ranking once all its jurors confirmed.
- **Admin**: everything, plus *All ratings*, *People and teams*, *Audit log*, *Presenter mode* (`/present`). Decisions need the second password.

Judging flow per category: preliminary rating → every juror rates every team and confirms → admin picks finalists and starts the final → final rating and confirmations → tie-break vote if needed → publish. Ratings lock when published; unpublishing reopens them.

## 4. Smoke test after every deploy (10 minutes)

1. `/login` opens, wrong password shows an error, right one lands on the role's home page. *Logout* returns to login and the back button does not show private pages.
2. Admin: dashboard loads, *Unlock* with the action password works and a wrong one is refused, *Audit log* shows the unlock.
3. Participant: upload a small PDF, a repo link and a video link; *My submission* shows all three with the author. Open the PDF link of another team (copy the URL while logged in, open it logged out): must be refused.
4. Jury: open a team's PDF, video and repo, rate it (sliders), write a note, reload: values stay. Confirm becomes possible only after every team is rated.
5. Admin: *Jury review* shows which juror opened what; finalists, final, publish (needs unlock); participant sees the result, a rating attempt after publishing is refused.
6. Response headers on `/login`: `Content-Security-Policy` without `unsafe-inline`/`unsafe-eval` for scripts, `X-Frame-Options: DENY`.
7. Phone (a real one): log in as a juror, rate a team, open the menu, open the ranking.

Do this on a **test database**, not on the event data. `scripts/seed-demo.mjs` fills a test PocketBase with 62 teams, 217 participants, 15 jurors, 2 admins (`DEMO_PASSWORD=… node scripts/seed-demo.mjs`, accounts like `admin@demo.test`, `jury-adaptive-1@demo.test`, `p1-1@demo.test`). Never run it on production.

## 5. Automated tests

| What | Command | Needs |
| --- | --- | --- |
| Unit (CSV import, ratings, ranking, unlock tokens, sessions) | `npx vitest run --project server` | nothing |
| End-to-end (roles x pages and endpoints, submissions, judging incl. final and tie-break, second password, injection, XSS, CSRF, forged cookies, direct PocketBase access, uploads, login limiter, logout) | `npm run test:e2e` | a **throw-away** PocketBase and the app as a **production build**, see [tests/e2e/README.md](../tests/e2e/README.md) |
| Load (217 participants, 15 jurors, 62 teams: logins, upload rush, rating, publishing, everyone opens the ranking) | `node scripts/load-test.mjs` | seeded throw-away stack. `APP_URL` may list several processes, `ADDRESS_HEADER=X-Forwarded-For` on the app gives every simulated person an address |

Last results: 66 unit and 195 end-to-end tests pass; the load test had no failed request, p95 about
0.15 s (ratings 0.5 s) at about 270 MB of memory. The e2e tests need an empty database (no seeded
teams) and wrong-password tests stay below the lockout limit; if a run is locked out, wait 10 minutes or
restart the app.

Run the e2e suite against the **production build**: the dev server skips SvelteKit's origin check.

## 6. On the event day

- Keep the admin action password with the organizers who decide. After a decision click *Lock now*.
- Watch the *Audit log* for `denied:` and `unlock:wrong-password` lines.
- Check-in (Saturday night): the dashboard shows which teams uploaded anything before `checkin_deadline`.
- Deadlines in `app_config.yaml` need an app restart to change.
- A juror locked out by wrong passwords is free again after 10 minutes; a participant who forgot the password: the admin resets it in *People* (new password shown once).
- Backups: copy PocketBase's `pb_data` directory (database and uploaded PDFs) before the event, after the preliminary round and after publishing.

## 7. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Everybody gets "Too many wrong passwords" | proxy hides client addresses: set `ADDRESS_HEADER`/`XFF_DEPTH` |
| 500 on every page when reaching the app directly | `ADDRESS_HEADER` is set but no proxy sends the header |
| Forms answer 403 "Cross-site POST form submissions are forbidden" | `ORIGIN` does not match the address in the browser |
| Sensitive actions say "locked" or "disabled" | unlock first; if "disabled", `ADMIN_ACTION_PASSWORD` is not set |
| PDFs return 404 or do not open | wrong superuser credentials in `.env` (the app fetches protected files with the superuser's file token), or PocketBase is unreachable |
| Login says "Something went wrong" | PocketBase is down or its disk is full |
| Jurors see no teams | juror has no category (Dashboard → jurors), or teams have no submission yet |
| Deadlines show the wrong hour | missing UTC offset in `app_config.yaml` |
| Whole site is logged out after a deploy | `COOKIE_ENCRYPTION_KEY` changed |

## 8. Known limits

- Logged-out sessions are remembered in memory only (a restart forgets them).
- The jurors' private notes are not visible to the admin.
- `/api/stage` (live "now on stage") is not behind the second password on purpose.
- Style: the rating form is a modal. The redesign mockups (`docs/redesign`) show it inline; not done because it changes behavior.
