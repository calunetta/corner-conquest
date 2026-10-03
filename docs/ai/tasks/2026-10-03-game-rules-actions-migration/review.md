# Final review: Migrate src/lib/actions reducers to src/modules/game-rules, phase 2/2

VERDICT: APPROVED

Approval carve-out (stated by the coordinator, verified by me): typecheck and lint fail only inside `src/modules/combat/components/CombatDialog/CombatDialog.test.tsx`, which belongs to the concurrent `2026-10-03-migrate-dialog-components` task. No error touches a file of this task. e2e was not run (no Java 21).

## Checks run
- `npm run typecheck`: 2 errors, both `src/modules/combat/components/CombatDialog/CombatDialog.test.tsx(510,48)` and `(529,48)` TS2339 (`alt` on `HTMLElement`). Zero errors elsewhere.
- `npm run lint`: `6 problems (5 errors, 1 warning)`, all in the same `CombatDialog.test.tsx` (unused `within`, `CardName`, `unoptimized`, `rerender`; one `any`; one `<img>` warning). Zero findings in `src/modules/game-rules/**`, the hooks, `bot-logic.ts` or the characterization tests.
- `npm test`: `Test Suites: 60 passed, 60 total` / `Tests: 573 passed, 573 total`.
- `npm run test:e2e -- e2e/gameplay.spec.ts`: not run (no Java 21 locally, same as Phase 1). Residual risk: the reducers and the player-exit transaction are covered by unit tests only, with Firestore mocked.
- ui-verify: not applicable (no UI change, per plan).

