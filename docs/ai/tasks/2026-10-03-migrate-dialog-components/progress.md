# Progress: Migrate CombatDialog and MonsterCombatDialog to src/modules/combat

Tier: M · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: CombatDialog
- [x] plan approved (architect-b)
- [x] characterization test written and passing against the legacy component (tester-a)
- [x] implementation (implementer-a: types/map/hook/fixtures/index; implementer-b: styles/view/wiring)
- [x] tests (tester-a: map/hook; tester-b: view)
- [x] preview (preview-a) registered in src/testbed/registry.ts
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) on the new preview
- [x] legacy CombatDialog.tsx and its characterization test deleted
- [x] final review (architect-b)
- [x] committed: 6788cdb

## Phase 2: MonsterCombatDialog
- [x] plan approved (architect-b)
- [x] characterization test written and passing against the legacy component (tester-a)
- [x] implementation (implementer-a: types/map/hook/fixtures/index; implementer-b: styles/screens/view/wiring)
- [x] tests (tester-a: map/hook; tester-b: view)
- [x] preview (preview-b) registered in src/testbed/registry.ts
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) on the new preview
- [x] legacy MonsterCombatDialog.tsx and its characterization test deleted
- [x] final review (architect-b)
- [x] committed: 311ea59

## Phase 3: Verification and docs
- [x] full checks: typecheck, lint, unit tests, build
- [x] no remaining references to the deleted legacy dialog files
- [x] browser smoke: both previews' states; game combat/monster-combat flow if reachable without Firebase credentials, otherwise e2e gameplay spec if the emulator and Java 21 are available, otherwise reported as not run
- [x] docs/README.md updated (src/modules/combat/ layout, GameDialogManager bullet)
- [x] final review (architect-b)
- [x] committed: a6de61d

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, wrote plan.md (Status: DRAFT) and this progress.md.
- 2026-10-03 architect-b: DONE, APPROVED plan.md.
- 2026-10-03 tester-a: DONE, characterization test (20 tests) against legacy CombatDialog.
- 2026-10-03 implementer-a/implementer-b: DONE, Phase 1 build; cross-review APPROVED both ways.
- 2026-10-03 tester-a/tester-b: DONE, 83 tests passing (map/hook/view).
- 2026-10-03 preview-a: DONE, CombatDialog.preview.tsx registered.
- 2026-10-03 preview-b: BLOCKER then DONE — blocked on parallel game-rules-actions-migration task leaving `@/modules/game-rules` unresolved; unblocked once that task committed, retried and passed ui-verify on all 5 states (desktop + mobile).
- 2026-10-03 coordinator: fixed 2 new typecheck errors and 5 lint errors in tester-b's CombatDialog.test.tsx (missing HTMLImageElement cast, unused imports/any, unused rerender) directly rather than another agent round-trip.
- 2026-10-03 implementer-b: DONE, deleted legacy CombatDialog.tsx and its characterization test.
- 2026-10-03 architect-b: DONE, final review APPROVED. Committed 6788cdb.
- 2026-10-03 tester-a: DONE, characterization test (28 tests) against legacy MonsterCombatDialog.
- 2026-10-03 implementer-a/implementer-b: DONE, Phase 2 build. implementer-b corrected implementer-a's MonsterAttackViewModel to match plan.md's contract directly (file-ownership slip, flagged and resolved by routing the verdict back through implementer-a); cross-review APPROVED both ways.
- 2026-10-03 tester-a/tester-b: DONE, 91 tests passing (map/hook/view); two follow-up rounds to fix typecheck casts and lint (unused imports) in tester-a's files.
- 2026-10-03 preview-a: DONE, MonsterCombatDialog.preview.tsx registered.
- 2026-10-03 preview-b: DONE, flagged 404s from fabricated .png sprite paths in fixtures as "non-blocking" — coordinator verified directly, found real monster sprites are .gif with a shared /sprites/death.gif, routed fix to implementer-a (fixtures owner), re-verified all 5 states visually after the fix.
- 2026-10-03 implementer-b: DONE, deleted legacy MonsterCombatDialog.tsx and its characterization test.
- 2026-10-03 architect-b: DONE, final review APPROVED. Committed 311ea59.
- 2026-10-03 coordinator: DONE, full repo typecheck/lint/test/build clean, grep sweep for stale references clean, fixed stale .claude/launch.json port (3000 → 9002) blocking browser verification, browser-smoke-tested both previews, updated docs/README.md.
- 2026-10-03 architect-b: DONE, final review APPROVED across all 3 phases. Committed a6de61d.
