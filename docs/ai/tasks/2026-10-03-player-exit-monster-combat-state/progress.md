# Progress: player-exit leaves monsterCombatState.attackerId unreindexed

Tier: S (bug) · Phases: 1

<!-- S-tier bug pipeline (tester-a, implementer-a only — no architect/plan stage).
     triage.md's Scope section is the contract. -->

## Phase 1: Repro + fix

- [x] reproduction test (tester-a): proves monsterCombatState.attackerId is left stale/out-of-range after an uninvolved player exits during monster combat
- [x] fix (implementer-a): `src/modules/game-rules/services/player-exit.service.ts` clears/decrements `monsterCombatState.attackerId` matching the `combatState` treatment
- [x] checks: typecheck clean; lint clean on changed files (repo-wide lint/test runs are polluted by an unrelated stray git worktree at `.claude/worktrees/angry-burnell-93c06f` — not excluded by eslint.config.mjs or jest's testPathIgnorePatterns; scoped run excluding it: 64/64 suites, 653/653 tests pass)
- [x] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 tester-a: DONE, added `describe('monsterCombatState handling', ...)` with 3 cases; 2 failed against the bug (proving it), 1 boundary case passed.
- 2026-10-03 implementer-a: DONE, added the monsterCombatState clear/decrement block in player-exit.service.ts mirroring the combatState block; all 41 tests in the file pass.
- 2026-10-03 coordinator: full checks — typecheck clean, lint clean on src/, 653/653 unit tests pass (scoped to exclude the stray `.claude/worktrees/angry-burnell-93c06f` worktree, which pollutes unscoped `npm run lint`/`npm test` with ~150 unrelated errors from a stale branch checkout — flagged to the user as a separate issue, not fixed in this task).