## Plan adherence
- `src/lib/actions/` gone: met. `ls src/lib/actions` returns "No such file or directory"; `git status` shows `card.ts`, `index.ts`, `player.ts`, `resource.ts` deleted (`attack.ts`, `movement.ts` went in Phase 1). Every reducer file is at or under 150 lines (max 148, `player-actions.reducer.ts`); no `any`.
- `handlePlayerExit` is a service: met. `src/modules/game-rules/services/player-exit.service.ts` imports `db, doc, runTransaction` from `@/lib/firebase` and `handleEndTurn` from `../player-turn.reducer`.
- No `@/lib/actions` import left: met. `grep -rn "lib/actions" src` (excluding the stale `src/docs/README.md`) finds only comments (`game-rules.reducer.ts:31`, `player-exit.service.test.ts:201`, both historical references). The five call sites (`use-game-engine.ts:9`, three `game-board.*.hook.ts`, `bot-logic.ts:4`) and the three characterization test files now point to `@/modules/game-rules`.
- Behavior unchanged: met. I compared each moved function against `git show HEAD:src/lib/actions/{card,player,resource,index}.ts` with a whitespace/quote/paren-normalized token diff and read the flagged hunks. The only deltas are the ones the plan allows or that are behavior-neutral: `'Reinforce'` etc. literals to `CardName.*` (values verified in `src/lib/types/cards.ts`), `'playing'` to `GameStatus.Playing` (`'playing'`), `'resource'` to `IslandType.Resource` (`'resource'`), magic numbers named (`5`, `4`, `2`, `2000`) with identical values, `let` to `const` where never reassigned, `payload.cardName` destructured in `handleCancelAction` (guarded by `payload?.cardName`). Log strings and error messages are identical. `handleGameAction` (`game-rules.reducer.ts:36-141`) has the same 22 cases, same `cloneDeep`, same catch returning the pre-clone `gameState`, and each `unknown` cast matches the handler's declared payload.
- Tests ported, none dropped: met. All 9 `cards.test.ts` cases and all 11 `player-actions.test.ts` cases map to a new test (Wealthy, Sabotage, Steal, Extra Move, Productive x2 in `card-*.reducer.test.ts`; Deploy, Upgrade, Cancel in `player-actions.reducer.test.ts`; Buy Card in `card-acquisition`; Positioning in `resource-position`; End Turn in `player-turn`; Teleport in `movement.reducer.test.ts:95`). Three `handleEndTurn` cases removed from `turn-progression.test.ts` have homes in `player-turn.reducer.test.ts`. New coverage exists for `handlePlayerExit` (18 tests), `handleGameAction` (9 tests), `handleBuyAbility`, `handleRollOnSpecialIsland` and the five `resource-position` throw paths. No `skip`/`only` anywhere in the module.
- Known turn-skip bug: confirmed pre-existing and pinned. `player-exit.service.ts:86-87` sets `currentPlayerIndex = playerIndex % players.length` then calls `handleEndTurn`, which advances again. The two tests at `player-exit.service.test.ts:195-235` assert the exact (buggy) outcome with a `KNOWN BUG` comment saying to update them on fix. Not a blocker for this task.
- `.reducer.ts` row in `component-architecture/SKILL.md:39`: met (Phase 1).
- `docs/README.md` updated: met. `docs/README.md:33` (game-rules bullet), `:69` (`__tests__/` list trimmed), the removed `actions/` bullet, `:141` (`@/modules/game-rules`), `:428` (`handlePlayerExit` new path).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `.claude/skills/component-architecture/SKILL.md:69` | Tells builders to import "`src/lib/actions` reducers"; the directory no longer exists. This skill is loaded by every builder, so it is the highest-impact stale reference. Replace with `@/modules/game-rules` reducers. | coordinator / implementer-b | No, but fix in this phase |
| 2 | `.claude/skills/anti-hallucination/SKILL.md:18`, `.claude/skills/kiss-dry-solid/SKILL.md:15` | Point agents at `src/lib/actions/` as the place to verify rules and to search before writing. Repoint to `src/modules/game-rules/`. | coordinator / implementer-b | No, fix in this phase |
| 3 | `.claude/skills/game-design/SKILL.md:19-26` | Eight rule rows cite `src/lib/actions/{player,card,attack}.ts` as the source of truth. Map each: Upgrade/Max armies/Max power to `player-actions.reducer.ts`, Passive ability/Buy card to `card-acquisition.reducer.ts`, dice/ties/rewards to `combat-*.reducer.ts` (`dice.ts` for dice). Verify each target before writing. | coordinator / implementer-b | No, fix in this phase |
| 4 | `.claude/skills/triage/SKILL.md:22`, `.claude/agents/game-designer-a.md:20`, `CLAUDE.md:19` | Same stale path (risk row, designer grounding step, stack line "pure reducers in `src/lib/actions`"). One-line repoints to `src/modules/game-rules`. `CLAUDE.md` needs the user's own edit or explicit approval. | coordinator (CLAUDE.md: user) | No, fix in this phase; flag CLAUDE.md to the user |
| 5 | `docs/ai/refactor.md:30` | Row #1 still says `in-progress` and lists the deleted files. Set to `done` in the Phase 2 commit (the legend defines `done` as committed and docs updated). | coordinator | No, at commit time |
| 6 | `src/docs/README.md:135,417` | Stale, already-diverged copy of `docs/README.md` (different rules preamble, missing sections). Not authoritative; do not hand-patch. Delete or reconcile in a separate cleanup task. | user decision | No, not this phase |
| 7 | `firestore.rules:39`, `scripts/balance-simulator/{rng,combat-odds,log-parsers,engine}.ts` comments, `docs/balance-simulator-guide.md:81,90`, `docs/gameplay-ideas.md` | Comments and planning prose cite old paths and old line numbers (`index.ts:94`, `player.ts:272`). Harmless at runtime. Leave for a docs sweep; `gameplay-ideas.md` files-likely-touched entries should be rewritten when each idea is planned. | coordinator, later | No |
| 8 | `src/modules/game-rules/player-turn.reducer.ts` `handleEndTurn` (~95 lines) and `game-rules.reducer.ts` `handleGameAction` (~105 lines) | Exceed the ~40-line function guideline. Both are verbatim legacy bodies; the dispatcher is a flat switch. Splitting `handleEndTurn` (rotation, passive abilities, win check) is worthwhile but belongs to a behavior-preserving follow-up, not this move. | implementer-a, later | No |
| 9 | Working tree | Contains the concurrent task's files: `src/features/game/components/GameDialogManager.tsx`, `src/testbed/registry.ts`, `src/modules/combat/`, `CombatDialog.characterization.test.tsx`, `docs/ai/tasks/2026-10-03-migrate-dialog-components/`, `graphify-out/`. The Phase 2 commit must stage only this task's files. | coordinator | No, but required at commit |
| 10 | `docs/ai/lessons-learned.md` (new entry, last line) | Accurate on the mechanics (verified: 3 players, seat 1 leaves on its turn, `currentPlayerIndex` becomes P3, `handleEndTurn` advances to Host). One wording issue: it calls the test "ported", but `handlePlayerExit` had no legacy test, so it was a newly written test. Say "a new characterization test". It also sits under "State with two sources", which does not fit; add a short `## Test assertions` section instead. | tester-b | No |

## Lessons learned
- tester-b's entry: keep, with the two small fixes in finding 10.
- One more qualifies and I am not appending it myself (this phase has no non-obvious bug, but the process gap is general): the plan's call-site inventory covered code imports and `docs/README.md` but missed 8+ skill, agent, script and doc files that cite the old directory (findings 1-7). Suggested entry under a new `## Refactors` section: "**A directory-move plan inventoried imports and the main README but not skills, agent prompts, scripts or comments that cite the old path, which left agent-facing instructions pointing at a deleted folder** -> Before approving a move or delete plan, run `grep -rn "<old/path>"` over the whole repo (excluding `node_modules` and task records) and list every hit in the File plan as fix or leave. (source: docs/ai/tasks/2026-10-03-game-rules-actions-migration, 2026-10-03)". The coordinator or tester-b should add it.

## Docs
- `docs/README.md`: updated, verified above. Stale agent-facing references are listed in findings 1-4 and should be fixed before the commit (findings 1-3 are one-line edits each; 4 except `CLAUDE.md`).


---

# Phase 1 (retroactive)

Final review of commit `614458b` (attack + movement to `src/modules/game-rules`), done after Phase 2 was committed.

VERDICT: APPROVED

Approval carve-out: e2e not run (no Java 21). The two `CombatDialog.test.tsx` errors the coordinator mentioned no longer reproduce at the current working tree (see Checks); they belonged to the concurrent `migrate-dialog-components` task either way.

