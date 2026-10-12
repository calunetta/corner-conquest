# Plan: Host never sees the bot playing a departed guest's seat

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] After a guest leaves mid-match during their own turn, the host's client shows `"<guest name>'s Turn"` while the bot plays that seat's remaining turn, then shows `"Your Turn"` once the bot ends it.
- [ ] `e2e/reconnect-bot-takeover.spec.ts` passes against the Firestore emulator (`npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`).
- [ ] No regression to the staleness-triggered conversion path (same service, same code path).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `convertSeatToBot` | `src/modules/game-rules/services/player-exit.service.ts:11-25` | Converts a seat to a bot; today it also force-ends the seat's turn when that seat was the current player (lines 22-24). This is the bug. Its docstring at line 9 ("Ends the seat's turn if it was theirs.") also describes this and must be corrected in the same edit. |
| `handlePlayerExit` | `src/modules/game-rules/services/player-exit.service.ts:36` | Calls `convertSeatToBot` inside a `runTransaction` whenever `status === Playing`; used by both an explicit exit (`game-board.session.hook.ts:35`) and the staleness check (`game-board.staleness.hook.ts:25`). |
| `handleEndTurn` | `src/modules/game-rules/player-turn.reducer.ts:44` | Advances `currentPlayerIndex` to the next seat (skips `isBot` seats are NOT skipped — only `isSabotaged` seats are) and appends an `"It's now <name>'s turn."` log entry at `player-turn.reducer.ts:112`. Called both by `convertSeatToBot` (the bug) and later by `decideBotTurn` when the bot actually finishes its turn. |
| `decideBotTurn` | `src/modules/game-rules/bot-turn.reducer.ts:14-27` | Clones state, runs bot card/purchase/army logic, then calls `handleGameAction({ action: EndTurn })` itself (line 21) — the turn-ending step already happens here once the bot has acted. |
| `takeBotTurn` | `src/modules/game-rules/services/bot-turn.service.ts:10-15` | Returns early unless `players[currentPlayerIndex]` is a bot in a `playing` match. Only fires when `currentPlayerIndex` actually points at the bot seat. |
| session-driver bot-turn effect | `src/modules/game-board/game-board.engine.hook.ts:155-163` | `useEffect` that calls `takeBotTurn(gameState)` after a 1s delay, gated on `gameState.players[gameState.currentPlayerIndex]?.isBot`. Never fires for the converted seat today because `currentPlayerIndex` has already moved past it by the time any client observes the write. |
| `isMyTurn` | `src/modules/game-board/game-board.engine.hook.ts:85-91` | `currentPlayer.id === localPlayer.id && !currentPlayer.isBot`. |
| `toGameStatusBadgeViewModel` | `src/modules/hud/components/GameStatusBadge/GameStatusBadge.map.ts:13` | `turnLabel = isMyTurn ? 'Your Turn' : `${players[currentPlayerIndex]?.name}'s Turn`` — this is the text the e2e spec asserts on (`e2e/reconnect-bot-takeover.spec.ts:93`). Not edited by this plan; cited only to show the fix is sufficient to make it render correctly once `currentPlayerIndex` rests on the converted seat. |
| existing unit tests encoding the bug | `src/modules/game-rules/services/player-exit.service.test.ts:191-220` | Two tests assert that converting the current player's seat immediately advances `currentPlayerIndex` past it. These assert the behavior being removed and must be rewritten (see Test plan). |
| docs describing the bug as intended behavior | `docs/architecture/systems-and-visuals.md:86` | "...and if it was that seat's turn, `handleEndTurn` runs." Contradicts `docs/architecture/systems-and-visuals.md:49`, which already correctly describes the fixed behavior ("...the session driver's bot-turn effect...drives it from then on"). Line 86 must be corrected (docs-sync). |

