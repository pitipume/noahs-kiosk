# AI usage log

Written **as it happens**, not reconstructed at the end. The README summary is built from this file.

Tool: Claude Code (Claude Opus).

## Who wrote what

| Part | Written by | How I checked it |
|---|---|---|
| Design docs (docs/01–03) | AI draft from my requirements; I reviewed and changed decisions | Read each one against the brief; asked "why" on each decision |
| API scaffold: Nest CLI project, Prisma schema, migration, seed, PrismaService, validation pipe | AI, from the DB design I approved | Compared schema against 02-database.md; ran migration and checked `\d menu_item` in psql shows the CHECK constraints; compiled with `tsc` |
| `GET /menu`, `POST /orders` (stock reservation, idempotency key), all layers | AI, following docs/01–03 | curl smoke test of each path: success, replayed key, sold out, multi-line rollback (Latte stock stayed 10), unknown item, invalid body. Concurrency proven by tests in phase 6. |
| Explicit return types on managers/repositories (`Promise<MenuItem[]>`, `OrderWithLines`) | **Me** (review feedback), AI applied | Asked why the manager's type was hidden; agreed the manager returns entities, not Response DTOs |
| Swagger UI at `/docs` | **My request** (easier manual testing), AI implemented | Opened `/docs-json` and checked that the request schemas contain the fields and the min/max rules |
| `POST /payments/confirm` (dedupe by eventId, conditional PENDING→PAID, amount check) | AI, following docs/03 §3 | curl: APPLIED / DUPLICATE / IGNORED (already paid) / IGNORED (amount mismatch) / 404 / 400; **10 identical confirmations fired in parallel → 1 APPLIED + 9 DUPLICATE**, checked in psql: 1 event row, 1 `paid_at` |
| Integration tests (Jest + supertest, real Postgres `kiosk_test`) | AI wrote them to the brief's two required scenarios + extras | **Negative control:** swapped in a naive read-then-write `tryDecrementStock` → 19/20 sold the last item, 2 tests failed; restored → 7/7 pass. Checked that the tests hit `kiosk_test` and left the demo `kiosk` DB untouched. |
| Next.js web: menu page (Server Component), Server Action, order form, auto-refresh, error page | AI, following docs/04-ui-states | `tsc`, ESLint, `next build` (route `/` is ƒ Dynamic), curl: SSR HTML contains prices/stock; stock bought by another client appears on next load without rebuild. Browser click-through: **me** (see PROGRESS) |
| Dockerfiles, docker-compose (db + api + web with healthchecks), payment simulator script | AI | Full stack up via compose; page renders 5 items; simulator 5× same event → 1 APPLIED + 4 DUPLICATE; 7/7 tests inside the container. **Fresh-clone run** under a separate compose project (new volume): migration applied, menu seeded, tests pass. |
| README decisions/caching/gaps/next/AI-usage sections | AI draft from the session; **reflection section = my notes**, AI tidied English | Read against the brief's 4 required README points |

## Times the AI was wrong (and how it was caught)

### 1. Installed a library version that didn't match the framework
- **What AI did:** `npm i @nestjs/cqrs` without a version. The latest is v12, which requires NestJS 12, but the project is NestJS 11.
- **How caught:** npm refused the install (`ERESOLVE: peer @nestjs/common@^12`).
- **Fix:** pinned `@nestjs/cqrs@11`. Lesson: pin major versions to match the framework instead of assuming "latest" fits.

### 2. Passed the wrong argument via `flatMap(fn)`
- **What AI did:** in the validation error formatter it wrote `errors.flatMap(flatten)`. `flatMap` calls `fn(item, index, array)`, so the array **index** was passed as `flatten`'s second parameter `parent` (a string path). Error paths would have come out as `0.lines` instead of `lines`.
- **How caught:** the TypeScript compiler (`tsc --noEmit`) rejected it: `Type 'number' is not assignable to type 'string'`. This is a classic JavaScript trap (same as `['1','2'].map(parseInt)`).
- **Fix:** `errors.flatMap((e) => flatten(e))`.

### 3. Seed script broke the build output path
- **What AI did:** put `prisma/seed.ts` in the project without excluding it from `tsconfig.build.json`. TypeScript then compiled two root folders, so the output moved to `dist/src/main.js` and `node dist/main` failed with `Cannot find module`.
- **How caught:** smoke-running the built API.
- **Fix:** excluded `prisma/` and `scripts/` from the build config.

