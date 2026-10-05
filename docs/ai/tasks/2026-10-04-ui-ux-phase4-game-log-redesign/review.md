# Final review: Game log readability redesign, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (tsc --noEmit exits 0).
- `npm run lint`: clean, no output (eslint . --max-warnings 0).
- `npm test`: `Test Suites: 2 failed, 178 passed, 180 total` / `Tests: 1898 passed, 1898 total`. The 2 failed suites are `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and `.agents/skills/caveman-learn/tests/skill-file.test.mjs` ("must contain at least one test" — empty `node:test` files), pre-existing, last touched in commit `374721a` (unrelated `chore(skills)` commit), not touched by this phase's diff. Zero actual test failures.
- Scoped: `npx jest src/modules/game-rules src/modules/hud/components/GameLog` → `Test Suites: 27 passed, 27 total`, `Tests: 268 passed, 268 total`.
- ui-verify: not run — plan.md states no new visual states this phase (zero-visible-change data migration); confirmed by diff (no edit to `GameLog.preview.tsx`, `GameLog.fixtures.ts`, `GameLog.hook.ts`, `GameLog.styles.ts`).

## Plan adherence
This phase has no user-facing acceptance criteria of its own (those are Phase 2's); checked instead against the File plan, Contracts and Decisions in plan.md:
- `src/lib/types/game.ts`: `LogCategory`/`StructuredLogEntry`/`LogEntry` added verbatim per Contracts; `GameState.log: string[]` → `LogEntry[]`. Matches `plan.md:112-129`.
- `src/modules/game-rules/log-entry.ts` (new): `pushLogEntry`/`toLogMessage` match the Contracts signatures exactly (`plan.md:132-139`). `log-entry.test.ts` (new) covers stamping, turn-0 boundary, full field passthrough, omitted-optionals, non-mutation of earlier entries, both `toLogMessage` branches, empty string.
- All 61 original `log.push` call sites migrated: `grep -rn "\.log\.push" src --include="*.ts" --include="*.tsx"` (excluding `log-entry.ts` itself and its test's `state.log.push('legacy entry')` fixture setup) returns zero hits — no leftover raw string push anywhere.
- Addendum site `src/modules/game-rules/services/player-exit.service.ts:42` (not in the original File plan, found during build) migrated to `pushLogEntry` with `category: 'system'`, consistent with the taxonomy; its test `player-exit.service.test.ts` updated accordingly. Reasonable addendum, though plan.md/progress.md don't record it — not blocking (see Findings, non-blocking note).
- Spot-checked category/playerId/targetPlayerId/isPassive/isMilestone assignment against the Contracts table for every row sampled: `combat-player-resolve.reducer.ts` (winner/loser, milestone), `combat-monster-resolve.reducer.ts` (attacker, milestone), `player-turn.reducer.ts` (all 6 sites: economy/turn categories, 4 isPassive, 1 milestone), `game-setup.reducer.ts` (split into 2 pushes per copy fix #3), `player-join.reducer.ts` (system/turn, isPassive on turn-transition), `card-targeted-effects.reducer.ts` (targetPlayerId on sabotage/steal), `island-discovery.reducer.ts` (economy, milestone). All match the table exactly.
- Copy fixes #1, #3, #4, #5 applied verbatim as specified. Fix #2 (`card-acquisition.reducer.ts:21`, "deck ran out; reshuffled...") applied at the one site the plan named; a second, pre-existing duplicate of the old wording ("The deck is empty. Reshuffling the discard pile...") remains at `card-acquisition.reducer.ts` inside `handleRollOnSpecialIsland` and at `island-discovery.reducer.ts` — both outside fix #2's scope as written (plan/ui-design.md cite only the one line), so this is a plan gap, not an implementation deviation. Fix #6 (`card-targeted-effects.reducer.ts` steal message) correctly kept as-is, exclamation retained.
- `game-setup.reducer.ts`: a legacy edit also moved `defaultGameSettings` out into `./game-settings.ts` (new, untracked `src/modules/game-rules/game-settings.ts`) and re-exports it — not in this phase's File plan. This looks like it belongs to the 150-line-limit mitigation flagged in Decisions (`game-setup.reducer.ts` was 152 lines before this change, now has 2 pushes instead of 1 added to it). Confirmed by `git diff` that `game-setup.reducer.ts` no longer defines `defaultGameSettings` inline. This is an unplanned file (`game-settings.ts` is untracked, not in File plan) — flagged below, non-blocking since it's the exact mitigation plan.md pre-authorized ("split by responsibility ... rather than cramming") but should have been named in the File plan/progress log.
- `GameLog.types.ts`/`GameLog.map.ts`/`GameLog.tsx`: minimal edits, exactly matching Contracts/File plan — `entries: LogEntry[]`, `toGameLogEntries(logs: LogEntry[]): LogEntry[]` (same reverse), `typeof entry === 'string' ? entry : entry.message`. Zero visual change confirmed structurally (no className/markup edits, only the one ternary line).
- `GameLog.hook.ts`: no diff — confirmed it already compiles against `LogEntry[]` with no change needed, as plan.md anticipated ("confirm pass-through still compiles").
- 12 reducer test files + `player-exit.service.test.ts`: all `.log` assertions migrated via `toLogMessage`, comparing exact strings (not ranges), using values captured before mutation where applicable. Spot-checked `combat-player-resolve.reducer.test.ts`, `card-acquisition.reducer.test.ts` — assertions use `toLogMessage(entry)` consistently, no leftover raw `entry.includes(...)` on a structured entry.
- `GameLog.map.test.ts`/`GameLog.hook.test.ts`/`GameLog.test.tsx`: new cases confirm object identity is preserved through `toGameLogEntries`/`useGameLog` (`toBe`, not just `toEqual`), and that a structured entry renders its `.message` text, not `[object Object]`, alongside an unchanged legacy string. Matches Test plan.
- `docs/README.md`: not updated — correct, no game rule or architecture behavior changed (pure internal data-shape migration, display output identical).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/ai/tasks/2026-10-04-ui-ux-phase4-game-log-redesign/progress.md` | The `player-exit.service.ts` addendum call site and the `game-settings.ts` extraction aren't recorded anywhere in `plan.md` or `progress.md`'s Log section, even though both are reasonable, in-scope changes (addendum found during build; pre-authorized line-count mitigation). | implementer-a / coordinator | No — both changes are correct and necessary; only the record-keeping is missing. Note in progress.md's Log before closing the phase. |

## Docs
- `docs/README.md`: not needed — no game rule or architecture behavior changed.
