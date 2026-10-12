# Final review: Host never sees the bot playing a departed guest's seat, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (exit 0).
- `npx eslint src/modules/game-rules/services/player-exit.service.ts src/modules/game-rules/services/player-exit.service.test.ts`: clean, exit 0.
- `npx jest --testPathIgnorePatterns='<rootDir>/node_modules/' --testPathIgnorePatterns='<rootDir>/\.claude/worktrees/' -- 'src/modules/game-rules/' 'src/modules/game-board/'`: `Test Suites: 45 passed, 45 total`, `Tests: 536 passed, 536 total`. (A plain `npm test` picks up unrelated concurrent agents' worktrees under `.claude/worktrees/*`, which are mid-edit and fail for reasons unrelated to this diff — e.g. a SIGSEGV'd jest worker and missing playwright deps in another agent's checkout; excluded, not part of this review.)
- `JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`: fails at `e2e/reconnect-bot-takeover.spec.ts:104` (`guestPage.getByText('Your Turn')` after reclaim and host end-turn — the Phase 2 bug). The assertion this phase targets, line 93 (`hostPage.getByText(\`${guestName}'s Turn\`)`) and line 94 (`'Your Turn'` once the bot ends it), both passed — the run gets past them before failing later. Matches `progress.md`'s log entry for this phase.
- ui-verify: not applicable — no view/`.tsx` file changed.

## Plan adherence
- Acceptance criterion 1 ("host's client shows `\"<guest name>'s Turn\"` ... then `\"Your Turn\"`"): met, confirmed by the e2e run reaching past line 94 before failing on the separate Phase 2 assertion.
- Acceptance criterion 2 (full e2e spec passes): not yet met — by design, deferred to Phase 2 per `progress.md`.
- Acceptance criterion 3 (no regression to the staleness-triggered conversion path): met — the fix is inside the shared `convertSeatToBot`, called by both `handlePlayerExit` paths; `game-board.staleness.hook.test.ts` is unmodified by this diff and not in the touched-files list.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

None. The diff matches the plan's Contracts block exactly (`git diff src/modules/game-rules/services/player-exit.service.ts`): the `if (state.currentPlayerIndex === playerIndex) { handleEndTurn(state); }` block is removed and the docstring corrected, nothing else in the function changed. `handleEndTurn` import (`player-exit.service.ts:4`) stays used later in the file (`:134`, lobby-exit path) — not dead. Rewritten tests in `player-exit.service.test.ts` cover exactly the two cases the plan specified (3-player middle-seat, 2-player, last-seat-no-wrap) plus the new 2-player case from the Test plan, each asserting `currentPlayerIndex` unchanged, seat flags, `turn` unchanged, and no premature "It's now ...'s turn." log entry — matches the Test plan at `plan.md:107-110`.

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md:86` — replaced "...and if it was that seat's turn, `handleEndTurn` runs" with a sentence describing the bot-turn effect driving the seat and calling `handleEndTurn` when it finishes, consistent with §6.14's existing description. Matches the File plan at `plan.md:39`.
