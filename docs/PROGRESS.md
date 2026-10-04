# Progress log

Time budget: **≤ 8 hours total** (brief). Status: ⬜ todo · 🟨 in progress · ✅ done · ⏭️ skipped (with reason)

## Plan

| # | Phase | Est. | Actual | Status |
|---|---|---|---|---|
| 1 | Read brief, decide stack, write design docs (architecture, DB, flows) | 1h | ~1.5h (3 review rounds) | ✅ |
| 2 | API scaffold: NestJS + Prisma schema + migration + seed + Docker Postgres | 1h | ~1h (incl. node_modules fix) | ✅ |
| 3 | `GET /menu` | 0.25h | ~0.5h (with 4 + 4b) | ✅ |
| 4 | `POST /orders` with atomic stock reservation | 1h | + ~0.75h lost to iCloud, rebuilt | ✅ |
| 4b | `Idempotency-Key` on `POST /orders` (safe retry after timeout) | 0.5h |  | ✅ |
| 5 | `POST /payments/confirm` idempotent | 1h | ~0.5h | ✅ |
| 6 | Integration tests: concurrent orders + duplicate confirmations | 1h | ~0.5h | ✅ |
| 7 | Web: Next.js menu page (SSR) + order form + Server Action + refresh | 1.25h | ~1h | ✅ |
| 8 | Docker Compose one-command run, payment simulator script | 0.5h | ~0.5h | ✅ |
| 9 | README: run, decisions, trade-offs, next day, .NET/Angular reflection, AI usage | 0.5h |  | ⬜ |

## Log (what actually happened)

### 2026-10-04
- Read brief. Chose NestJS + PostgreSQL + Prisma, Next.js App Router, Jest integration tests, Docker Compose.
- Design docs written: `01-architecture.md`, `02-database.md`, `03-flows.md`.
- Design review round 1 (my feedback): added the Service-layer rationale, module table ownership, use-case folder (Request/Response), no-try/catch error handling with stable error `code`s, an honest note on CQRS (mediator only); DB naming (snake_case), UTC `timestamptz`, why there's no `created_by` yet; why there's no queue; new `04-ui-states.md` covering every happy/fail path the customer can hit.

- Design review round 2: clarified `timestamptz` (a type, not a naming choice); added idempotency key on orders so "Try again" after a timeout can't create a second order. Round 3: retry policy = manual, no hard cap, escalate to staff after 2 failures; lock quantity during retry.

- Phase 2: NestJS 11 scaffold, Prisma 6 schema (snake_case, timestamptz, CHECK constraints added by hand to migration), seed (only if empty), global ValidationPipe returning `VALIDATION_FAILED`. Postgres in Docker with a separate `kiosk_test` DB for tests. 3 AI mistakes caught (see ai-log).

- Version decision: stay on **NestJS 11** (`legacy` tag) and **Prisma 6**, though NestJS 12 (Sep 2026) and Prisma 7 exist. Reasons: time box, a stack I've already used (twon-next-nest), better-known docs; upgrading is a separate, testable task (README → next steps).
- I found that `npx prisma studio` from the repo root downloaded Prisma 8 RC instead of using the project's Prisma 6. Added an `npm run db:studio` script and a README note.

- Phases 3+4+4b: `GET /menu`, `POST /orders` with atomic conditional-UPDATE reservation, lines merged + sorted (deadlock avoidance), all-or-nothing rollback, `Idempotency-Key` header (fast-path lookup + UNIQUE index for races). Replayed key returns 201 + same order (changed from the design's 200, see ai-log #4). Added `npm run db:reset`. My review: explicit return types on managers/repositories.
- **Incident:** the repo was in `~/Documents` (iCloud-synced). iCloud evicted the uncommitted phase 3–4 files before they were committed. Re-cloned to `~/Developer`, rebuilt phase 3–4 from the session, verified with the same smoke test. ~45 min lost. Lesson: commit + push small and often (see ai-log #5).

- Swagger UI at `/docs` (my request, own commit). CLI plugin documents Request DTOs + validation rules automatically; responses are interfaces so not shown (converting to classes → next day).

- Phase 5: `POST /payments/confirm`. Order lookup (404) → `INSERT … ON CONFLICT DO NOTHING` on `provider_event_id` (DUPLICATE) → amount check (IGNORED + note) → conditional `UPDATE … WHERE status='PENDING'` (APPLIED or IGNORED). Always 200 for processed events so the provider stops retrying. Diagram in 03-flows §3 updated: implementation looks up the order *before* inserting the event (FK + clean 404).

- Phase 6: 7 integration tests (Jest + supertest) on a separate `kiosk_test` DB with a 20-connection pool so requests really run in parallel. Negative control proved the race test fails against naive read-then-write code (19/20 oversold). `npm test` = migrate test DB + run all, ~1 s.

- Phase 7: Next.js 16 web. Menu page = Server Component (`force-dynamic`, `fetch` `no-store`); `OrderForm` client component with `useActionState` (pending state, idempotency key in a ref, retry lock, Start over, failure escalation); Server Action `placeOrder` → API with 5 s timeout → `refresh()`; `AutoRefresh` polls `router.refresh()` every 5 s; `error.tsx` for API down. Verified: build, lint, SSR HTML, stock change visible without rebuild. **Still to verify by hand in a browser:** clicking Order, sold-out race message, error page.

- Phase 8: `docker compose up --build` runs db + api + web (api waits for a healthy db, web waits for a healthy api; api migrates + seeds-if-empty on start). Single-stage images keep dev deps so tests and the simulator run inside the api container (trade-off: bigger image). `simulate-payment.ts` plays the provider (`--times`, `--event`, `--amount`, `--order`). Verified a reviewer's fresh-clone run on a new volume.

## Out of scope (by brief): auth, styling, deployment, admin screens

## Next (if another day): see README → "What I would do next"
