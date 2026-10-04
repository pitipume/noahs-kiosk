# AI usage log

Written **as it happens**, not reconstructed at the end. The README summary is built from this file.

Tool: Claude Code (Claude Opus).

## Who wrote what

| Part | Written by | How I checked it |
|---|---|---|
| Design docs (docs/01–03) | AI draft from my requirements; I reviewed and changed decisions | Read each one against the brief; asked "why" on each decision |
| API scaffold: Nest CLI project, Prisma schema, migration, seed, PrismaService, validation pipe | AI, from the DB design I approved | Compared schema against 02-database.md; ran migration and checked `\d menu_item` in psql shows the CHECK constraints; compiled with `tsc` |
| _(filled in as we go)_ | | |

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

<!-- Format:
### <short title>
- **What AI did:**
- **How caught:** (test failed / I read the code / ran it)
- **Fix:**
-->