### 4. Design doc said "200" for a replayed idempotency key
- **What AI did:** the design (01-architecture, 03-flows) said a retried order with the same key returns **200**, while a new order returns 201.
- **How caught:** while implementing the controller. Returning a different status for a retry means the client sees a different answer depending on whether the first response got lost, which defeats the point of idempotency (the retry should look exactly like the original).
- **Fix:** always 201 with the same order body, matching how Stripe replays the original response. Docs updated.

### 5. Didn't notice the project lived in an iCloud-synced folder
- **What happened:** the repo started under `~/Documents`, which macOS syncs to iCloud Drive. iCloud evicted files to "dataless" placeholders: first inside `node_modules` (the Prisma CLI exited silently, `tsc` hung for 2+ minutes instead of ~1 s), later the uncommitted phase 3–4 source files themselves.
- **How caught:** the AI first treated the Prisma failure as a random corruption and just reinstalled. Only when `tsc` hung with 0% CPU did it check the file flags (`ls -lO` → `compressed,dataless`) and find iCloud.
- **Fix:** fresh clone into `~/Developer` (not synced), phase 3–4 rebuilt from the session (the AI had written every file). Lesson for both of us: when tools behave randomly, check the environment before blaming the code, and commit/push small and often, since only pushed work survived.

### 6. Swagger showed empty request bodies
- **What AI did:** enabled the `@nestjs/swagger` CLI plugin with default options. The plugin only scans files named `*.dto.ts` / `*.entity.ts`, and our convention is `*.request.ts`, so `PlaceOrderRequest` appeared with **no fields**.
- **How caught:** checked the generated spec (`/docs-json`) instead of only checking that the page loads (HTTP 200).
- **Fix:** `"dtoFileNameSuffix": [".request.ts"]` in `nest-cli.json`. Lesson: "the page loads" isn't the same as "it's correct".

### 7. Design used pre-Next-16 APIs
- **What AI did:** the design docs said `revalidatePath('/')` after an order and assumed `error.tsx` receives `reset()`, both from older Next.js versions in its training data.
- **How caught:** Next 16 ships its docs inside `node_modules/next/dist/docs` with a note telling AI agents to read them first. Reading them showed `error.tsx` now gets `retry()`, and Server Actions have a dedicated `refresh()` for "re-render the current page", which fits better than revalidating a cache we don't use.
- **Fix:** used `refresh()` and `retry`; design docs updated.

### 8. `setState` inside `useEffect` (3×) and a "Start over" button that did nothing
- **What AI did:** synced state with effects (generate a key on mount, react to each result, clamp quantity). Separately, "Start over" cleared the key but left the last "unknown" result in place, so the warning stayed and the quantity stayed locked.
- **How caught:** ESLint's React rule `react-hooks/set-state-in-effect` flagged the 3 effects; the Start-over bug was found by re-reading the component before running it.
- **Fix:** key in a `useRef` set at submit time, state updates moved into the action, quantity clamp derived during render; Start over now hides the current result (`dismissedAt`).

### 9. Never ran the API linter until the final recheck
- **What AI did:** checked every backend phase with `tsc`, tests and curl, but never ran ESLint on `api/`. The final recheck found 28 lint errors: 5 formatting, 1 `require()` in the test setup, and ~22 "unsafe `any`" errors, mostly from supertest's untyped `res.body` in tests and `res.json()` in the simulator script. None were in the app's `src/` logic.
- **How caught:** a full-project recheck before submitting (I asked for one).
- **Fix:** typed the simulator's response, replaced `require` with `import`, formatted, and turned off the "unsafe any" rules for `test/**` only (supertest bodies are `any` by design; assertions check the shape). Lesson: run *every* checker the project ships with, not just the compiler.
- **Also found in the same recheck:** the README's local-dev steps said `cd api` then `cd web` (fails from inside `api/`), and the architecture doc still showed an early code sketch with function names that don't exist. Both fixed.

<!-- Format:
### <short title>
- **What AI did:**
- **How caught:** (test failed / I read the code / ran it)
- **Fix:**
-->
