# Plan: Stop heartbeat writes from colliding with game-state writes

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `writeHeartbeat` no longer uses `runTransaction` / reads-then-writes the whole `GameState` document; it writes a single field path, so it cannot collide with a concurrent `saveGameState`/bot-turn `setDoc` and cannot produce `failed-precondition`.
- [ ] `lastSeenAt` is removed from `Player`; the equivalent data lives in a new top-level `GameState.heartbeats: Partial<Record<number, number>>` keyed by `Player.id` (seat index).
- [ ] Every existing behavior that depended on `lastSeenAt` is unchanged: staleness takeover at 45 s, the connection-warning dialog at 25 s, the turn-buffer sync of a reclaimed seat, `convertSeatToBot` clearing the stamp.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] `docs/architecture/systems-and-visuals.md` describes the new mechanism (docs-sync).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Player.lastSeenAt` | `src/lib/types/player.ts:30` | field being removed |
| `GameState` | `src/lib/types/game.ts:60-83` | gets the new `heartbeats` field |
| `writeHeartbeat` | `src/modules/game-board/services/game-board.engine.service.ts:49-63` | the buggy transaction; root cause |
| `saveGameState` | `src/modules/game-board/services/game-board.engine.service.ts:29-32` | whole-doc `setDoc` that collides with the transaction |
| `useHeartbeat` | `src/modules/game-board/game-board.heartbeat.hook.ts:1-39` | calls `writeHeartbeat(gameId, seatIndex)`; signature unchanged |
| `useConnectionWarning` | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts:34-87` | reads `livePlayer.lastSeenAt` (line 50) and calls `writeHeartbeat` (line 73) on dismiss |
| `toConnectionWarningViewModel` | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.map.ts:18-38` | pure fn, takes `lastSeenAt: number \| null` as a parameter — signature and body untouched, only the caller's source of that value changes |
| `findStalePeerIds` | `src/modules/game-board/game-board.staleness.hook.ts:16-21` | filters `Player[]` on `player.lastSeenAt` |
| `useStalenessCheck` | `src/modules/game-board/game-board.staleness.hook.ts:33-58` | calls `findStalePeerIds(latestState.players, …)` (line 49) |
| `withSyncedSeatManagement` | `src/modules/game-board/game-board.state.map.ts:15-48` | copies 4 seat fields (incl. `lastSeenAt`) from server to local buffer per seat, skipping the local player's own seat |
| `useGameBoardState` | `src/modules/game-board/game-board.state.hook.ts` (calls `withSyncedSeatManagement`, exercised by `game-board.state.hook.test.ts:123-178`) | consumer of the sync function; its test asserts a synced `lastSeenAt` value |
| `convertSeatToBot` | `src/modules/game-rules/services/player-exit.service.ts:13-23` | sets `seat.lastSeenAt = null` on takeover; runs inside a transaction that `transaction.set`s the whole document (full-object mutation, not `updateDoc`) |
| `createPlayer` | `src/modules/game-rules/player-factory.ts:5-55` | sets `lastSeenAt: null` at seat creation (line 36) |
| `initializeGame` | `src/modules/game-rules/game-setup.reducer.ts:109-133` | builds the initial `GameState` literal; needs the new `heartbeats: {}` field |
| `samplePlayer` | `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts:5-33` | `Player` fixture with `lastSeenAt: null` (line 12) |
| `@/lib/firebase` exports | `src/lib/firebase.ts:59-81` | `updateDoc` already exported (line 79); no new export needed — `deleteField()` is not needed anywhere in this fix (see Decisions) |
| `firestore.rules` | repo root | grepped, no reference to `lastSeenAt` — confirmed no rules change needed |
| Precedent for `Record<number, …>` | `src/modules/game-rules/monster-catalog.ts:4` | matches the chosen type shape for `heartbeats` |
| Heartbeats only run while playing | `src/modules/game-board/game-board.heartbeat.hook.ts:25` (`status === GameStatus.Playing && …`) | proves the lobby (pre-game) player-splice/renumber path in `player-exit.service.ts:94-115` never needs to reindex `heartbeats`, because it only runs in `GameStatus.Waiting`, when `heartbeats` is always `{}` |

## Root cause (bugs only)
- Reproduction: sustained concurrent writes (bot turns, resource collection triggering `saveGameState`, every 15 s `writeHeartbeat`) to `games/{id}` surfaced `failed-precondition` in the browser console (user report).
- Cause: `writeHeartbeat` (`game-board.engine.service.ts:49-63`) runs `runTransaction`: reads the whole `GameState` document, mutates one seat's `lastSeenAt`, and `transaction.set`s the whole document back. Firestore transactions version-check the entire document on commit, so any concurrent whole-document `setDoc` (from `saveGameState` or `bot-turn.service.ts`, both plain `setDoc`, no transaction) to the same path forces the transaction to retry against the new version. Under sustained write pressure retries can exhaust, surfacing as `failed-precondition`.

## Decisions
- Move the timestamp off `players[].lastSeenAt` into a new top-level `GameState.heartbeats: Partial<Record<number, number>>` map keyed by seat index, written with a single-field-path `updateDoc(ref, { [\`heartbeats.${seatIndex}\`]: Date.now() })`. Firestore does not version-check an untouched sibling field path against a concurrent whole-document write to the same document type in a way that forces retries on this path — there is no read, no transaction, so there is nothing to retry. Rejected: keep `runTransaction` but shrink the document in some other way (no such shrink exists; the shared document is the entire match state per CLAUDE.md's Firestore model). Rejected: batch heartbeats client-side and flush less often (doesn't fix the data shape, still a transaction, just rarer failures).
- No `deleteField()` needed. The only place a heartbeat value is ever cleared is `convertSeatToBot`, which runs inside a transaction that overwrites the *whole* document via `transaction.set(gameDocRef, currentState)` — plain `delete currentState.heartbeats[playerIndex]` on the in-memory object is sufficient there; `deleteField()` is a sentinel only needed for `updateDoc`/merge-`setDoc` calls, which this fix never uses for deletion.
- No reindexing of `heartbeats` on the lobby player-removal path (`player-exit.service.ts:94-115`, which splices and renumbers seat ids). Verified: `useHeartbeat` only sends heartbeats while `status === GameStatus.Playing` (`game-board.heartbeat.hook.ts:25`); the splice/renumber path only runs while `status === GameStatus.Waiting`. `heartbeats` is therefore always `{}` whenever that path runs, so there is nothing to reindex. Rejected: write a generic reindex helper defensively — speculative, not required by any reachable code path (KISS).
- `toConnectionWarningViewModel` (`ConnectionWarningDialog.map.ts`) keeps its exact signature (`lastSeenAt: number | null` as a parameter name/type). Only its caller's source of that argument changes (`ConnectionWarningDialog.hook.ts`, `serverGameState.heartbeats[livePlayer.id] ?? null` instead of `livePlayer.lastSeenAt`). Rejected: rename the parameter — churn with no behavior change, not required by the acceptance criteria.
- `ConnectionWarningDialog.types.ts`'s doc comment ("lastSeenAt updates through the normal Firestore subscription") and `docs/ai/lessons-learned.md`'s historical entry both stay as-is: both describe the general mechanism (a live value synced through `serverGameState`), which remains true; neither names a `Player.lastSeenAt` type field as such in a way that becomes false. Rejected: editing them — out of scope, no behavior or type they describe has changed meaning.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/player.ts` | edit | remove `lastSeenAt` field + its doc comment | implementer-a |
| `src/lib/types/game.ts` | edit | add `heartbeats: Partial<Record<number, number>>` field + doc comment | implementer-a |
| `src/modules/game-board/services/game-board.engine.service.ts` | edit | rewrite `writeHeartbeat` as a plain `updateDoc`; drop unused `runTransaction` import | implementer-a |
| `src/modules/game-rules/game-setup.reducer.ts` | edit | initialize `heartbeats: {}` in `initializeGame` | implementer-a |
| `src/modules/game-rules/player-factory.ts` | edit | remove `lastSeenAt: null` from `createPlayer`'s returned object | implementer-b |
| `src/modules/game-rules/services/player-exit.service.ts` | edit | `convertSeatToBot`: `delete state.heartbeats[playerIndex]` instead of `seat.lastSeenAt = null` | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` | edit | remove `lastSeenAt: null` from `samplePlayer` | implementer-b |
| `src/modules/game-board/services/game-board.engine.service.test.ts` | edit | rewrite the `writeHeartbeat` describe block for the `updateDoc` behavior; drop unused `runTransaction` mock/import | tester-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | edit | update the 3 `lastSeenAt` assertions (lines ~138, ~159, ~166-173, ~219) to assert on `heartbeats` | tester-a |
| `src/modules/game-board/game-board.engine.hook.test.ts` | edit | drop `lastSeenAt: null` from the two inline `Player` fixtures (mechanical, no assertion depends on it) | tester-a |
| `src/modules/game-board/game-board.heartbeat.hook.test.ts` | edit | drop `lastSeenAt: null` from `createPlayer` fixture (mechanical) | tester-a |
| `src/modules/game-board/game-board.state.map.ts` | edit | `withSyncedSeatManagement`: drop `lastSeenAt` from the 3 per-seat synced fields; add a `heartbeats` merge that preserves the local player's own entry | implementer-a |
| `src/modules/game-board/game-board.staleness.hook.ts` | edit | `findStalePeerIds` takes the whole `GameState` (or `heartbeats` alongside `players`) and reads `gameState.heartbeats[player.id]` instead of `player.lastSeenAt` | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts` | edit | line 50: read `serverGameState.heartbeats[livePlayer.id] ?? null` instead of `livePlayer.lastSeenAt` | implementer-b |
| `src/modules/game-board/game-board.state.map.test.ts` | edit | update fixtures/assertions for the new `heartbeats`-based sync | tester-a |
| `src/modules/game-board/game-board.staleness.hook.test.ts` | edit | rewrite `createPlayer`/`createGameState` fixtures and every `lastSeenAt`-based case to set `heartbeats` on the game state | tester-a |
| `src/modules/game-board/game-board.state.hook.test.ts` | edit | update `createGameState`/assertions at lines ~136-144, ~170 to use `heartbeats` | tester-a |
| `src/modules/game-board/game-board.session.hook.test.ts` | edit | drop `lastSeenAt: null` from fixture (mechanical) | tester-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.test.ts` | edit | rewrite `createPlayer`/`mockUseGameBoard` to drive `serverGameState.heartbeats` instead of `Player.lastSeenAt` | tester-a |
| `src/modules/map/components/TileBoats/TileBoats.test.tsx` | edit | drop `lastSeenAt: null` from the Player fixtures (mechanical) | tester-b |
| `src/modules/map/components/TileResources/TileResources.test.tsx` | edit | drop `lastSeenAt: null` from the Player fixture (mechanical) | tester-b |
| `docs/architecture/systems-and-visuals.md` | edit | update §6.10 (line 83), Heartbeat/Staleness/Connection Warning/Converted Seats/Seat Reclaim bullets (lines 163,164,166,168,169) to describe `GameState.heartbeats` and the plain `updateDoc` write | docs-sync |

**Grep coverage (every `lastSeenAt` hit, fix or leave):**
- Fixed: all files listed above.
- Left unchanged (verified accurate without edit): `ConnectionWarningDialog.map.ts` (pure fn signature/body unchanged), `ConnectionWarningDialog.map.test.ts` (tests that same unchanged signature), `ConnectionWarningDialog.types.ts` (doc comment still accurate), `docs/ai/lessons-learned.md` (historical entry still accurate — see Decisions), `docs/architecture/structure-and-state.md` (mentions the heartbeat *files*, not the `lastSeenAt` field), every `docs/ai/tasks/2026-1*/...` folder (historical task records, never edited retroactively), `firestore.rules` (no reference, verified by grep).
- `.claude/worktrees/**` duplicate hits are stale checkouts from unrelated prior tasks, not part of this change; not touched.

## Contracts
```ts
// src/lib/types/player.ts — remove entirely (no replacement field on Player):
//   lastSeenAt: number | null;
// (and its doc comment, lines 28-30)

// src/lib/types/game.ts — add to GameState, after `players: Player[];`:
export type GameState = {
  // ...unchanged fields...
  players: Player[];
  /** Epoch ms of each human seat's last heartbeat write, keyed by `Player.id` (seat index).
   *  A missing key means no heartbeat yet (equivalent to the old `lastSeenAt: null`); bot seats
   *  never get an entry. Written by `writeHeartbeat` via a single-field-path `updateDoc`, so a
   *  heartbeat write is never version-checked against the rest of the document. Cleared (key
   *  deleted) by `convertSeatToBot` on takeover. */
  heartbeats: Partial<Record<number, number>>;
  // ...unchanged fields continue...
};

// src/modules/game-board/services/game-board.engine.service.ts
// Drop `runTransaction` from the `@/lib/firebase` import (no longer used in this file).
/** Stamps this seat's heartbeat with a single-field-path write, so it is never version-checked
 *  against the rest of the document and cannot collide with a concurrent `saveGameState`/bot-turn
 *  `setDoc`. */
export async function writeHeartbeat(gameId: string, playerIndex: number): Promise<void> {
  const gameDocRef = doc(db, 'games', gameId);
  await updateDoc(gameDocRef, { [`heartbeats.${playerIndex}`]: Date.now() });
}
// Callers (`game-board.heartbeat.hook.ts`, `ConnectionWarningDialog.hook.ts`) are unchanged: same
// (gameId: string, playerIndex: number) => Promise<void> signature.

// src/modules/game-rules/services/player-exit.service.ts
function convertSeatToBot(state: GameState, playerIndex: number): void {
  const seat = state.players[playerIndex];
  pushLogEntry(state, { /* unchanged */ });
  seat.isBot = true;
  seat.isVacant = true;
  delete state.heartbeats[playerIndex]; // was: seat.lastSeenAt = null;
}

// src/modules/game-rules/game-setup.reducer.ts — add one field to the `gameState` literal
// (after `players,` or anywhere else in the object; order doesn't matter):
//   heartbeats: {},

// src/modules/game-board/game-board.staleness.hook.ts
function findStalePeerIds(gameState: GameState, localPlayerId: string | null, now: number): string[] {
  return gameState.players
    .filter((player) => !player.isBot && player.playerId !== localPlayerId)
    .filter((player) => {
      const lastSeenAt = gameState.heartbeats[player.id];
      return lastSeenAt !== undefined && now - lastSeenAt > STALE_THRESHOLD_MS;
    })
    .map((player) => player.playerId);
}
// Call site inside useStalenessCheck's interval callback becomes:
//   findStalePeerIds(latestState, localPlayerId, Date.now())
// (passing the whole snapshot instead of `latestState.players`).

// src/modules/game-board/game-board.state.map.ts
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
      seat.reclaimRequested === serverSeat.reclaimRequested
    ) {
      return seat;
    }
    changed = true;
    return { ...seat, isBot: serverSeat.isBot, isVacant: serverSeat.isVacant, reclaimRequested: serverSeat.reclaimRequested };
  });

  const localSeatId = localGameState.players.find((player) => player.playerId === localPlayerId)?.id;
  const heartbeats = syncedHeartbeats(localGameState.heartbeats, serverGameState.heartbeats, localSeatId);
  if (heartbeats !== localGameState.heartbeats) changed = true;

  return changed ? { ...localGameState, players, heartbeats } : localGameState;
}

/** Every seat's heartbeat from the server, except `localSeatId`'s own (kept from `local` so this
 *  cannot clobber the turn-holder's own in-flight state — same non-clobber rule as the per-seat
 *  fields above). Returns `local` unchanged (same reference) if nothing differs. */
function syncedHeartbeats(
  local: GameState['heartbeats'],
  server: GameState['heartbeats'],
  localSeatId: number | undefined,
): GameState['heartbeats'] {
  const merged: GameState['heartbeats'] = { ...server };
  if (localSeatId !== undefined) merged[localSeatId] = local[localSeatId];

  const keys = new Set([...Object.keys(local), ...Object.keys(merged)]);
  const isSame = [...keys].every((key) => local[Number(key)] === merged[Number(key)]);
  return isSame ? local : merged;
}

// src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts
// Line 50, inside useConnectionWarning, replace:
//   livePlayer.lastSeenAt,
// with:
//   serverGameState.heartbeats[livePlayer.id] ?? null,
// (toConnectionWarningViewModel's signature and every other argument are unchanged.)
```

## Phases
### Phase 1: Move the timestamp off `Player` onto `GameState.heartbeats`; fix the write path
1. tester-a: rewrite `game-board.engine.service.test.ts`'s `writeHeartbeat` describe block to assert the new `updateDoc(gameDocRef, { 'heartbeats.<seat>': <time> })` call and that `runTransaction` is never called; drop the now-unused `runTransaction` import/mock. (sonnet)
2. tester-a: update `player-exit.service.test.ts`'s 3 `lastSeenAt` assertions to assert `heartbeats` instead (the seat's `heartbeats` entry is absent/deleted, not `lastSeenAt: null`). (sonnet)
3. tester-a: drop `lastSeenAt: null` from the two fixtures in `game-board.engine.hook.test.ts` and the one in `game-board.heartbeat.hook.test.ts` (mechanical, no assertion changes).
4. implementer-a: edit `src/lib/types/player.ts` (remove `lastSeenAt`), `src/lib/types/game.ts` (add `heartbeats`), `src/modules/game-board/services/game-board.engine.service.ts` (rewrite `writeHeartbeat`, drop `runTransaction` import), `src/modules/game-rules/game-setup.reducer.ts` (add `heartbeats: {}`). (sonnet)
5. implementer-b: edit `src/modules/game-rules/player-factory.ts` (drop `lastSeenAt: null`), `src/modules/game-rules/services/player-exit.service.ts` (`convertSeatToBot` deletes the `heartbeats` entry), `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` (drop `lastSeenAt: null`). (sonnet)
6. Run `npm run typecheck`, `npm run lint`, `npx jest src/modules/game-board/services/game-board.engine.service.test.ts src/modules/game-rules/services/player-exit.service.test.ts src/modules/game-board/game-board.engine.hook.test.ts src/modules/game-board/game-board.heartbeat.hook.test.ts` scoped to all files touched so far, not just these — i.e. the full `npm run typecheck`/`npm run lint`, plus `npm test` for the whole repo, since Phase 2's untouched consumer files (`game-board.state.map.ts`, `game-board.staleness.hook.ts`, `ConnectionWarningDialog.hook.ts`) will fail to typecheck against the new `Player`/`GameState` shape until Phase 2 lands — record that as an expected, temporary red state, not a Phase 1 blocker.
7. Commit: `fix(game-board): move heartbeat timestamp off Player onto GameState.heartbeats [phase 1/2]`.
8. Stop, ask the user to type `continue`.

Model escalation: steps 1, 2, 4, 5 (sonnet, per triage overrides).

### Phase 2: Update every consumer; docs-sync; final review
1. tester-a: rewrite `game-board.state.map.test.ts`, `game-board.staleness.hook.test.ts`, `game-board.state.hook.test.ts` (update the `createGameState`/assertions around lines 136-144 and 170 to put the reclaimed seat's timestamp in `heartbeats`, not on the `Player`), `game-board.session.hook.test.ts` (mechanical), and `ConnectionWarningDialog.hook.test.ts` (rewrite `createPlayer`/`mockUseGameBoard` to drive `serverGameState.heartbeats`). (sonnet)
2. implementer-a: edit `game-board.state.map.ts` (`withSyncedSeatManagement` + new `syncedHeartbeats`) and `game-board.staleness.hook.ts` (`findStalePeerIds` reads `gameState.heartbeats`).
3. implementer-b: edit `ConnectionWarningDialog.hook.ts` line 50.
4. tester-b: drop `lastSeenAt: null` from the Player fixtures in `TileBoats.test.tsx` and `TileResources.test.tsx` (mechanical).
5. docs-sync: update `docs/architecture/systems-and-visuals.md` — §6.10 (line 83: `withSyncedSeatManagement` copies 3 seat fields, `heartbeats` is a separate top-level sync, not a 4th seat field), the Heartbeat bullet (line 163: plain `updateDoc`, not a transaction), Staleness Check (line 164: `gameState.heartbeats[seat.id]`, not `player.lastSeenAt`), Connection Warning (line 166: reads `serverGameState.heartbeats[seat.id]`), Converted Seats (line 168: the `heartbeats` entry is deleted, not set to `null`), Seat Reclaim (line 169: same wording fix).
6. Run `npm run typecheck`, `npm run lint`, `npm test` (whole repo) — quote the summary lines.
7. Commit: `fix(game-board): read/write GameState.heartbeats in every seat-sync, staleness and connection-warning consumer [phase 2/2]`.
8. architect-b: final review.
9. Stop, ask the user to type `continue` only if further work remains (none expected).

Model escalation: step 1 (sonnet, tester-a override carries to both phases).

## Test plan
- tester-a (logic, first):
  - `writeHeartbeat('game_x', 2)` calls `updateDoc` with `{ 'heartbeats.2': <Date.now() at call time> }` on the `games/game_x` doc ref, and never calls `runTransaction`.
  - `convertSeatToBot` (via `handlePlayerExit`) deletes the converted seat's `heartbeats` entry and leaves other seats' entries untouched.
  - `findStalePeerIds`: a peer with a `heartbeats` entry older than `STALE_THRESHOLD_MS` is stale; a peer with no entry at all is never stale (equivalent to the old `lastSeenAt === null` case); a bot seat and the local seat are never flagged regardless of their entry.
  - `withSyncedSeatManagement`/`syncedHeartbeats`: a reclaimed peer's new `heartbeats` entry flows into the local buffer; the local player's own `heartbeats` entry is preserved from `local`, not overwritten by `server`, even when they differ; returns the same `localGameState` reference when nothing differs (no re-render).
  - `useConnectionWarning`: opens/stays closed based on `serverGameState.heartbeats[seat.id]`, not the buffered `gameState`'s player, reproducing the existing turn-buffer-bug regression test with the new field.
- tester-b (view and e2e): `TileBoats`/`TileResources` fixtures compile and render unchanged (no visible behavior tied to `lastSeenAt` in either). No e2e change — the heartbeat/staleness/warning user-facing behavior is unchanged, already covered by existing e2e specs (none of which construct a raw `lastSeenAt` field directly, per grep).

## Preview states
- None — no `.tsx`/`.styles.ts` file changes; `ConnectionWarningDialog`'s rendered output is unchanged.

## Risks
- A concurrent whole-document `setDoc` (bot-turn completing, `saveGameState`) can still overwrite a `heartbeats` entry written moments earlier by `updateDoc`, if that `setDoc`'s source state was read before the heartbeat landed. This is the same pre-existing, accepted characteristic every other `GameState` field already has in this single-shared-document design (CLAUDE.md's Firestore model) — not a new regression, and self-healing within one more 15 s heartbeat tick, well inside the 45 s staleness threshold.
- `withSyncedSeatManagement`'s `syncedHeartbeats` must not regress the turn-buffer bug documented in `docs/ai/lessons-learned.md:31` (reading a stale buffered value during the local player's own turn). Mitigated by keeping the exact same non-clobber rule (only the local seat's own entry is ever drawn from `local`, every other entry always comes from `server`) and the regression test in `ConnectionWarningDialog.hook.test.ts`.

## Review (architect-b)
VERDICT: APPROVED

Verified every cited path/line against the repo, not just the plan's claims:
- `Player.lastSeenAt` at `src/lib/types/player.ts:30` (doc comment lines 28-29), `GameState.players` at `src/lib/types/game.ts:67` — confirmed, matches.
- `writeHeartbeat` (`game-board.engine.service.ts:49-63`) and `saveGameState` (`:29-32`) — confirmed byte-for-byte against plan's description of the transaction/whole-doc `setDoc` collision.
- `useHeartbeat` (`game-board.heartbeat.hook.ts`), `useConnectionWarning`/`toConnectionWarningViewModel` (`ConnectionWarningDialog.hook.ts:50`, `.map.ts:18-38`), `findStalePeerIds`/`useStalenessCheck` (`game-board.staleness.hook.ts:16-21,33-58`), `withSyncedSeatManagement` (`game-board.state.map.ts`), `convertSeatToBot` (`player-exit.service.ts:13-23`), `createPlayer` (`player-factory.ts`), `initializeGame` (`game-setup.reducer.ts:109-133`), `samplePlayer` (`PlayerInfo.fixtures.ts`), `updateDoc` export (`firebase.ts:79`) — all confirmed exactly as described, including every quoted line number.
- Ran `grep -rln lastSeenAt` over the whole repo (excluding `node_modules`, `.claude/worktrees`): every production/test file hit is listed as an edit owner in the File plan; every doc/historical-task hit is listed in "Grep coverage" as left-unchanged and verified accurate (`ConnectionWarningDialog.types.ts`, `ConnectionWarningDialog.map.ts`/`.map.test.ts`, `docs/ai/lessons-learned.md`, every `docs/ai/tasks/2026-1*` folder, `firestore.rules` — confirmed zero hits in `firestore.rules`). No invented path, no missed hit.
- `docs/architecture/systems-and-visuals.md` line numbers in the File plan and Phase 2 docs-sync step (83, 163, 164, 166, 168, 169) match the actual `lastSeenAt` mentions read in this review.
- Test files tester-a owns (`player-exit.service.test.ts:138,159,168,173,219`, `game-board.state.hook.test.ts:136,144,170`, `game-board.staleness.hook.test.ts`, `game-board.state.map.test.ts`) — line numbers and the scale of rewrite needed match what's actually in those files.

Design: the fix (single-field-path `updateDoc` on a new top-level `heartbeats` map, instead of a transaction touching the whole document) is the simplest change that removes the root cause; the three rejected alternatives in Decisions are each correctly dismissed. Responsibilities split cleanly (reducer/service/map/hook boundaries respected, `component-architecture` rules followed — no view files touched, matches "Preview states: None"). The `syncedHeartbeats` non-clobber rule correctly preserves the existing turn-buffer-bug guard (`lessons-learned.md:31`) by keeping the exact same "only the local seat's own entry is exempt from server sync" pattern as the other three fields. No reindexing of `heartbeats` on the lobby splice path is justified with a verified, reachable-code-path argument (heartbeats only run in `Playing`, splice only runs in `Waiting`), not a speculative addition — correct application of KISS.

Phases are appropriately sized (7-9 files each), tester-first ordering matches the `testing` skill, and Phase 1's explicit acknowledgment that `npm test`/typecheck will show expected temporary red state on Phase 2's untouched consumers is accurate and avoids a false blocker.

No changes requested.