## Root cause (bugs only)
- Reproduction: `JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts` — fails at `e2e/reconnect-bot-takeover.spec.ts:93`, 15s timeout waiting for `hostPage.getByText(`${guestName}'s Turn`)`.
- Cause: `convertSeatToBot` (`src/modules/game-rules/services/player-exit.service.ts:11-25`) calls `handleEndTurn(state)` whenever the exiting seat was the current player (lines 22-24), in the same transaction that flips the seat to `isBot: true`. `handleEndTurn` immediately advances `currentPlayerIndex` to the *next* seat (`player-turn.reducer.ts:54-55`) — it does not stop on the just-converted bot seat; only `isSabotaged` seats are skipped, not bot seats. So by the time any client's Firestore snapshot updates, `currentPlayerIndex` already points past the bot seat to the next human (the host in a 2-player match). The session-driver bot-turn effect (`game-board.engine.hook.ts:155-163`) only fires `takeBotTurn` when `currentPlayerIndex` points at a bot seat — which never happens here, because the write that created the bot seat already moved the turn off it in the same transaction. The bot's seat is skipped entirely: it never gets a turn, and the host's `GameStatusBadge` (`GameStatusBadge.map.ts:13`) never renders `"<guest name>'s Turn"` because `currentPlayerIndex` never points at that seat while `isBot` is true.

## Decisions
- Remove the `if (state.currentPlayerIndex === playerIndex) { handleEndTurn(state); }` block from `convertSeatToBot` (and correct its now-wrong docstring line, "Ends the seat's turn if it was theirs."), leaving `currentPlayerIndex` unchanged on conversion. The seat becomes a bot in place; if it was the current player's turn, that bot seat is now what the session driver's existing bot-turn effect (`game-board.engine.hook.ts:155-163`) detects and drives via `takeBotTurn` → `decideBotTurn`, which already ends the turn itself (`bot-turn.reducer.ts:21`) once it has acted. This is the smallest change: no new state field, no new effect, reuses the bot-turn machinery that already exists for setup-time bots. Rejected: adding a new "pending bot turn" flag or a dedicated effect (unnecessary — the existing `isBot`-gated effect already covers this once `currentPlayerIndex` is left alone).
- Rejected: skipping the bot seat's turn immediately (keep today's `handleEndTurn` call) and only fixing the UI label — that keeps the game and the spec's expected behavior (host sees the bot visibly take a turn) out of sync; the spec is the recorded intended behavior, not a selector bug (per triage.md, already confirmed live).
- Rejected: guarding the session-driver effect to also "look back" one seat for a just-converted bot — more complex than leaving `currentPlayerIndex` untouched, and would require detecting "just converted" as new state.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-rules/services/player-exit.service.ts` | edit | Remove the premature `handleEndTurn` call from `convertSeatToBot` (lines 22-24) and fix its docstring (line 9); keep everything else (log entry, `isBot`/`isVacant`/`lastSeenAt` flips) unchanged. | implementer-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | edit | Rewrite the two tests that assert the old behavior (`:191-205`, `:207-220`) to assert the fixed behavior; add one new test for the exact bug scenario (2-player match, current player's seat converts, stays current, is now a bot). No other test in this file changes (verified: all others leave `currentPlayerIndex` unmoved — the exiting seat was never the current player in them). | tester-a |
| `docs/architecture/systems-and-visuals.md` | edit | §6.12 line 86: remove "...and if it was that seat's turn, `handleEndTurn` runs", replace with a sentence matching §6.14's already-correct description (the seat keeps the turn as a bot; the session driver's bot-turn effect drives it from there). | docs-sync |

No `.tsx`, `.styles.ts` or other view file changes: this is a pure logic fix in `game-rules`. implementer-b has no files on this task — note this explicitly to the coordinator rather than inventing wiring work.

## Contracts
No type, prop or signature changes. `handlePlayerExit(gameId: string, playerId: string): Promise<void>` (unchanged signature, `player-exit.service.ts:36`). `convertSeatToBot(state: GameState, playerIndex: number): void` (unchanged signature; only its body loses the `handleEndTurn` branch):

```ts
// src/modules/game-rules/services/player-exit.service.ts
// Before (current, buggy):
/**
 * Hands a seat in an in-progress match to a bot instead of removing it, so seat indices and
 * every reference to them stay valid. Ends the seat's turn if it was theirs.
 */
