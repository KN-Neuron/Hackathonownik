# Project log: what was done, what was found, what is open

Single place so nobody gets lost. Newest entries at the bottom of each section. Keep it updated
(whoever changes something important adds a line). Commit messages and PRs carry no co-author lines.

## Decisions

| Decision | Why |
| --- | --- |
| Rating limiter stays off | The limit came from last year's constraints (organizer decision). Admin decisions are protected by the second password instead. |
| Three deadlines: first presentation (PDF) `presentation_deadline`, links (repo, video) `deadline`, final presentation `final_presentation_deadline` | Organizers want the first presentation to close separately. Without `presentation_deadline` it falls back to `deadline`. **Hours in `app_config.yaml` are placeholders until confirmed.** |
| Jurors see only their categories; results per category | Event format: 5 categories, 3 jurors each. |
| Admin sees everything except jurors' private notes | Notes are the juror's own. Say if that should change. |
| `/api/stage` (live "now on stage") is not behind the second password | It is used live on stage; it changes no results. |
| Production PocketBase setup is the organizers' job | `scripts/pocketbase-setup.mjs` does it; see README. |
| Phone checks on real devices later | Jurors mostly use phones; only emulated 375 px was checked. |

## Work done (chronological)

1. Submission flow: separate items (PDF, repo, video) merged into one view, authors shown, jury sees the newest of each.
2. Event format: categories, two-stage judging (rules §8), publishing per category, notes and feedback, presenter mode with timer, "now on stage", view tracking, search and order, CSV import, adding jurors, README.
3. Admin hardening (PR #19): second password for decisions, audit log, admin overview pages (all ratings, people and teams), server-side tie check, `scripts/pocketbase-setup.mjs`, `scripts/seed-demo.mjs`.
4. End-to-end tests (`npm run test:e2e`, 191 tests, `tests/e2e/README.md`) and load test (`scripts/load-test.mjs`).
5. Separate deadline for the first presentation.
6. Security follow-ups: login limiter, session revocation on logout, authenticated cookie encryption, strict CSP, collapsible mobile menu, multi-process load test (195 e2e tests passing).

## Findings from testing, and what happened to them

| Finding | Status |
| --- | --- |
| Jurors and participants could not log out (route check blocked `/logout`; a leftover `+page.ts` hid the endpoint) | Fixed, tested |
| Uploaded PDFs were public in PocketBase | Fixed: protected fields, served by the app. **Run `node scripts/pocketbase-setup.mjs` on production.** |
| `.env.example` had `NODE_ENV=development`, so "production" builds skipped SvelteKit's cross-site form check | Fixed, README warns |
| Unresolved tie for first place only blocked in the UI | Fixed on the server |
| Winner of the tie vote could be any team | Fixed: only a tied team |
| Admin "confirm for juror" skipped the "rated everything" rule | Fixed |
| 2 MB feedback comment gave a 500 | Fixed: 5000-character limit |
| JSON writes with a foreign `Origin` were accepted | Fixed: refused in `hooks.server.ts` |
| Dev server skips the cross-site form check | By design in SvelteKit; run e2e against a production build |
| No login attempt limit | Fixed: 10 wrong passwords lock an account for 10 minutes, 200 per address (the venue may share one). Needs `ADDRESS_HEADER` behind a proxy. |
| A stolen session cookie keeps working after logout until it expires (stateless PocketBase tokens) | Fixed: each session has an id that logout revokes (in memory: a restart forgets it) |
| Session cookie used AES-CBC without authentication | Fixed: AES-256-GCM, tampered cookies are rejected; everyone logs in again once after the deploy |
| CSP allowed `unsafe-inline` and `unsafe-eval` for scripts | Fixed: SvelteKit nonce; styles still allow inline |
| Navigation menu took ~40% of a phone screen; some links under 44 px | Fixed: collapsed behind a Menu button, 44 px targets |
| Load test came from one IP and one process | Done again with two processes and 217 different addresses: 0 failed requests |

## Test results (last run)

- Unit: 66 passing.
- End-to-end: 195 passing on a production build (adapter-node 5.2) and a throw-away PocketBase.
- Load (217 participants, 15 jurors, 62 teams): 0 failed requests, p95 about 0.15 s, ratings 0.5 s, about 270 MB.

## Before the event (checklist)

- [ ] Confirm the three deadline hours in `app_config.yaml` (`presentation_deadline`, `deadline`, `final_presentation_deadline`) and `checkin_deadline`.
- [ ] Set `ADMIN_ACTION_PASSWORD` (long, different from every login) and keep it with the organizers who decide.
- [ ] Run `node scripts/pocketbase-setup.mjs` against production PocketBase.
- [ ] Behind a proxy: `ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1`.
- [ ] Build without `NODE_ENV=development`; start with `ORIGIN=https://your.domain node build`.
- [ ] Real phones: log in as a juror and rate a team; open the ranking.
- [ ] Add jurors and assign categories; import teams from CSV; hand out generated passwords.
- [ ] Rehearse: unlock, final, tie vote, publish, lock again.