## Checks run (current working tree, which includes Phase 2)
- `npm run typecheck`: exit clean, `npx tsc --noEmit | grep -c "error TS"` returns `0`.
- `npx eslint src`: no output, zero findings. Plain `npm run lint` reports `153 problems (146 errors, 7 warnings)`, but every file listed is under `.claude/worktrees/angry-burnell-93c06f/` (a stale worktree copy the lint glob picks up), none in `src/`.
- `npm test -- --testPathIgnorePatterns=worktrees,e2e/,firestore.rules,test-utils`: `Test Suites: 60 passed, 60 total` / `Tests: 573 passed, 573 total`. Plain `npm test` also scans `.claude/worktrees/` and reports `11 failed` suites, all worktree duplicates (same cause). At 614458b itself `progress.md` recorded 466/466.
- e2e: not run (no Java 21).

## Plan adherence (Phase 1)
- File plan: met. New in `src/modules/game-rules/`: `dice.ts`, `combat-{initiate,player-roll,player-resolve,monster-roll,monster-resolve}.reducer.ts`, `movement.reducer.ts`, `island-discovery.reducer.ts`, `index.ts` (6 exports) plus a test per file. `attack.ts`, `movement.ts`, `combat.test.ts`, `movement.test.ts` deleted. Largest file 114 lines (limit 150); no `any`.
- Call sites: met. `bot-logic.ts`, `turn-progression.ts`, `game-board.state.hook.ts`, the `src/lib/actions/index.ts` imports, the three characterization-test mock paths and `cards.test.ts` now point at `@/modules/game-rules`. `grep` for `lib/actions/(attack|movement)` outside task records and the stale worktree finds nothing. `CombatDialog.characterization.test.tsx` (untracked, not in this commit) has no `@/lib/actions` import left.
- `.reducer.ts` row in `component-architecture/SKILL.md`: met (line in the commit's diff).
- Behavior unchanged: met. I diffed every function against `git show 614458b^:src/lib/actions/{attack,movement}.ts` by reading each hunk. Deltas, all behavior-neutral:
  - Magic numbers named with identical values: `5` VP (`COMBAT_WIN_VICTORY_POINTS`), `+2` (`WAR_CHIEF_BONUS_POWER`), decide-dice `1`/`6`, monster VP table, `0.4`/`0.5` chances, `MOVE_RADIUS = 2`.
  - `'Teleport'` literal to `CardName.Teleport` (value `'Teleport'`, `src/lib/types/cards.ts:14`).
  - Two inline `rollDice` copies replaced by one `dice.ts` export; same formula (`Math.max(1, count)`, `floor(random*6)+1`). Order of `Math.random()` calls is unchanged, so seeded tests stay valid.
  - `handleCloseCombat`: `oldTile` extracted from the repeated `map[...]` expression; the `!` and `|| []` fallbacks are dropped but are equivalent under the `?.positionedBy` guard.
  - `handleCloseMonsterCombat`: `losingArmyTile` extracted from the repeated expression.
  - `let moves` to `const moves` with an explicit type; `revealIsland` moved verbatim to `island-discovery.reducer.ts`; relative `'../types'` to `'@/lib/types'`.
  - Log text and `Error` messages are byte-identical (the `+2 power` strings remain literal).
- Tests: met. All 4 legacy `combat.test.ts` cases and all 4 `movement.test.ts` cases have a new home (`combat-initiate`, `combat-player-roll`, `combat-monster-*`, `movement.reducer.test.ts`, `island-discovery.reducer.test.ts`), plus the Teleport case from `cards.test.ts` (`movement.reducer.test.ts:95`) and new coverage for `handleCloseCombat`, `handleCloseMonsterCombat`, `dice.ts` boundaries and movement throw paths. No `.skip`/`.only` in the module.
- `docs/README.md`: no Phase 1 change required; Phase 2 updated it.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/ai/tasks/2026-10-03-game-rules-actions-migration/progress.md:14` | `committed: <hash>` still unticked for Phase 1; the commit is `614458b`. Tick it and record the hash. Also tick the Phase 1 final-review line if the coordinator adds one. | coordinator | No |
| 2 | `combat-player-resolve.reducer.ts`, `combat-monster-resolve.reducer.ts`, `combat-monster-roll.reducer.ts` | Functions run about 60 to 90 lines, over the ~40-line guideline, and the death-animation plus respawn block is repeated four times (twice in each resolve file). Both are verbatim legacy bodies, so this is correct for a move; extracting `respawnArmyAtBase` is a behavior-preserving follow-up, same category as Phase 2 finding 8. | implementer-a, later | No |
| 3 | `614458b` scope | The commit adds `src/modules/game-rules/index.ts` with 6 exports while `src/lib/actions/index.ts` still re-imports from the module. This is the planned intermediate state and builds cleanly; noting it only so nobody reads it as a cycle. | none | No |

## Lessons learned
None new. The call-site-inventory lesson from the Phase 2 section already covers this commit's one miss (`CombatDialog.characterization.test.tsx`, which the plan caught in review).