function convertSeatToBot(state: GameState, playerIndex: number): void {
  const seat = state.players[playerIndex];
  pushLogEntry(state, {
    category: 'system',
    message: `${seat.name} has left the game. A bot is taking over their seat.`,
    playerId: seat.playerId,
  });
  seat.isBot = true;
  seat.isVacant = true;
  seat.lastSeenAt = null;

  if (state.currentPlayerIndex === playerIndex) {
    handleEndTurn(state);
  }
}

// After (fix): delete the trailing `if` block and correct the docstring. The seat becomes a
// bot in place; currentPlayerIndex is left untouched whether or not it was that seat's turn —
// if it was, the session driver's existing bot-turn effect now picks it up and plays it out.
/**
 * Hands a seat in an in-progress match to a bot instead of removing it, so seat indices and
 * every reference to them stay valid. Does not end the seat's turn: if it was that seat's turn,
 * it stays the current player as a bot, and the session driver's bot-turn effect
 * (`game-board.engine.hook.ts`) plays it out and ends it from there.
 */
function convertSeatToBot(state: GameState, playerIndex: number): void {
  const seat = state.players[playerIndex];
  pushLogEntry(state, {
    category: 'system',
    message: `${seat.name} has left the game. A bot is taking over their seat.`,
    playerId: seat.playerId,
  });
  seat.isBot = true;
  seat.isVacant = true;
  seat.lastSeenAt = null;
}
```

`handleEndTurn` stays imported in `player-exit.service.ts` — it is still used later in the same file for the pre-game (lobby) exit path (`player-exit.service.ts:136`). Do not remove the import.

## Phases
### Phase 1: Root-cause and fix
1. tester-a: confirm the live repro still fails as described (`JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`), then write the failing unit test first in `player-exit.service.test.ts` — a new case: 2-player started game, `currentPlayerIndex = 1` (guest's turn), guest exits; assert `written.currentPlayerIndex` stays `1`, `written.players[1].isBot` is `true`, `written.turn` is unchanged, and the log has no `"It's now ...'s turn."` entry yet. Run it and confirm it fails against today's code (sonnet — this is the characterizing test for the actual root cause, get the assertions exactly right).
2. implementer-a (sonnet): apply the Contracts-block edit to `convertSeatToBot` in `player-exit.service.ts`. Nothing else in the file changes.
3. tester-a: update the two now-invalid tests at `player-exit.service.test.ts:191-205` and `:207-220`:
   - `"passes the turn to the next seat..."` → rename and rewrite to assert the seat stays current and becomes a bot (this duplicates step 1's new test loosely; keep both only if they cover different player counts, otherwise fold step 1's case into this rewrite and don't add a separate near-duplicate).
   - `"wraps the turn back to the host..."` → rewrite the same way for the last-seat wraparound case, asserting `currentPlayerIndex` stays on the last seat (now a bot) instead of wrapping to `0`.
   Re-run the full file (`npx jest src/modules/game-rules/services/player-exit.service.test.ts`) and confirm all cases pass.
4. tester-b: run the real e2e spec against the emulator (`JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`) and confirm it now passes end to end, including the later "reclaim while it's the host's turn" and "match continues" assertions at the end of the spec (unaffected by this fix, but must still pass). No new test file needed — the existing spec is the regression test for this bug.
5. docs-sync: apply the `docs/architecture/systems-and-visuals.md:86` correction from the File plan.

Model escalation: steps 1 and 3 (tester-a) per `triage.md` override; step 2 (implementer-a) per `triage.md` override.

## Test plan
- tester-a (`player-exit.service.test.ts`):
  - New/rewritten: current player's seat converts mid-turn (2-player match) → `currentPlayerIndex` unchanged, seat is now `isBot: true`, `isVacant: true`, `lastSeenAt: null`, no turn-advance log entry yet.
  - Rewritten: last-seat-is-current-player case (3-player match, last seat converts) → `currentPlayerIndex` stays on that (now-bot) seat, not wrapped to `0`; `turn` unchanged.
  - Unchanged (verify still pass, do not rewrite): all other existing cases in the file — none of them have the exiting seat as the current player, so none depend on the removed branch.
- tester-b (e2e): one real run of `e2e/reconnect-bot-takeover.spec.ts` against the Firestore emulator; no new spec file. Confirms the host sees `"<guest name>'s Turn"` then `"Your Turn"`, and that the rest of the existing spec (reclaim, continued play) still passes.

## Preview states
None — no view component changes.

## Risks
- Leaving `currentPlayerIndex` on the converted seat means the bot resumes the turn with whatever `hasActed`/`actionsThisTurn` state the human player left mid-turn, rather than a fresh turn. This matches existing bot-turn-mid-game semantics (`decideBotTurn` already runs against whatever state it's given) and is the correct behavior for "the bot finishes the turn in progress," not a fresh risk introduced here — confirmed by reading `decideBotTurn` (`bot-turn.reducer.ts:14-27`), which has no guard requiring a turn-start state.
- The staleness-check path (`game-board.staleness.hook.ts`) shares the same `convertStalePeer` → `handlePlayerExit` → `convertSeatToBot` call chain, so this fix applies there too without a separate code path to change. No separate test needed for that path beyond what already exists, since the fix is inside the shared function both paths call.

## Review (architect-b)
VERDICT: APPROVED

Verified against the actual code, not just the plan's prose:
- `convertSeatToBot` body and docstring (`src/modules/game-rules/services/player-exit.service.ts:9-25`) match the Before block in Contracts exactly.
- `handleEndTurn` (`src/modules/game-rules/player-turn.reducer.ts:44-120`) advances `currentPlayerIndex` unconditionally except for `isSabotaged` seats; confirmed no bot-seat skip exists.
- `decideBotTurn` (`src/modules/game-rules/bot-turn.reducer.ts:14-27`) ends the turn itself via `handleGameAction({ action: EndTurn })` → `game-rules.reducer.ts:44-45` → `handleEndTurn`, confirming the fix doesn't orphan the bot's turn.
- `takeBotTurn` (`src/modules/game-rules/services/bot-turn.service.ts:9-15`) and the session-driver effect (`src/modules/game-board/game-board.engine.hook.ts:155-166`) gate purely on `players[currentPlayerIndex].isBot`, so leaving `currentPlayerIndex` on the converted seat is sufficient to make the effect fire — no new wiring needed.
- The two tests slated for rewrite (`player-exit.service.test.ts:191`, `:207`) are the only two in the "Playing" describe block with the exiting seat as current player; grepped all `currentPlayerIndex` assertions in the file to confirm no other in-progress-path test depends on the removed branch. The pre-game lobby tests at `:459`, `:475` exercise a separate `currentPlayerIndex` adjustment block (`player-exit.service.ts:131-139`), correctly left alone.
- `docs/architecture/systems-and-visuals.md:86` is the only doc line asserting the old (buggy) behavior as intended; `:49` and `:141` already describe/reference the fixed behavior or an unrelated fact and need no edit. Repo-wide grep for `convertSeatToBot`, `Ends the seat's turn`, and `if it was that seat's turn` found no other production, test or doc hit outside this file and `.claude/worktrees/*` (other agents' isolated worktrees, out of scope).
- Deferred-reclaim path (`turn-start-passives.reducer.ts:9-22`, `player-reclaim.service.ts:11-37`) is orthogonal to this fix — confirmed by reading both — and is correctly left out of the File plan.
- Design: smallest correct change, reuses the existing bot-turn effect instead of adding state or a new effect; rejected alternatives are reasonable and explained.

No changes requested.
