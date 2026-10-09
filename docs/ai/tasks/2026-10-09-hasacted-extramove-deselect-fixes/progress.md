# Progress: hasActed/Extra Move consistency + Deselect Army card refund

Tier: S · Phases: 1

## Phase 1: all five fixes, one commit
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] docs-sync (if behavior documented elsewhere changed)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
- 2026-10-09 architect-a: DONE, plan.md drafted.
- 2026-10-09 architect-b: DONE, plan.md reviewed and APPROVED (fixed two line-number citations, reworded File plan row for game-board.local-actions.hook.ts).
- 2026-10-09 implementer-a: DONE, five reducer/hook fixes applied; typecheck/lint clean; 1 expected pre-existing-behavior test failure left for tester-a (resource-position.reducer.test.ts:54); two unrelated .agents/skills test suites also failing, not investigated (outside touched code).
- 2026-10-09 tester-a: BLOCKER — plan's "remove the = false line" respawn fix doesn't set hasActed:true for a defending army that loses (nothing else writes that army's hasActed during combat).
- 2026-10-09 architect-a: DONE (revise), plan.md Contracts changed to explicit `losingArmy.hasActed = true;` assignments in both combat-player-resolve.reducer.ts branches and combat-monster-resolve.reducer.ts; Status reset to DRAFT.
- 2026-10-09 architect-b: DONE, round 2 review, plan.md re-APPROVED.
- 2026-10-09 implementer-a: DONE (resume), added the three explicit `hasActed = true` lines; typecheck/lint/test clean except the two pre-existing unrelated .agents/skills suites (confirmed by coordinator to fail identically on unmodified HEAD).
- 2026-10-09 tester-a: DONE, updated/added tests across 6 reducer suites plus new game-board.local-actions.hook.test.ts (9 tests); full matrix from plan.md Test plan covered.
- 2026-10-09 docs-sync: DONE, updated docs/architecture/game-mechanics.md (§6.2, 6.3, defeated-army respawn) and docs/architecture/special-cards.md (§6.6 Extra Move) to match the fixed behavior; also corrected a pre-existing doc inaccuracy unrelated to this phase's code diff.
- 2026-10-09 architect-b: DONE, final review APPROVED. review.md written.
