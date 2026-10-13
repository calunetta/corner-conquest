# Plan: Host doesn't see a reclaimed seat flip from bot back to human (Phase 2)

Status: APPROVED
Inputs: triage.md, progress.md's Log (tester-b's Phase 1 e2e blocker)

## Goal and acceptance criteria
- [ ] After a guest reclaims their seat while it is the host's turn, the host's client reflects the seat's `isBot: false` within one Firestore round trip (no 15s wait, no requiring the host to end their turn first).
- [ ] After the host then ends their turn, the reclaimed guest's client shows `"Your Turn"` (today the host's `EndTurn` write silently reverts the reclaim — see Root cause).
- [ ] `e2e/reconnect-bot-takeover.spec.ts` passes end to end against the Firestore emulator (`npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`), including line 104's `guestPage.getByText('Your Turn')` assertion, which is where it fails today.
- [ ] No regression to the existing turn-buffer behavior: a human's own in-progress actions during their turn (`Move`, combat, `Deploy`, etc.) are still held in `localGameState` and not visible to or overwritten by other clients until the turn ends.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `useGameBoardState` / `gameStateForDisplay` | `src/modules/game-board/game-board.state.hook.ts:9-18` | `gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState`. While it's the host's turn, the host's UI renders exclusively from `localGameState`, a buffer seeded once at turn start (line 31, `cloneDeep(serverGameState)`) and never otherwise re-synced from later `serverGameState` snapshots. |
| turn-buffer seeding effect | `src/modules/game-board/game-board.state.hook.ts:25-35` | Seeds `localGameState` once (`!localGameState` guard, line 30) and clears it when the turn ends (`!isMyTurn && localGameState`, line 32). Has no branch that reconciles `localGameState` against a newer `serverGameState` while still mid-turn — this is the root cause. |
| `handleSeatReclaim` | `src/modules/game-rules/services/player-reclaim.service.ts:11-37` | When the reclaiming seat is not the current player (this bug's scenario — it's the host's turn), it flips `isBot`/`isVacant` to `false` immediately in a Firestore transaction (lines 30-31). Confirmed correct and immediate by the triage's direct REST read; not touched by this plan. |
| `useGameBoardActions` EndTurn branch | `src/modules/game-board/game-board.actions.hook.ts:25-30` | `GameAction.EndTurn` calls `await setGameState(localGameState, action, payload)` — using the same stale buffer, not `serverGameState`. |
| `setGameState` | `src/modules/game-board/game-board.engine.hook.ts:19-32` | Runs `handleGameAction({ action, gameState: currentState })` on whatever `currentState` it's given (here, the stale `localGameState`), then `saveGameState(gameId, result.state)` — a plain overwrite. |
| `saveGameState` | `src/modules/game-board/services/game-board.engine.service.ts:29-32` | `await setDoc(gameDocRef, state)` — a plain `setDoc`, not a transaction (also documented at `docs/architecture/game-mechanics.md` and `docs/architecture/systems-and-visuals.md:70`, "Atomic Turn Writes"). Whatever `state` it's handed fully replaces the document, including any seat fields it doesn't know changed concurrently. |
| `handleEndTurn` | `src/modules/game-rules/player-turn.reducer.ts:44-127` | Runs on the stale state handed to it. `applyDeferredReclaim` (line 51) only touches the *outgoing* player (the host here, not vacant, so a no-op); the newly-current seat (the guest, next in line) is copied straight from the stale `nextPlayer = state.players[nextPlayerIndex]` (line 56) with its pre-reclaim `isBot: true` intact. |
| fields only ever written outside normal gameplay | grep confirmed: `Player.isBot`, `.isVacant` and `.reclaimRequested` are assigned only in `src/modules/game-rules/services/player-exit.service.ts`, `src/modules/game-rules/services/player-reclaim.service.ts` and `src/modules/game-rules/turn-start-passives.reducer.ts`. `.lastSeenAt` is also assigned by `writeHeartbeat` in `src/modules/game-board/services/game-board.engine.service.ts:55` — a periodic heartbeat, not a gameplay action, and each client only ever writes it for its *own* seat (`game-board.heartbeat.hook.ts:26`), so it can never collide with the buffer-holder's own optimistic change to another seat. | No normal gameplay reducer (combat, move, deploy, cards) touches these four fields, so syncing them from `serverGameState` into `localGameState` for every seat except the local player's own cannot clobber an in-progress optimistic gameplay change to another seat (e.g. combat results on an opponent's army). |
| `Player` type | `src/lib/types/player.ts:19-40` | `id: number` (seat index, stable for the match), `playerId: string` (session id, used to find the local player at `game-board.state.hook.ts:22`), `isBot`, `isVacant`, `lastSeenAt`, `reclaimRequested` — exact fields to sync. |
| `GameBoardStateArgs` / `GameBoardState` | `src/modules/game-board/game-board.hook.types.ts:30-44` | Existing hook contract; `playerId: string \| null` is already passed in and is what identifies the local player's own seat to exclude from the sync. |
| existing hook tests | `src/modules/game-board/game-board.state.hook.test.ts:95-121` | `describe('when it is the local player turn', ...)` — the cases this plan must not break: buffering still clones on seed, buffer still drops at turn end. New cases are added alongside, not replacing these. |
| `game-board.map.ts` | `src/modules/game-board/game-board.map.ts:1-17` | Existing precedent for a small, pure `.map.ts` file in this flat (no-`components/`) module layout — this plan's new pure merge function follows the same pattern but in its own file (see Decisions). |
| lesson already recorded for Phase 1's bug class | `docs/ai/lessons-learned.md:135` | Same family of bug ("client reads stale state") as this one; this plan's fix is a distinct root cause (a display/write buffer, not a turn-advance ordering bug) and does not duplicate that entry. |

## Root cause (bugs only)
- Reproduction: Phase 1's e2e run (`JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`) now gets past the Phase 1 assertions and fails at `e2e/reconnect-bot-takeover.spec.ts:104` (`guestPage.getByText('Your Turn')` after the host ends its turn following the guest's reclaim). `review.md:9` records the same failure line for the Phase 1 final review's e2e run.
- Cause: `localGameState` (`game-board.state.hook.ts:16`) is the host's authoritative in-memory turn buffer, seeded once from `serverGameState` when the host's turn starts and never reconciled against later `serverGameState` snapshots while that turn continues (`game-board.state.hook.ts:25-35` has no such branch). The guest's `handleSeatReclaim` (`player-reclaim.service.ts:30-31`) writes `isBot: false, isVacant: false` straight to Firestore mid-host-turn — correctly and immediately, per the triage's direct REST read — but the host's `gameStateForDisplay` keeps rendering the pre-reclaim buffer for the rest of the host's turn (the display symptom: BOT shown for 15s+ despite a correct document). When the host then clicks "End Turn", `useGameBoardActions` (`game-board.actions.hook.ts:26-27`) hands that same stale buffer to `setGameState` → `handleEndTurn` (`player-turn.reducer.ts:44`), which advances `currentPlayerIndex` to the guest's seat using the stale `players` array — still `isBot: true` — and `saveGameState` (`game-board.engine.service.ts:31`) plain-`setDoc`s that stale `result.state` over the correct document, reverting the guest's seat back to `isBot: true` in Firestore. The guest's client then never sees `isMyTurn` become true (`game-board.engine.hook.ts:90` requires `!currentPlayer.isBot`), so `"Your Turn"` never renders — the line 104 failure.
- Both symptoms (the 15s+ stale display and the EndTurn-time revert) share one root cause: the turn buffer is never updated from live `serverGameState` changes to seats other than the buffer-holder's own, for the whole duration of the turn.

## Decisions
- Reconcile only four out-of-band seat-management fields (`isBot`, `isVacant`, `lastSeenAt`, `reclaimRequested`) from each new `serverGameState` into `localGameState`, for every seat except the local player's own, inside the existing seeding effect in `game-board.state.hook.ts`. These fields are confirmed (by grep, see Verified context) to be written only by `player-exit.service.ts`, `player-reclaim.service.ts` and `turn-start-passives.reducer.ts` — never by a normal gameplay action — so this cannot clobber an in-progress optimistic change the turn-holder made to another seat (e.g. combat). This fixes both symptoms: the display catches up within one snapshot round trip (no more 15s+ stale BOT), and by the time the host clicks "End Turn" the buffer already carries the guest's corrected flags, so `handleEndTurn` advances onto a seat that is actually a human, not a stale bot — no more revert.
- Put the merge in a new, separate pure function `withSyncedSeatManagement` in a new `game-board.state.map.ts`, not inside `game-board.map.ts` (which holds an unrelated UI-dialog-state check) or inline in the hook — matches `component-architecture`'s one-responsibility-per-file rule and the `.map.ts` constraint (pure, no React/I/O). Rejected: adding the four fields to the existing `game-board.map.ts` (unrelated responsibility — dialog-state checking vs. state-buffer reconciliation — would mix two reasons to change in one file).
- Rejected: always display `serverGameState` instead of the buffer (i.e. remove `isMyTurn && localGameState` from `gameStateForDisplay`). This would also "fix" the display, but would revert the host's own in-progress, not-yet-written turn actions (moves, combat, purchases) every time a new snapshot arrives — the entire point of `localGameState`, documented at `docs/architecture/systems-and-visuals.md:69` ("zero Firestore writes until turn completion"). Far more invasive than needed.
- Rejected: making `handlePlayerExit`/`handleSeatReclaim`'s writes transactional against a check of `currentPlayerIndex`'s owner's pending write — the documents are already correct immediately (confirmed by the triage's REST read); the bug is entirely client-side (stale buffer), not a Firestore write-ordering race. Fixing Firestore write ordering would not fix the display lag and is unnecessary complexity.
- Rejected: syncing the entire `players` array (not just the four fields) from `serverGameState` into `localGameState` on every snapshot — broader than needed, and risks a timing window where a stale `serverGameState` snapshot (arriving just before a local real-time action's own write round-trips) could revert data the turn-holder's own local action just applied to another seat (e.g. a monster/combat result). Scoping to the four seat-management fields avoids that: grep confirms no gameplay reducer ever writes them, so there's no such window for those fields specifically.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/game-board.state.map.ts` | new | Pure function `withSyncedSeatManagement(localGameState, serverGameState, localPlayerId)`: returns `localGameState` with `isBot`/`isVacant`/`lastSeenAt`/`reclaimRequested` copied from the matching seat in `serverGameState`, for every seat except `localPlayerId`'s own; returns the same `localGameState` reference untouched if nothing differs. | implementer-a |
| `src/modules/game-board/game-board.state.map.test.ts` | new | Unit tests for `withSyncedSeatManagement` (see Test plan). | tester-a |
| `src/modules/game-board/game-board.state.hook.ts` | edit | Call `withSyncedSeatManagement` from the existing seeding effect (lines 25-35) on every `serverGameState` change while `isMyTurn && localGameState` is already set, and `setLocalGameState` only if the result differs by reference. No other change to the file. | implementer-a |
| `src/modules/game-board/game-board.state.hook.test.ts` | edit | Add cases to the existing `describe('when it is the local player turn', ...)` block (after line 106, 121) covering the reconciliation; leave the two existing tests in that block and the other two `describe` blocks unmodified. | tester-a |
| `docs/architecture/systems-and-visuals.md` | edit | §"In-Memory Turn Buffering" (line 69): add one sentence noting the exception — seat-management fields (`isBot`, `isVacant`, `lastSeenAt`, `reclaimRequested`) for *other* seats are still synced live into the buffer from `serverGameState`, because they're never written by gameplay actions, so an exit/reclaim/staleness change to another seat is visible without waiting for the turn to end. | docs-sync |

No `.tsx`, `.styles.ts` or other view file changes — implementer-b has no files on this task. No new e2e spec: `e2e/reconnect-bot-takeover.spec.ts` already exercises this exact scenario (reclaim mid-host-turn, then host ends turn, then assert the guest's turn) and is the regression test.

## Contracts
```ts
// src/modules/game-board/game-board.state.map.ts (new)
import type { GameState } from '@/lib/types';

/**
 * Carries forward out-of-band seat-management fields from the latest `serverGameState` into the
 * turn-holder's local buffer, for every seat except `localPlayerId`'s own. These four fields
 * (isBot, isVacant, lastSeenAt, reclaimRequested) are only ever written by handlePlayerExit,
 * handleSeatReclaim, applyDeferredReclaim (src/modules/game-rules/services/player-exit.service.ts,
 * player-reclaim.service.ts, turn-start-passives.reducer.ts) and the per-seat heartbeat write
 * (writeHeartbeat in src/modules/game-board/services/game-board.engine.service.ts, always for the
 * writing client's own seat) — never by a normal gameplay action — so this cannot clobber the
 * turn-holder's own in-progress optimistic changes to another seat.
 * Returns `localGameState` unchanged (same reference) if nothing differs, so callers can skip
 * `setLocalGameState` and avoid an unnecessary re-render.
 */
export function withSyncedSeatManagement(
  localGameState: GameState,
  serverGameState: GameState,
  localPlayerId: string | null,
): GameState {
  let changed = false;

  const players = localGameState.players.map((seat, index) => {
    if (seat.playerId === localPlayerId) return seat;

    const serverSeat = serverGameState.players[index];
    if (!serverSeat || serverSeat.playerId !== seat.playerId) return seat;

    if (
      seat.isBot === serverSeat.isBot &&
      seat.isVacant === serverSeat.isVacant &&
      seat.lastSeenAt === serverSeat.lastSeenAt &&
      seat.reclaimRequested === serverSeat.reclaimRequested
    ) {
      return seat;
    }

    changed = true;
    return {
      ...seat,
      isBot: serverSeat.isBot,
      isVacant: serverSeat.isVacant,
      lastSeenAt: serverSeat.lastSeenAt,
      reclaimRequested: serverSeat.reclaimRequested,
    };
  });

  return changed ? { ...localGameState, players } : localGameState;
}
```

```ts
// src/modules/game-board/game-board.state.hook.ts — edit inside the existing effect (lines 25-35)
// Before:
useEffect(() => {
  if (isMyTurn && serverGameState?.status === 'playing' && !localGameState) {
    setLocalGameState(cloneDeep(serverGameState));
  } else if (!isMyTurn && localGameState) {
    setLocalGameState(null);
  }
}, [isMyTurn, serverGameState, localGameState]);

// After: add a third branch; the first two branches are unchanged.
useEffect(() => {
  if (isMyTurn && serverGameState?.status === 'playing' && !localGameState) {
    setLocalGameState(cloneDeep(serverGameState));
  } else if (!isMyTurn && localGameState) {
    setLocalGameState(null);
  } else if (isMyTurn && localGameState && serverGameState) {
    const synced = withSyncedSeatManagement(localGameState, serverGameState, playerId);
    if (synced !== localGameState) {
      setLocalGameState(synced);
    }
  }
}, [isMyTurn, serverGameState, localGameState, playerId]);
```
`playerId` is already destructured from `GameBoardStateArgs` at `game-board.state.hook.ts:9-14` — no signature change to `useGameBoardState` itself. Add `import { withSyncedSeatManagement } from './game-board.state.map';` at the top of the file.

## Phases
### Phase 2: Sync out-of-band seat fields into the turn buffer
1. tester-a: confirm the live repro still fails as described (`JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`, failing at line 104), then write failing unit tests first in a new `game-board.state.map.test.ts` for `withSyncedSeatManagement` (see Test plan) and new cases in `game-board.state.hook.test.ts`. Run them and confirm they fail against today's code (no `game-board.state.map.ts` exists yet / the hook has no third branch).
2. implementer-a: create `game-board.state.map.ts` and apply the Contracts-block edit to `game-board.state.hook.ts`. Nothing else in either file changes.
3. tester-a: re-run `npx jest src/modules/game-board/game-board.state.map.test.ts src/modules/game-board/game-board.state.hook.test.ts` and confirm all cases pass, including the two pre-existing tests in the "when it is the local player turn" block (`game-board.state.hook.test.ts:96-106`, `:108-120`), unmodified by this change and still green.
4. tester-b: run the real e2e spec against the emulator (`JAVA_HOME=/opt/homebrew/opt/openjdk@21 npm run test:e2e -- e2e/reconnect-bot-takeover.spec.ts`) and confirm it now passes end to end, including line 93-94 (Phase 1's assertions, must still pass) and line 104 (this phase's target).
5. docs-sync: apply the `docs/architecture/systems-and-visuals.md:69` addition from the File plan.

Model escalation: none requested by triage.md for Phase 2; all steps run on the default model unless a builder hits a blocker that needs escalation.

## Test plan
- tester-a (`game-board.state.map.test.ts`, new):
  - Two seats, reclaiming seat (not local player, not current player) differs on all four fields between `localGameState` and `serverGameState` → returned state is a new object, that seat's four fields match `serverGameState`, all other fields on that seat (e.g. `name`, `armies`) are untouched, the local player's own seat is byte-identical (same reference) even if its own four fields somehow differ.
  - No seat differs → returns the exact same `localGameState` reference (identity check), so the hook can skip `setLocalGameState`.
  - `serverGameState` has a seat at an index whose `playerId` doesn't match the corresponding `localGameState` seat (defensive: shouldn't happen mid-match, seat order is stable) → that seat is left unchanged, not merged.
- tester-a (`game-board.state.hook.test.ts`, new cases in the existing "when it is the local player turn" `describe` block):
  - Buffer already seeded (host's turn); rerender with a new `serverGameState` where the *other* seat's `isBot` flipped from `true` to `false` (simulating the guest's reclaim) → `result.current.localGameState.players[1].isBot` becomes `false`, `result.current.gameStateForDisplay` still `toBe(result.current.localGameState)` (still mid-turn, still the buffer, just synced), and the local player's own buffered seat (`players[0]`) is unaffected.
  - Same setup, but the new `serverGameState` has no seat-management difference → `result.current.localGameState` is reference-equal to the pre-rerender value (no unnecessary `setLocalGameState` / re-render).
- tester-b (e2e): one real run of `e2e/reconnect-bot-takeover.spec.ts` against the Firestore emulator; no new spec file. Confirms the host's display catches the reclaim and, critically, that ending the host's turn afterward correctly hands control to the guest (line 104).

## Preview states
None — no view component changes.

## Risks
- The merge compares seats by array index, not by searching for a matching `playerId` (`withSyncedSeatManagement`'s `serverGameState.players[index]` lookup). This relies on seat order staying stable for the whole match, which is already relied on elsewhere (`convertSeatToBot`'s docstring, `player-exit.service.ts:9-10`: "so seat indices and every reference to them stay valid"); the function defensively no-ops a seat if the indices' `playerId`s don't match, rather than merging the wrong seat.
- This sync effect adds one more dependency (`playerId`) to the existing seeding `useEffect`; `playerId` is already a stable prop (`GameBoardStateArgs.playerId`, unchanged for the life of a session), so this does not introduce a new re-run trigger in practice.
- Scoped to four fields deliberately (see Decisions) to avoid widening this fix into a general "always reconcile everything" change, which would need a much larger audit of every reducer for safety.

## Review (architect-b)
VERDICT: APPROVED

Verified every path/symbol in Verified context and File plan against the real files: `game-board.state.hook.ts:9-18,25-35` (effect and `gameStateForDisplay` match the plan's "Before" quote exactly), `player-reclaim.service.ts:11-37`, `game-board.actions.hook.ts:25-30`, `game-board.engine.hook.ts:19-32,90`, `game-board.engine.service.ts:29-32`, `player-turn.reducer.ts:44-127` (`applyDeferredReclaim` call at line 51 confirmed), `player.ts:19-40`, `game-board.hook.types.ts:30-44`, `game-board.state.hook.test.ts:96-106,108-120`, `game-board.map.ts:1-17`, `systems-and-visuals.md`'s "In-Memory Turn Buffering" bullet. All match.

One factual gap found and fixed in place (trivial wording, folded in per protocol): the Verified-context row and the `withSyncedSeatManagement` docstring claimed `isBot`/`isVacant`/`lastSeenAt`/`reclaimRequested` are written only by `player-exit.service.ts`, `player-reclaim.service.ts` and `turn-start-passives.reducer.ts`. Grep (`grep -rn "\.isBot\s*=\|\.isVacant\s*=\|\.reclaimRequested\s*=" src/`) confirms that for three of the four fields, but `lastSeenAt` is also written by `writeHeartbeat` (`game-board.engine.service.ts:55`). This doesn't weaken the safety argument — `writeHeartbeat` is a periodic write, not a gameplay reducer, and each client only ever stamps its *own* seat (`game-board.heartbeat.hook.ts:26`: `seatIndex = localPlayer?.id`), so it can't collide with the turn-holder's optimistic change to another seat — but the claim as written was incomplete, and the comment would have shipped verbatim into the new file's docstring. Updated both spots to name `writeHeartbeat` and explain why it's still safe.

Design: the merge-four-fields approach is the simplest fix that doesn't regress turn buffering (the Decisions section's three rejected alternatives are each a real alternative with a correct reason to reject, not padding). Scoping by field rather than always trusting `serverGameState` wholesale is justified by the same grep. The new pure function belongs in its own `.map.ts` file per `component-architecture`'s one-responsibility rule, correctly kept separate from the existing unrelated `game-board.map.ts`. Contracts are concrete and complete enough for implementer-a to build directly; no implementer-b work exists on this phase, consistent with the File plan and `progress.md`. Test plan covers the identity-skip case (avoids unnecessary re-render), the defensive index-mismatch case, and both the map-level and hook-level reconciliation behavior, plus doesn't touch the two existing hook tests it must not break (confirmed unmodified at `game-board.state.hook.test.ts:96-121`).

No invented paths found; no better existing helper to reuse (confirmed via grep there's no existing seat-field-merge utility).
