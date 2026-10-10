# Final review: Replace a leaving player with a bot, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (`tsc --noEmit`, no output).
- `npm run lint` (run as literally specified, from repo root): **fails with 15515 problems**, but every single reported error/warning is inside `.claude/worktrees/inspiring-kare-ee7f7f/` — a leftover git worktree (a full duplicate checkout, including its own `node_modules`, `src`, `e2e`) sitting under `.claude/`. It is listed in `.git/info/exclude` (git-ignores it) but is not in `eslint.config.mjs`'s `IGNORED_PATHS`/`LEGACY_PATHS`, so a repo-root `npm run lint` lints that duplicate tree too. Pre-existing, unrelated to this phase — none of the reported errors are in a file this phase touched. Scoped check instead: `npx eslint <the 8 files this phase changed>` → 0 errors (1 expected "file ignored" warning for `src/lib/types/player.ts`, which is under `LEGACY_PATHS`). Matches what implementer-a reported.
- `npm test` (run as literally specified): **58 suites / 578 tests fail**, same cause — jest's default `testPathIgnorePatterns` (`jest.config.js:17`) doesn't exclude `.claude/`, so it also picks up and runs the duplicate worktree's own test suite (including its own `e2e/*.spec.ts`, which shouldn't run under jest at all). Scoped check: `npx jest src --testPathIgnorePatterns='/\.claude/'` → `Test Suites: 1 failed, 165 passed, 166 total`, `Tests: 2010 passed, 2010 total`. The one failing suite, `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` ("must contain at least one test"), is a test-utils file jest's own config already excludes (`jest.config.js:17`); it only surfaces when overriding `testPathIgnorePatterns` on the CLI (which replaces, not appends, the config's list). Matches implementer-a's reported 2010 passed / 1 pre-existing unrelated failure exactly.
- ui-verify: not applicable — Phase 1 is logic-only, no new UI (per plan.md's Preview states section).

**Environment note for the coordinator/user, not a finding against this phase:** `npm run lint` and `npm test` run exactly as documented in CLAUDE.md are currently broken repo-wide by the stray `.claude/worktrees/inspiring-kare-ee7f7f/` directory. This will keep poisoning every phase's checks (and CI, if it lints/tests the whole tree) until that worktree is removed (e.g. `git worktree remove` / `rm -rf .claude/worktrees/inspiring-kare-ee7f7f`, from outside that directory). Not part of this task's file plan, so not fixed here.

## Plan adherence
Checked against plan.md's Phase 1 contract and Contracts section for `handlePlayerExit`:
- `status === 'playing'`, seat already `isBot`: no-op — met (`player-exit.service.ts:54-56`; test "is a no-op for a seat that is already a bot").
- `status === 'playing'`, zero remaining real players: delete — met (`player-exit.service.ts:57-60`; test "deletes... when the last human leaves" equivalent under the Playing describe block — confirmed via the "converts the last human seat only when another human still remains" boundary test).
- `status === 'playing'`, otherwise: `isBot = true`, `isVacant = true`, `handleEndTurn` if it was their turn, never splices/renumbers — met (`convertSeatToBot`, `player-exit.service.ts:11-25`; tests "converts a non-host seat... without removing it, renumbering it, or touching the map", "passes the turn to the next seat when...", "does not move currentPlayerIndex when a seat other than the current one is converted").
- `status !== 'playing'`: byte-for-byte unchanged — met, confirmed directly: `git diff` on `player-exit.service.ts` shows the pre-game branch (splice, renumber ids, baseTiles, map, combatState, monsterCombatState, currentPlayerIndex adjustment) is untouched below the new `if (currentState.status === GameStatus.Playing) { ... return; }` block.
- `Player` type additions and `createPlayer` defaults match the plan's Contracts block exactly (`isVacant: boolean`, `lastSeenAt: number | null`, `reclaimRequested: boolean`, all three defaulted `false`/`false`/`null` in `createPlayer`).
- The blanket "host leaves while playing → always delete" branch is removed, as the plan required — confirmed in the diff (the old `(isHost && status===Playing) || ...` condition is gone; `isHost` is now only used in the pre-game branch).
- `docs/architecture/systems-and-visuals.md` §6.9 and the "Match Dismantling Rules" paragraph under §6.12, and `docs/README.md`'s index row, accurately describe the new behavior (checked against the actual code, not just restated prose).

All Phase 1 File plan rows accounted for: `src/lib/types/player.ts`, `player-factory.ts`, `player-exit.service.ts`, `player-exit.service.test.ts` — all present and correct.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `e2e/e2e-cleanup.ts`, `src/modules/session/components/Login/Login.styles.ts` | Both modified in the working tree but not mentioned anywhere in implementer-a's Phase 1 report, not in plan.md's File plan, and unrelated to this task (click-timeout tweaks in the e2e cleanup helper; `h-screen`→`min-h-screen` in Login). Likely leftover uncommitted work from a different task/session. | coordinator | Not blocking Phase 1's own correctness, but **must not be swept into this phase's commit** — stage only the Phase 1 files listed in plan.md's File plan when committing. |
| 2 | (environment) `.claude/worktrees/inspiring-kare-ee7f7f/` | Stray duplicate worktree checkout breaks a plain `npm run lint` / `npm test` run from repo root (see Checks). Pre-existing, not introduced by this phase. | coordinator/user | Not blocking — scoped checks confirm Phase 1 itself is clean. Flagging so it doesn't get misread as a regression in a later phase's check. |

No findings against the actual Phase 1 diff.

## Docs
- `docs-sync`: ran. Updated `docs/architecture/systems-and-visuals.md` §6.9 (bot-creation paragraph) and the §6.12 "Match Dismantling Rules" subsection, plus `docs/README.md`'s index row for that file. Verified both against the shipped code — accurate.
