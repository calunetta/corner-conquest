# Progress: App entry points migration

Tier: M · Phases: 2

## Phase 1: icons.tsx split
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: 10dc4b8

## Phase 2: app entry points
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify); e2e `e2e/auth-and-lobby.spec.ts`: not run — no Java 21 installed
- [x] final review (architect-b)
- [x] committed: 9532cfd

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-04 implementer-b: fixed an unplanned lint finding in `src/app/layout.tsx` (redundant manual Google Fonts `<link>` tags, exposed once the file left `LEGACY_PATHS`) — removed, `next/font` already self-hosts the font, no behavior change.
- 2026-10-04 ui-verify (coordinator): desktop + mobile screenshots of `/`, plus a scripted Playwright check (hydration attribute, disabled-state logic, focus styling) — all pass, zero console errors.
