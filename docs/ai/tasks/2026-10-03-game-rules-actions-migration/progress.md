# Progress: Migrate src/lib/actions reducers to src/modules/game-rules

Tier: L · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: attack + movement → game-rules
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests pass (466/466); e2e/gameplay.spec.ts could not run — local Firestore emulator needs Java 21, not installed on this machine (tester-b: `java -version` → "Unable to locate a Java Runtime"); no UI change in this task to verify as a substitute
- [x] committed: 614458b

## Phase 2: card + player + resource + dispatcher + player-exit service → game-rules
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests pass (573/573; typecheck/lint errors only in the concurrent task's CombatDialog.test.tsx); e2e/gameplay.spec.ts not run, no Java 21 locally
- [x] docs/README.md updated
- [x] final review (architect-b) — the pipeline's one and only final-review stage (triage.md: `architect-b:final-review` appears once, at the end)
- [x] committed: b05f3b4

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, wrote plan.md (DRAFT) and progress.md.
- 2026-10-03 architect-a: DONE, revised plan.md per architect-b review (`.reducer.ts` rename, progress.md fix) and folded the user's resource.ts/index.ts scope expansion into the file plan.
- 2026-10-03 architect-b: APPROVED (re-review), plan.md Status → APPROVED.
- 2026-10-03 implementer-a: DONE, created src/modules/game-rules/{dice.ts, 5 combat reducers, movement.reducer.ts, island-discovery.reducer.ts, index.ts}; cross-reviewed implementer-b APPROVED.
- 2026-10-03 implementer-b: DONE, repointed all Phase 1 call sites to @/modules/game-rules, deleted attack.ts/movement.ts, added .reducer.ts row to component-architecture skill; cross-reviewed implementer-a APPROVED.
- 2026-10-03 tester-a: DONE, wrote 8 new test files (79 tests), deleted combat.test.ts/movement.test.ts, fixed a plan gap in cards.test.ts's movement import.
- 2026-10-03 tester-b: CHANGES REQUESTED (2 untested branches: island-discovery VP-goal win check, combat-player-roll attacker-not-found no-op) → tester-a revise → tester-b re-verified APPROVED.
- 2026-10-03 coordinator: ran full checks — typecheck clean (2 pre-existing errors in concurrent migrate-dialog-components task's CombatDialog.test.tsx, unrelated), lint clean (same file's pre-existing issues), npm test 54/54 suites, 466/466 tests. e2e skipped, no Java 21 locally.
- 2026-10-03 implementer-a/implementer-b (phase 2): DONE, created card/player/resource reducers, services/player-exit.service.ts, game-rules.reducer.ts; deleted src/lib/actions/; repointed remaining call sites and mocks; updated docs/README.md. Cross-reviews APPROVED.
- 2026-10-03 tester-a (phase 2): DONE, 8 new test files, deleted cards.test.ts/player-actions.test.ts, trimmed turn-progression.test.ts.
- 2026-10-03 tester-b (phase 2): CHANGES REQUESTED (weak assertions, handlePlayerExit and dispatcher gaps) → tester-a revise → APPROVED. Found a pre-existing turn-skip bug in handlePlayerExit (legacy behavior, pinned by KNOWN BUG tests, queued as a separate task).
- 2026-10-03 architect-b (phase 2 final review): APPROVED, review.md written. Coordinator fixed the stale `src/lib/actions` references in 5 skills and game-designer-a.md; CLAUDE.md:19 left for the user.
- 2026-10-03 coordinator (phase 2): npm test 60 suites / 573 tests pass; typecheck errors only in the concurrent task's CombatDialog.test.tsx; game-rules and game-board lint clean. e2e skipped, no Java 21 locally.
