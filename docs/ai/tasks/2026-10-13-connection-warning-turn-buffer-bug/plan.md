# Plan: Connection warning dialog reads a frozen lastSeenAt during the player's own turn

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] During the local player's own turn, `ConnectionWarningDialog` does not open while real heartbeats are landing (it must read the live `lastSeenAt`/`isBot`, not the turn-buffered copy).
- [ ] During the local player's own turn, pressing "I'm back" (`onDismiss`) closes the dialog once the forced heartbeat lands, the same as it already does outside the player's own turn.
- [ ] No change to `withSyncedSeatManagement`'s exclusion of the local seat, to `WARNING_THRESHOLD_MS`/`STALE_THRESHOLD_MS`/`STALENESS_CHECK_INTERVAL_MS`/`HEARTBEAT_INTERVAL_MS`, or to any other `GameBoardContextType` consumer's behavior.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `useGameBoardState` builds `gameStateForDisplay` | `src/modules/game-board/game-board.state.hook.ts:19` | `isMyTurn && localGameState ? localGameState : serverGameState` — the buffered value is what `gameState` in context resolves to during the player's own turn. |
| `withSyncedSeatManagement` excludes the local seat | `src/modules/game-board/game-board.state.map.ts:23` (`if (seat.playerId === localPlayerId) return seat;`) | Confirms the local player's own seat's `lastSeenAt`/`isBot` in the buffer is frozen at turn-start clone time (`game-board.state.hook.ts:32`), by design, for every field including the two this bug needs live. |
| `GameBoardContextType` | `src/modules/game-board/game-board.types.ts:85-112` | Exposes `gameState` (buffered during own turn) and `localPlayer` (looked up inside that same buffered state, `game-board.state.hook.ts:21-24`). No raw server state field exists today. |
| `GameBoardProviderProps.serverGameState` | `src/modules/game-board/game-board.types.ts:118` | Already a required prop into the provider — the live value exists in scope, just not threaded into the context's return value. |
| `useGameBoardProvider` destructures `serverGameState` | `src/modules/game-board/game-board.hook.ts:17` | It is already a local variable in this hook; only needs adding to the `contextValue` object and its `useMemo` deps (`game-board.hook.ts:115-150`). |
| `useConnectionWarning` | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts:34-50` | Reads `const { gameState, localPlayer } = useGameBoard();` then passes `localPlayer.lastSeenAt`/`localPlayer.isBot` into the pure view-model transform. This is the read that must switch to the live value. |
| `toConnectionWarningViewModel` | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.map.ts:18-38` | Pure transform; signature unchanged by this fix — only the arguments the hook passes to it change. |
| `onDismiss` uses `gameState.id`, `localPlayer.id` | `ConnectionWarningDialog.hook.ts:67,78` | Unaffected: `id` (seat index) and the match id are never buffered-stale; `writeHeartbeat` call signature stays as-is. Existing test asserts `writeHeartbeat` called with `('game_1', 0)` (`ConnectionWarningDialog.hook.test.ts:268`) — must still pass unchanged. |
| `Player.playerId`, `Player.lastSeenAt`, `Player.isBot` | `src/lib/types/player.ts:20,24,30` | Lookup key and the two fields to read live. |
| `GameBoardStateArgs`/`GameBoardState` | `src/modules/game-board/game-board.hook.types.ts:30-44` | Unchanged by this fix — `serverGameState` already flows through `useGameBoardState`'s args; this plan only adds it to the *context* output, not to this internal hook's state shape. |
| Legacy re-export | `src/features/game/context/GameBoardContext.tsx:1-12` | Pure `export { ... } from '@/modules/game-board'` / `export type { ... }` — no edit needed; the new context field flows through automatically. |
| No `game-board.hook.test.ts` exists | confirmed via `find` in this session | No test asserts the `contextValue` object's exact key set or memo deps array by shape, so adding one field needs no separate test file update beyond what tester-a adds for the dialog itself. |
| `docs/architecture/systems-and-visuals.md` §6.14 | lines 136-147, specifically line 140 | Already *claims* the dialog "reads only the local player's own `lastSeenAt`, `isBot` and the match `status` from the live snapshot" — that sentence describes the intended behavior this bug violates. After the fix it becomes accurate for `lastSeenAt`/`isBot`; docs-sync should make it explicit that `status` still comes from `gameState` (the display state), not `serverGameState`, so a future reader doesn't assume all three are read from the live snapshot. |

