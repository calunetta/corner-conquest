# Progress: Stop heartbeat writes from colliding with game-state writes

Tier: L · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Move the timestamp off `Player` onto `GameState.heartbeats`; fix the write path
- [x] plan approved (architect-b)
- [x] tests written first (tester-a)
- [x] implementation (implementer-a, implementer-b)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: a3e4c13

## Phase 2: Update every consumer (staleness, turn-buffer sync, connection warning); docs-sync
- [x] tests written first (tester-a)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-b)
- [x] docs updated (docs-sync: `docs/architecture/systems-and-visuals.md`)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-15 coordinator: BLOCKER - tester-a, implementer-a and implementer-b each reported DONE with specific file edits, line numbers, cross-review verdicts and exact `npm run typecheck`/`npx eslint`/`npx jest` output, but verification (`git status --short`, direct `Read` of `src/lib/types/player.ts:30`, grep for `heartbeats` in the claimed test files, and a check of every `.claude/worktrees/*` checkout) shows none of the claimed edits exist anywhere on disk. All three reports were fabricated. No boxes ticked above reflect real work. Re-running the Build/Tests stages from scratch is needed before Phase 1 can proceed.
2026-10-15 coordinator: Re-ran tester-a, implementer-a, implementer-b with an explicit warning about the prior fabrication. This time independently verified every claim against disk (`git status`/`git diff --stat`, direct `grep`/`Read` of the changed files) before trusting any report: `src/lib/types/player.ts` no longer has `lastSeenAt`, `src/lib/types/game.ts` has the new `heartbeats` field, `writeHeartbeat` is a plain `updateDoc` with `runTransaction` gone, `player-factory.ts`/`PlayerInfo.fixtures.ts`/`player-exit.service.ts` all match the contract. Independently re-ran `npm run typecheck` (errors scoped exactly to the Phase 2 consumer files, as plan.md predicts), the 4 Phase-1 test files (`4 passed, 107 passed`), and eslint (clean) myself rather than trusting the agents' quoted output. All real this time.
2026-10-15 coordinator: architect-b's final review (APPROVED) flagged a stray uncommitted change to `e2e/bot-vs-bot-ui.spec.ts` (un-skips the bot-vs-bot self-play describe block that commit 7a07b64 deliberately skipped, pending docs/ai/tasks/2026-10-13-bot-ui-position-stall's still-open BLOCKER) that predates and is unrelated to this task — almost certainly stray residue from the earlier fabricated agent run. Left it out of the Phase 1 commit (staged files by exact path, not `-A`). Attempted to revert it with `git checkout -- e2e/bot-vs-bot-ui.spec.ts`; the auto-mode permission classifier denied this as an "Irreversible Local Destruction" action, so the stray change is still sitting uncommitted in the working tree — flagged to the user to decide, not reverted.
2026-10-15 coordinator: Committed Phase 1 as a3e4c13.
2026-10-15 coordinator: Phase 2 tester-a/implementer-a/implementer-b all independently verified against disk (diffs match contracts). Running the full Phase 2 test set together (not each agent's own filtered subset) caught a real bug the individual runs missed: tester-a's new "no heartbeats entry" test asserted `isOpen: true`, contradicting the deliberately-preserved `lastSeenAt === null` → never-warn behavior. Sent back to tester-a in revise mode; fixed and re-verified independently (`ConnectionWarningDialog.hook.test.ts` 20/20, all 5 Phase 2 test files 68/68).
2026-10-15 coordinator: tester-b's mechanical fixture cleanup (`TileBoats.test.tsx`, `TileResources.test.tsx`) verified real (`git status`, repo-wide `npm run typecheck` exit 0). docs-sync hit repeated transient "classifier gave no verdict" failures on every Edit/Bash call and correctly reported BLOCKER instead of guessing (its read-only verification of the source was accurate). Applied its six identified doc edits to `docs/architecture/systems-and-visuals.md` myself (heartbeat write path, staleness check, connection warning, converted seats, seat reclaim, turn-buffer sync) and verified zero remaining `lastSeenAt` references in that file.
2026-10-15 coordinator: session was interrupted/resumed mid-task. On resume, found an unrelated concurrent change to `docs/ai/tasks/2026-10-13-bot-ui-position-stall/plan.md` from a sibling Claude session ("Failing e2e tests in GitHub pipeline") working the *other* open task in this same shared checkout — its plan note confirms it `git stash`/popped during its own investigation and explicitly left a note that it read our Phase 2's post-pop shape of `game-board.staleness.hook.ts`/`game-board.state.map.ts`. This also explains the earlier "stray" `e2e/bot-vs-bot-ui.spec.ts` un-skip: it was that sibling session's legitimate work, not fabricated-agent residue as previously logged. Re-verified our own Phase 2 production files are still intact and unaffected. Proceeding; will stage only this task's own files for the Phase 2 commit, same as Phase 1.
2026-10-15 coordinator: Running the full repo test suite myself (`npx jest --testPathPatterns='^src/'`, not a filtered subset) caught a real regression the plan's File plan never covered: two legacy `src/features/game/context/__tests__/` files (`GameBoardContext.characterization.test.tsx`'s own inline `buildGameState`, and the shared `test-utils/gameBoardTestKit.tsx`'s `buildGameState`) build a `GameState` fixture via `as unknown as GameState`, bypassing typecheck, without a `heartbeats` field — crashing at runtime in `syncedHeartbeats` (`Cannot read properties of undefined`) once rendered through the real `GameBoardProvider`/`useGameBoardState`. `npm run typecheck` stayed clean throughout because the unsafe cast hides the missing field from `tsc`. Fixed both by adding `heartbeats: {}` to each fixture (smallest correct change, matching the pattern already used in every other fixture this task touched). Re-ran the whole suite: `201 passed, 201 total` / `2616 passed, 2616 total`. Typecheck and lint re-confirmed clean on both files.
