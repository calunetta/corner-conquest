# Final review: Stop heartbeat writes from colliding with game-state writes, phase 2/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: exit 0, no output (clean)
- `npm run lint` (scoped to every file touched this phase, run directly since no changed-files helper script exists): 0 errors on all production/test files; 2 expected "File ignored because of a matching ignore pattern" warnings on the two legacy `src/features/game/context/__tests__/*` files (pre-existing ignore rule, not new)
- `npm test` (`npx jest --testPathPatterns='^src/'`, full repo): `Test Suites: 201 passed, 201 total` / `Tests: 2616 passed, 2616 total`
- ui-verify: not applicable — plan's "Preview states: None", no `.tsx`/`.styles.ts` file touched this task; confirmed by `git diff --stat` showing no view files

## Plan adherence
- `writeHeartbeat` no longer uses `runTransaction`: confirmed in Phase 1 commit a3e4c13 (not re-diffed here, already final-reviewed and committed).
- `lastSeenAt` removed from `Player`, `GameState.heartbeats` added: confirmed (Phase 1, committed).
- Every consumer updated this phase:
  - `game-board.staleness.hook.ts:16-24` — `findStalePeerIds(gameState, ...)` now reads `gameState.heartbeats[player.id]`, matches plan's contract exactly.
  - `game-board.state.map.ts:1-66` — `withSyncedSeatManagement` drops `lastSeenAt` from the 3 synced seat fields, adds `syncedHeartbeats` with the same local-seat non-clobber rule as the other fields. Matches plan's contract verbatim.
  - `ConnectionWarningDialog.hook.ts:50` — `serverGameState.heartbeats[livePlayer.id] ?? null` replaces `livePlayer.lastSeenAt`; `toConnectionWarningViewModel`'s signature untouched as planned.
- Tests: `ConnectionWarningDialog.hook.test.ts` rewritten to drive `serverGameState.heartbeats` via `mockUseGameBoard`'s new `serverHeartbeat` param; the "no heartbeats entry" case (line 279) correctly asserts `isOpen: false` after the tester-a revise-mode fix (verified in diff: `expect(result.current.isOpen).toBe(false);`), consistent with the preserved `lastSeenAt === null`-never-warns behavior. `game-board.staleness.hook.test.ts`, `game-board.state.map.test.ts`, `game-board.state.hook.test.ts`, `game-board.session.hook.test.ts`, `TileBoats.test.tsx`, `TileResources.test.tsx` all pass in the full run.
- `docs/architecture/systems-and-visuals.md` §6.10 and §6.14: re-read in full, zero `lastSeenAt` references remain (`grep -n lastSeenAt` on this file returns nothing), content accurately describes the single-field-path `updateDoc`, `gameState.heartbeats[seat.id]` staleness check, `heartbeats` deletion on conversion, and the `syncedHeartbeats` read-side sync — matches the actual code.
- Grep coverage re-verified: every remaining `lastSeenAt` hit in `src/` (`src/lib/types/game.ts:71` doc comment, `ConnectionWarningDialog.map.ts`/`.map.test.ts`/`.types.ts`, `ConnectionWarningDialog.hook.test.ts:279`'s description string) matches plan's "left unchanged, verified accurate" list exactly — no missed hit, no invented path.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | none | — | — | — |

## Docs
- `docs-sync`: updated `docs/architecture/systems-and-visuals.md` §6.10 (turn-buffer sync bullet) and §6.14 (heartbeat write, staleness check, connection warning, converted seats, seat reclaim bullets) via the coordinator applying docs-sync's identified edits after docs-sync itself hit transient tool-classifier failures. Content independently re-verified against code in this review, accurate.

## Independently reproduced beyond the coordinator's log
- Re-ran `npm run typecheck` (exit 0) and `npx jest --testPathPatterns='^src/'` myself: `201 passed, 201 total` suites, `2616 passed, 2616 total` tests — matches the coordinator's reported numbers exactly.
- Re-ran eslint directly on all 13 files changed this phase (incl. the two legacy `__tests__` files with `heartbeats: {}` added) — 0 errors.
- Read the actual diffs for `ConnectionWarningDialog.hook.test.ts`, `game-board.staleness.hook.ts`, `game-board.state.map.ts`, `ConnectionWarningDialog.hook.ts`, `docs/architecture/systems-and-visuals.md`, `docs/ai/lessons-learned.md` — all match plan.md's contracts and the coordinator's described fixes.
- Confirmed the `heartbeats: {}` fix landed in both `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx:76` and `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx:81`.
- Confirmed the lessons-learned entry (`docs/ai/lessons-learned.md`, new bullet after the narrowed-cast entry) accurately names the cause (unsafe `as unknown as GameState` cast hiding a missing required field from `tsc`) and the generalizable rule (grep every `as unknown as <Type>` site for the new field, not just the old field name being replaced, and run a full test pass through the real component tree).
- Confirmed the two unrelated modified files noted in progress.md's log (`docs/ai/tasks/2026-10-13-bot-ui-position-stall/plan.md`, `e2e/bot-vs-bot-ui.spec.ts`) are outside this task's File plan and were correctly left out of scope; no action needed from this review.