## Root cause (bugs only)
- Reproduction: start a 2+ player match, let it become the local player's turn, wait ~25s with no other activity needed — the dialog opens even though the automatic 15s heartbeat (`useHeartbeat`) is landing on the server, because the dialog never looks at the server value. Pressing "I'm back" calls `writeHeartbeat` against Firestore successfully, but the dialog stays open because its `isOpen` is still computed from the frozen buffered value.
- Cause: `useConnectionWarning` (`ConnectionWarningDialog.hook.ts:35,44`) sources `lastSeenAt`/`isBot` from `useGameBoard()`'s `localPlayer`, which during the player's own turn is looked up inside `gameStateForDisplay` = the turn-start-cloned `localGameState` (`game-board.state.hook.ts:19-24`). `withSyncedSeatManagement` deliberately never re-syncs the local player's own seat into that buffer (`game-board.state.map.ts:23`), so the local seat's `lastSeenAt`/`isBot` in the buffer is permanently stuck at the value it had when the turn started, never advancing with real heartbeats and never reflecting a forced one from `onDismiss`.

## Decisions
- Expose the already-available live `serverGameState` on `GameBoardContextType`, and have `useConnectionWarning` look up its own player inside it by `playerId`, reading `lastSeenAt`/`isBot` from that live record instead of from `localPlayer`. Because: the live value already exists one level up in `useGameBoardProvider` (`game-board.hook.ts:17`), so this needs no new data fetch, no new service call, and no change to the turn buffer or `withSyncedSeatManagement` at all — it only changes which state one presence check reads. Rejected: making `withSyncedSeatManagement` also sync the local player's own seat (violates the scope's explicit "no change to the turn-buffer's exclusion of the local seat" and risks exactly the optimistic-overwrite bug `5d82f0a` was written to avoid, since the local seat is also where the turn-holder's own in-flight optimistic edits live). Rejected: adding a second, dedicated "live presence" context/hook that subscribes to Firestore directly in the dialog's hook (duplicates the subscription `useGameBoardProvider` already holds via `serverGameState`, and `.hook.ts` files may read legacy context but a new Firestore subscription here would be redundant I/O for data already in memory).
- `gameState.status` (the display state, unchanged) stays the source for the `status === 'playing'` check inside `toConnectionWarningViewModel`. Because: the triage's root cause is specific to `lastSeenAt`/`isBot` going through the frozen buffer; `status` is cloned once at turn start only after gating on `serverGameState?.status === 'playing'` (`game-board.state.hook.ts:31`) and does not change mid-turn for the turn-holder in any reachable flow — changing its source is out of scope and untested territory. Rejected: switching `status` to `serverGameState.status` too (broader change than the bug needs; no reproduction or test case in triage covers a status mismatch).
- The live-player lookup (`serverGameState.players.find(p => p.playerId === localPlayer.playerId)`) lives inline in `useConnectionWarning`, not as a new exported `.map.ts` function. Because: it is a single `.find()` call, the same pattern already used inline in `game-board.state.hook.ts:23`; a wrapping function would be a pass-through layer with nothing to unit-test beyond what the existing hook test already covers end-to-end.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/game-board.types.ts` | edit | Add `serverGameState: GameState` to `GameBoardContextType` | implementer-a |
| `src/modules/game-board/game-board.hook.ts` | edit | Add `serverGameState` to the `contextValue` object and its `useMemo` dependency array | implementer-a |
| `src/modules/game-board/game-board.hook.types.ts` | edit | Update the call-order/contextValue-deps doc comment (line ~120) to list 16 deps instead of 15 | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts` | edit | Read `serverGameState` from `useGameBoard()`; look up the live player by `playerId`; pass its `lastSeenAt`/`isBot` (not `localPlayer`'s) into `toConnectionWarningViewModel` | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.test.ts` | edit | Update `mockUseGameBoard` to also return a `serverGameState` with a `players` array; add the regression cases below; keep every existing case passing with the new mock shape | tester-a |
| `docs/architecture/systems-and-visuals.md` | edit | §6.14, line 140: make explicit that `lastSeenAt`/`isBot` come from the live `serverGameState` via the dialog's own lookup, while `status` still comes from the (possibly buffered) display `gameState` | docs-sync |
| `src/modules/map/components/TileBoats/TileBoats.fixtures.ts` | edit | `gameBoardContextFixture` is directly type-annotated as `GameBoardContextType` (no cast) and has no `serverGameState` field; add `serverGameState: gameStateFixture` (already in scope in this file) so it keeps satisfying the interface once `serverGameState` becomes required | implementer-a |

No `.tsx`, `.styles.ts`, or preview changes: the dialog's rendered output and props are unchanged (`ConnectionWarningViewModel` shape is untouched). No `.types.ts` change in the `ConnectionWarningDialog` folder itself — `ConnectionWarningViewModel` is unaffected.

## Contracts
```ts
// src/modules/game-board/game-board.types.ts — GameBoardContextType gains one field.
// Insert alongside the existing `gameState: GameState;` line (currently game-board.types.ts:88).
export interface GameBoardContextType {
  uiState: GameBoardUIState;
  dispatch: Dispatch<GameBoardUIAction>;
  gameState: GameState;          // unchanged: possibly the turn-buffered display state
  serverGameState: GameState;    // NEW: always the live, unbuffered Firestore snapshot
  localPlayer: Player;
  // ...rest unchanged
}

// src/modules/game-board/game-board.hook.ts — contextValue gains the field + dep.
// `serverGameState` is already destructured from props at game-board.hook.ts:17; no new variable.
const contextValue = useMemo<GameBoardContextType>(
  () => ({
    uiState,
    dispatch,
    gameState: gameStateForDisplay,
    serverGameState,              // NEW
    localPlayer,
    // ...unchanged
  }),
  [
    uiState,
    gameStateForDisplay,
    serverGameState,              // NEW dep
    localPlayer,
    // ...unchanged
  ]
);

// src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts
// Replace the two lines that read localPlayer.lastSeenAt / localPlayer.isBot.
export function useConnectionWarning(): ConnectionWarningViewModel {
  const { gameState, localPlayer, serverGameState } = useGameBoard();
  const [now, setNow] = useState(() => Date.now());

  // Live record for the local seat: serverGameState is never turn-buffered, unlike gameState.
  // Falls back to localPlayer only if the seat is ever missing from serverGameState (should not
  // happen in practice; playerId is a stable session id, same pattern as game-board.state.hook.ts:23).
  const livePlayer =
    serverGameState.players.find((p) => p.playerId === localPlayer.playerId) ?? localPlayer;

  // ... setInterval effect unchanged ...

  const viewModel = toConnectionWarningViewModel(
    livePlayer.lastSeenAt,   // was localPlayer.lastSeenAt
    now,
    gameState.status,        // unchanged source
    livePlayer.isBot,        // was localPlayer.isBot
    WARNING_THRESHOLD_MS,
    STALE_THRESHOLD_MS,
  );

  // ... rest of the hook (tone effect, onDismiss using gameState.id / localPlayer.id) unchanged ...
}
```

## Phases
### Phase 1: Thread live serverGameState through to the dialog
1. `game-board.types.ts`: add `serverGameState: GameState` to `GameBoardContextType`, per the Contracts block. (implementer-a)
2. `game-board.hook.ts`: add `serverGameState` to the returned `contextValue` object and to its `useMemo` dependency array. (implementer-a)
3. `game-board.hook.types.ts`: update the doc comment describing the deps count/order. (implementer-a)
4. `ConnectionWarningDialog.hook.ts`: destructure `serverGameState` from `useGameBoard()`, add the `livePlayer` lookup, pass `livePlayer.lastSeenAt`/`livePlayer.isBot` into `toConnectionWarningViewModel`. (implementer-a, **sonnet** — the three-file threading plus the lookup fallback needs to stay consistent with `game-board.state.hook.ts:21-24`'s existing pattern and not regress any of the 16 existing test cases in `ConnectionWarningDialog.hook.test.ts`)
5. `TileBoats.fixtures.ts`: add `serverGameState: gameStateFixture` to `gameBoardContextFixture` so the direct-typed fixture still satisfies `GameBoardContextType` once `serverGameState` is required. (implementer-a)
6. `ConnectionWarningDialog.hook.test.ts`: update `mockUseGameBoard` to accept and return a `serverGameState`, and add the regression cases in Test plan below — written and run against the pre-fix code first (must fail), then again after implementer-a's change (must pass). (tester-a)
7. `docs/architecture/systems-and-visuals.md` §6.14 line 140: update per File plan. (docs-sync)
8. Run `npm run typecheck`, `npm run lint`, `npm test` on every touched file; fix anything either command flags. (implementer-a, tester-a)

Model escalation: step 4 (implementer-a) runs on sonnet, per triage's `Overrides: implementer-a=sonnet`. All other steps: haiku.

## Test plan
- tester-a (`ConnectionWarningDialog.hook.test.ts`, first — before implementer-a's fix lands, to prove the bug):
  - Update `mockUseGameBoard(localPlayer, status, serverLocalPlayer?)` (or equivalent) so every existing case keeps passing with `serverGameState.players` containing the same `playerId` and the same `lastSeenAt`/`isBot` as the mocked `localPlayer` by default (no behavior change for cases that don't care about the buffer).
  - New case: "stays closed during the player's own turn when gameState's buffered lastSeenAt is stale but serverGameState's live lastSeenAt is fresh" — mock `localPlayer.lastSeenAt` (buffered) as `START_TIME - WARNING_THRESHOLD_MS - 1`, mock a `serverGameState` player with the same `playerId` and `lastSeenAt: Date.now()`; assert `isOpen` is `false`.
  - New case: "onDismiss closes the dialog once serverGameState's lastSeenAt advances, even though the buffered gameState's lastSeenAt never changes" — mirrors the existing "closes on the render after a fresh heartbeat lands" case (`ConnectionWarningDialog.hook.test.ts:130`) but holds `localPlayer.lastSeenAt` (buffered) fixed at the stale value across the rerender and only advances the `serverGameState` player's `lastSeenAt`; assert `isOpen` flips to `false`.
  - Confirm the existing case at `ConnectionWarningDialog.hook.test.ts:257` (`onDismiss` calls `writeHeartbeat` with `('game_1', 0)`) still passes unchanged — `gameState.id` and `localPlayer.id` are untouched by this fix.
- tester-b: no view or e2e test needed — `ConnectionWarningDialog.tsx`'s props (`ConnectionWarningViewModel`) are unchanged, and no e2e spec references the dialog (confirmed: no hits for "ConnectionWarning" under `e2e/` in this session).

## Preview states
- None — no new or changed visual states; `ConnectionWarningDialog.preview.tsx` fixtures (`openWarningViewModel`, `openExpiringViewModel`, `dismissingViewModel`) are unaffected.

## Risks
- Forgetting the `serverGameState` dep in `useMemo` would make `contextValue` stale when only the server snapshot changes without `gameStateForDisplay`/`localPlayer` also changing (possible outside the player's own turn, where `gameStateForDisplay` already equals `serverGameState` by reference — low risk there, but real during the player's own turn where they can diverge). Mitigated by listing it explicitly in the Contracts block and by lint's exhaustive-deps rule catching an omission.
- The `livePlayer` fallback to `localPlayer` when `serverGameState.players` has no matching `playerId` must never silently mask a real bug (e.g., an off-by-one player-list mismatch). Acceptable here only because the same "seat never actually missing" assumption already underlies `game-board.state.hook.ts:23`'s identical fallback pattern, not because this plan treats it as impossible.

## Review (architect-b)
- Verified every path/symbol cited in "Verified context" and the File plan against the real code: `game-board.state.hook.ts:19-43`, `game-board.types.ts:85-125`, `game-board.hook.ts:17,115-150`, `game-board.state.map.ts:15-48`, `ConnectionWarningDialog.hook.ts:34-81`, `ConnectionWarningDialog.hook.test.ts` (lines 130, 257/268 match as cited), `systems-and-visuals.md:140` (quoted sentence matches verbatim), `game-board.provider.tsx`, `GameBoardContext.tsx` (pure re-export, no transform). The 15→16 `contextValue` deps count is correct (counted both arrays). Root cause is real and exactly as described: `withSyncedSeatManagement` (`game-board.state.map.ts:23`) skips the local seat by design, so the buffered `localPlayer.lastSeenAt`/`isBot` the dialog reads never advances mid-turn.
- Design is the simplest fix that matches the stated root cause: reuse the already-in-scope `serverGameState` rather than a new subscription or a turn-buffer change. No simpler option found; rejected alternatives in "Decisions" are correctly rejected.
- Gap found by re-running the old-path/new-field sweep across the whole repo, not just the File plan: `src/modules/map/components/TileBoats/TileBoats.fixtures.ts:130` declares `export const gameBoardContextFixture: GameBoardContextType = { ... }` with a **direct type annotation**, not an `as`/`as unknown as` cast, and it has no `serverGameState` field. I verified empirically (minimal `tsc --noEmit --strict` repro) that a direct type-annotated object literal requires every property of the interface, while `as T` / `as unknown as T` casts on the other GameBoardContextType mocks (`IslandTile.hook.test.ts`, `TileOccupants.hook.test.ts`, `MapGrid.hook.test.ts`, `TileResources.hook.test.ts`) do not — those are fine as-is. Once `serverGameState: GameState` is added to `GameBoardContextType`, `TileBoats.fixtures.ts` will fail `npm run typecheck` with "Property 'serverGameState' is missing". This file isn't in the File plan and its only consumer is `TileBoats.hook.test.ts` (confirmed via grep, no other usages).
  - Fix: add `TileBoats.fixtures.ts` (edit, owner implementer-a, since it's a direct consequence of the `GameBoardContextType` edit in step 1) to the File plan: add `serverGameState: gameStateFixture` (or an equivalent minimal server snapshot) to `gameBoardContextFixture`.
- Everything else in the File plan, Contracts, Test plan and Phases is complete and consistent: the contract block's `contextValue`/`useMemo` deps snippet matches the real file's structure field-for-field; the test plan's new cases correctly target the buffered-vs-live divergence; scope exclusions (no change to `withSyncedSeatManagement`, no threshold changes) are respected throughout.
- Minor: triage.md's line 23 "Likely shape" and the plan's final Contracts/Decisions agree — no drift between triage and plan to flag.

VERDICT: CHANGES REQUESTED — add `src/modules/map/components/TileBoats/TileBoats.fixtures.ts` to the File plan (owner implementer-a) with the one-line fix above; everything else in the plan is approved as written.

### Revision (plan)
- `TileBoats.fixtures.ts` added to the File plan (owner implementer-a) and to Phase 1 step 5, per architect-b's gap. Applied the fix directly: `gameBoardContextFixture.serverGameState = gameStateFixture` (`src/modules/map/components/TileBoats/TileBoats.fixtures.ts:133`) — `gameStateFixture` was already in scope in this file (line 112), no new import needed.

### Re-review (architect-b)
- Confirmed `serverGameState: gameStateFixture` at `src/modules/map/components/TileBoats/TileBoats.fixtures.ts:132` in `gameBoardContextFixture`, satisfying `GameBoardContextType` once `serverGameState` is required. Re-ran the old-path/direct-annotation sweep repo-wide (`grep -rn "GameBoardContextType = {" src/modules`, filtered to literals without an `as` cast): this is the only such literal in the repo, now fixed. No other gap.

VERDICT: APPROVED
