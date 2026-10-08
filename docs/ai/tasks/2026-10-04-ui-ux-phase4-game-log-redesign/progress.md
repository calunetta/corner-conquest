# Progress: Game log readability redesign

Tier: L · Phases: 2 (estimate, architect-a to confirm/cut)

## Phase 1: game-rules structured log entries + shared helper
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) — not applicable: zero visible change by design (plan.md)
- [x] final review (architect-b)
- [x] committed: e688b3f

## Phase 2: GameLog consumes structured entries (turn dividers, color, declutter toggle, copy)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 59554d4

## Log
- 2026-10-05 architect-a: DONE, 2-phase plan written (Phase 1 game-rules data migration, Phase 2 GameLog view redesign). Corrected the design doc's test-file count (12, not 11 — bot-turn.reducer.test.ts also asserts on .log indirectly).
- 2026-10-05 architect-b: APPROVED. Verified all 61 planned log.push sites against the category/playerId/targetPlayerId/isPassive/isMilestone table directly in source; confirmed the 12-file test correction.
- 2026-10-05 implementer-a/implementer-b: DONE, Phase 1 implemented. implementer-a found a 62nd log.push call site the plan's grep missed (src/modules/game-rules/services/player-exit.service.ts:42, outside the non-recursive glob) — migrated as an addendum with category 'system', plus its own test file (player-exit.service.test.ts), since it wasn't in tester-a's assigned 12. implementer-a also extracted src/modules/game-rules/game-settings.ts (defaultGameSettings) and src/modules/game-rules/player-cancel-action.reducer.ts, pre-authorized in plan.md's Decisions, to keep game-setup.reducer.ts/player-actions.reducer.ts under the 150-line lint cap after the mechanical edit. Cross-reviews: both APPROVED.
- 2026-10-05 tester-a/tester-b: DONE. Migrated all 12 planned reducer test files plus 2 more found via full-suite run (combat-player-roll.reducer.test.ts, game-setup.reducer.test.ts — same root cause, not compile errors but runtime toContain failures) to assert via toLogMessage. New log-entry.test.ts. GameLog.test.tsx covers structured + legacy string rendering. 268 scoped tests passing.
- 2026-10-05 architect-b (final review): APPROVED. UI verified not run — Phase 1 has zero visible change by design (plan.md), nothing for ui-verify to check.

