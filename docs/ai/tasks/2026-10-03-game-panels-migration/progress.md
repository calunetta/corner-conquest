# Progress: Migrate game panels (ActionsPanel, PlayerInfo, GameLog) to src/modules/hud

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Migrate all three panels into src/modules/hud
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 97a3562
- not run: e2e/gameplay.spec.ts (no Java 21 installed locally, required for the Firestore emulator) — unit and view tests cover the migrated panels instead.

## Found bugs fixed
- **PlayerInfo.map.ts:14 — Division by zero with double-zero vpGoal**: Legacy formula `(victoryPoints / vpGoal) * 100` with both === 0 yields NaN, which propagates through Math.min/max and breaks progress-bar width styling. Guard `if (vpGoal <= 0) return FULL_PROGRESS` returns 100 instead (the sensible safe default). Test case added: PlayerInfo.map.test.ts "handles vpGoal === 0 AND victoryPoints === 0 by returning 100 (found-bug fix)".

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->

