# Plan: Replace a leaving player with a bot; restrict reconnect to their own match

Status: APPROVED
Inputs: triage.md (including "Open questions — resolved 2026-10-10")

## Goal and acceptance criteria
- [ ] A human leaving an **in-progress** match (`status === 'playing'`), intentionally or by a silently dropped connection, converts their seat to bot control; the match continues for the remaining players without renumbering/removing their seat.
- [ ] A dropped connection with no explicit "Leave Game" click and no `beforeunload` (e.g. the tab crashes, the network dies) is detected within a bounded time via a heartbeat/staleness check, and converts the seat the same way an explicit exit does.
- [ ] Leaving a **pre-game** lobby (`status === 'waiting'`) is unchanged: today's splice/delete behavior, not bot conversion — there is no match in progress to keep alive.
- [ ] If, after a conversion, zero human players remain in the match, the match is deleted immediately (same outcome as today's "no remaining real players" branch), with no grace window.
- [ ] While the match is still in progress, the player who left sees only that match available to rejoin (not the general lobby list of joinable games) until they either reclaim it or it ends.
- [ ] Rejoining that match hands control of the seat back from the bot to the human. If it is currently that seat's (bot) turn, the handoff waits until the bot's turn finishes and happens at the next turn boundary — no mid-turn interruption.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `handlePlayerExit` | `src/modules/game-rules/services/player-exit.service.ts:1-118` (full file read) | Current deletion branches, read exactly: `(isHost && status===Playing) \|\| remainingRealPlayers.length===0 \|\| (isHost && players.length<=1)` → delete (lines 31-38); otherwise splice + renumber every `players`/`baseTiles`/`map.occupants`/`map.positionedBy`/`combatState`/`monsterCombatState` reference (lines 48-107), then `handleEndTurn` if the exiting player was current (lines 99-107). The blanket "host leaves while playing → always delete" branch is itself a bug for this task's purpose (it deletes even with other humans still seated) and must be removed, not just adjusted. |
| `handleEndTurn` | `src/modules/game-rules/player-turn.reducer.ts:34-160` | Rotates `currentPlayerIndex` to the next non-sabotaged player at the top (lines 42-61) *before* doing anything else with the outgoing player. This is the exact seam where a deferred reclaim must apply, because it is the only place "whose turn just ended" is known. |
| `takeBotTurn` | `src/modules/game-rules/services/bot-turn.service.ts:9-16` | Reads the client's already-rendered `GameState`, computes the whole turn with pure `decideBotTurn`, writes once with a plain `setDoc` (not a transaction — pre-existing gap, `docs/ai/functionality-audit.md` point 142, not fixed here). Confirms a bot's turn is one atomic client-side computation + one write: there is no Firestore-visible "mid bot turn" state to interrupt. |
| bot-turn / death-animation triggers | `src/modules/game-board/game-board.engine.hook.ts:91-146` | Both gated on `isHost` (= `localPlayer.id === 0`, line 86-89). **Bug this task must fix**: once any seat (including seat 0) can become a bot mid-match, if the literal seat-0 human disconnects, no remaining client has `isHost === true`, so bot turns never fire and death animations never clear for the rest of the match. Needs a separate "lowest still-human seat" driver concept, not a reuse of `isHost` (which other code also depends on for its literal "seat 0" meaning, see next row). |
| `isHost` usages elsewhere | `src/modules/game-board/game-board.session.hook.ts:49-62`, threaded through `game-board.hook.ts:17,97-153` and the `*.types.ts` files that declare it | `isHost` only ever means "my seat is 0" today, used to pick which exit-confirmation dialog to show. No broader "crown"/host-privilege usage found in `src/modules/game-board` (grep). Leave this meaning untouched; introduce a new, separately-named concept for "who drives bot turns/cleanup," scoped to `game-board.engine.hook.ts` only. |
| `useGameEngine` | `src/modules/game-board/game-board.engine.hook.ts:9-149` | Owns `gameId`, `gameState`, `localPlayer`, `isHost`, and the only two host-gated effects. This is where the new heartbeat-write and staleness-check hooks get composed in (not into the legacy `GameBoard.tsx` caller), so no legacy wiring edit is needed beyond what's already there. |
| `game-board.engine.service.ts` | `src/modules/game-board/services/game-board.engine.service.ts:1-38` | 38 lines; already has `subscribeToGameState`/`saveGameState`/`clearDeathAnimations` — a good home for the new `writeHeartbeat`, not a new file. `clearDeathAnimations` writes the whole `deathAnimations` array via a plain `updateDoc`, but `players` is a real array (`GameState.players: Player[]`, `game.ts:53`) — Firestore's dotted `updateDoc` path syntax only addresses nested map fields, never array indices, so `writeHeartbeat` cannot copy that pattern literally; it needs `runTransaction` reading and rewriting the whole `players` array (see Contracts). |
| `Player` type | `src/lib/types/player.ts:19-41` | `isBot: boolean` already exists, set once by `player-factory.ts`'s `createPlayer` and never toggled elsewhere (grep confirms the only writer is `createPlayer`). Needs three new fields (below). This file is under `LEGACY_PATHS` (`src/lib/**`, `eslint.config.mjs:14`) — unlinted, but still typechecked; editing it is the "minimal legacy edit" CLAUDE.md allows for new domain fields. |
| `createPlayer` | `src/modules/game-rules/player-factory.ts:5-52` | Single place that constructs a `Player`; the three new fields' defaults go here. |
| `Lobby.hook.ts` / `Lobby.tsx` / `Lobby.types.ts` | `src/modules/lobby/components/Lobby/*` | `useLobby` only subscribes to `status === 'waiting'` games (`lobby.service.ts:10-32`) — a player with a vacant seat in a `playing` match has no existing path to even see it. `LobbyView` (`Lobby.tsx:1-137`, already 137 lines) renders `leftColumn`/`rightColumn` unconditionally inside `CardContent`; adding the "only your match" branch here would push it over the 150-line lint cap, so the new UI is its own component, not inlined. |
| `lobby.service.ts` | `src/modules/lobby/services/lobby.service.ts:1-82` | `joinOpenGame`'s transaction and `subscribeToOpenGames`'s query are the patterns the new `subscribeToVacantSeat` reuses (same file, 82/150 lines, room to add). |
| Firestore rules | `firestore.rules:60-90` | `isGameParticipant` only checks the writer's `auth.uid` is one of the four seats; there is no per-field restriction, so **any** seated participant (not just the literal host) can legally write a conversion for a different seat's `isBot`/`lastSeenAt` fields. This is what makes a broadcast-style (every client) staleness check and conversion safe at the rules layer. |
| `usePlayerProvider` / `AuthAccount` | `src/modules/session/player.hook.ts:1-174`, `src/modules/session/services/account.service.ts:1-89` | **Supersedes this task's original "same-device localStorage playerId" assumption** — see Scope/Decisions below. |

## Scope — reconciled with `2026-10-09-persistent-account-auth` (shipped, see its `progress.md`, all 4 phases committed)
That task replaced the old localStorage-generated `playerId` with `account.uid`, the Firebase Auth uid (`player.hook.ts:20`): every client, guest or signed-in, now has a Firebase Auth session (anonymous or Google) before it can do anything, and `Player.playerId` throughout `game-rules` is this uid.
- **Google-signed-in players already have a durable, cross-device `playerId`**: signing in with the same Google account on any device reproduces the same uid. This task's reconnect-matching needs no extra plumbing for that case — it already works by simply keying off `usePlayer().playerId` as before, just with a now-durable value. The original plan's "Out: cross-device reconnect needs `persistent-account-auth`" caveat is stale and is removed.
- **Anonymous guests remain device/session-scoped**, same practical limitation as before, just via Firebase Anonymous Auth's local persistence instead of a hand-rolled localStorage id. A guest who clears site data, or switches browsers, gets a new uid and cannot be matched back to their vacant seat — unchanged limitation, still out of scope to fix.
- **Known, explicitly out-of-scope edge case**: a guest who signs in with Google *while* holding a vacant seat gets a *different* uid (`account.service.ts` does not link anonymous→Google credentials) and cannot reclaim that seat under either identity. Not fixed here — see "Known limitations" below for the user-facing flag.
- In: `handlePlayerExit` behavior for in-progress matches only (flip the seat to `isBot: true` + `isVacant: true`, no splice/renumber); a `lastSeenAt` heartbeat + periodic client-side staleness check that converts a silently-dropped seat the same way; a "driver" concept so bot-turn/animation responsibility survives the literal seat-0 player disconnecting; lobby restriction to a player's own vacant-seat match; the reclaim action, deferred to the next turn boundary if it's currently that seat's turn.
- Out (unchanged from triage): account linking/merging identities, spectator mode, allowing a reconnecting player to only watch.
- Out (new, found during this pass): a real backend staleness job. There is no Cloud Functions / server component in this app (`firebase.json` only configures client-SDK-facing Firestore/Auth emulators) — the staleness check is necessarily client-triggered, run by whichever human clients happen to be open. If every human client for a match closes simultaneously, no staleness check runs until one of them reopens the tab. This is an accepted limitation of a serverless client app, not a bug to fix here.

## Decisions
- **New `Player` fields** (all default to "not vacant/never a vacancy" for both humans and original setup bots):
  - `isVacant: boolean` — true only when `isBot` was set `true` because a human's seat was converted (exit or staleness timeout); false for a seat that was a bot from match setup. This is what makes a seat reclaimable and what the lobby restriction and reclaim service key on, distinct from "is currently bot-controlled" in general.
  - `lastSeenAt: number | null` — epoch ms, written by the seated human's own client on a heartbeat. `null` for bot seats and for a human who hasn't sent a heartbeat yet (first render).
  - `reclaimRequested: boolean` — true when the departed human has asked to reclaim a seat that is *currently the active turn*; applied (flips `isBot`/`isVacant` off, clears itself) by `handleEndTurn` the moment that turn ends, never mid-turn.
  - Rejected: a single `vacatedByPlayerId` field (original draft) — redundant, since the seat's own `playerId` never changes on conversion; a boolean `isVacant` says everything needed about who may reclaim it (the seat's existing `playerId`) and whether it's eligible at all.
- **`handlePlayerExit` splits its behavior by `status`, not by `isHost`**: `status !== 'playing'` keeps today's splice/delete logic completely unchanged (pre-game exits don't need bot takeover). `status === 'playing'` is new: delete only if `remainingRealPlayers.length === 0` after this exit (today's check, reused as-is); otherwise set `isBot = true`, `isVacant = true` on the exiting player, keep their `id`/data in place, run `handleEndTurn` only if it was their turn (same check as today, just without any renumbering). The old `isHost && status === 'playing'` blanket-delete branch is removed entirely — it contradicts this task's whole premise for the host's own seat.
  - Rejected: keeping a host-specific deletion rule — nothing about *this* task's resolved scope singles out the host; "last human leaves → delete" already covers the host-is-last-human case.
- **Staleness detection is broadcast, not single-driver**: every connected human client, on its own timer, scans `gameState.players` for any `!isBot` seat other than its own (`playerId !== localPlayer.playerId` — a client must never evaluate its own staleness off a Firestore snapshot that lags its own clock) whose `lastSeenAt` is older than `STALE_THRESHOLD_MS`, and calls `handlePlayerExit(gameId, thatPlayer.playerId)` for each one found.
  - This must be broadcast (not gated to a single "driver") because the literal lowest-id player going stale is exactly the case a single-driver design (e.g. "lowest non-bot id runs the check") fails to detect: if seat 0 is the one that went dark, a "lowest non-bot id" driver computed *before* conversion is seat 0 itself — the client that no longer exists. Every client must independently watch its peers.
  - This is safe to broadcast because `handlePlayerExit` writes through `runTransaction` (atomic, retries on conflict): two clients racing to convert the same stale seat is a harmless double-write once `handlePlayerExit` is given an idempotency guard (see Contracts) — Firestore serializes the two transactions, and the second sees the seat already converted.
  - Rejected: gating the staleness check the same way as bot-turn-triggering (below) — tried and found to reintroduce the exact "nobody detects seat 0 going dark" bug (see Verified context row 3).
- **Bot-turn-triggering and death-animation-clearing need a "driver" concept distinct from `isHost`**, because they are *not* transactional (`takeBotTurn`'s plain `setDoc`, `clearDeathAnimations`'s plain `updateDoc`) — unlike staleness detection, broadcasting these to every client risks two clients computing against different `gameState` snapshots and racing a stale overwrite onto a newer one. Keep these single-driver, but redefine the driver as "the lowest player `id` whose `isBot` is currently `false`" (not literal seat 0) — this is correct for the post-conversion state (the only state these two effects ever act on: a bot-driven turn or an animation that needs clearing both only exist once the responsible human, if any, is already known to be present or already-converted) and survives seat 0 itself becoming a bot.
  - This is a one-line swap at the two existing `useEffect`s in `game-board.engine.hook.ts`, not a change to the `isHost` value itself, which keeps its literal seat-0 meaning for the exit-dialog-choice usage in `game-board.session.hook.ts`.
- **Reclaim mid-turn defers, it doesn't interrupt**: the reclaim service checks `currentState.currentPlayerIndex === playerIndex`. If true (it's that bot's active turn), it sets `reclaimRequested = true` only — does not flip `isBot` yet, so the in-flight (or about-to-run) bot turn computation is unaffected. If false, it flips `isBot = false`, `isVacant = false` immediately. `handleEndTurn` then checks the *outgoing* player (the one whose turn just ended, read before rotating `currentPlayerIndex`) for `isVacant && reclaimRequested` and applies the flip there, in the same reducer pass that ends their turn — guaranteeing "transfers only at the next turn boundary" with no extra synchronization.
- **Lobby restriction is UI-level only**, matching the literal acceptance criterion ("sees only that match... in the lobby"): it hides the create/join UI and shows a rejoin panel instead. It adds no Firestore-rules or service-layer block, but none is needed: there is no `/game/[id]` route or any other direct-URL path to a match in this app (`src/app/page.tsx` holds the active game only in root-level `useState`, see Risks), and `handleJoinGame`/`joinOpenGame` already require a `waiting`-status game, which a reconnecting player's own match (status `playing`) never is. Verified complete, not an accepted gap.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/player.ts` | edit (legacy, minimal) | Add `isVacant: boolean`, `lastSeenAt: number \| null`, `reclaimRequested: boolean` to `Player`. | implementer-a |
| `src/modules/game-rules/player-factory.ts` | edit | Default all three new fields in `createPlayer`'s returned object. | implementer-a |
| `src/modules/game-rules/services/player-exit.service.ts` | edit (large simplification, sonnet) | Split by `status`: unchanged splice/delete path for `waiting`; new convert-or-delete path for `playing` per Decisions. Add the idempotency guard (no-op if the target seat is already `isBot`). | implementer-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit (sonnet) | `handleEndTurn`: before rotating, check the outgoing player for `isVacant && reclaimRequested`; if set, clear `isBot`/`isVacant`/`reclaimRequested` and push a log entry, in the same pass. | implementer-a |
| `src/modules/game-rules/services/player-reclaim.service.ts` | new | `handleSeatReclaim(gameId, playerId)`: transaction finds the seat where `playerId` matches and `isVacant === true`; no-op/throws if not found or already reclaimed by someone else's id; immediate flip or `reclaimRequested = true` per Decisions. | implementer-a |
| `src/modules/game-rules/index.ts` | edit | Export `handleSeatReclaim`. | implementer-a |
| `src/modules/game-board/services/game-board.engine.service.ts` | edit | Add `writeHeartbeat(gameId, playerIndex)`: `runTransaction` reading the doc, writing back the whole `players` array with only that index's `lastSeenAt` changed (per the corrected Contracts below — `updateDoc` cannot address an array element by dotted index path). | implementer-a |
| `src/modules/game-board/game-board.heartbeat.hook.ts` | new | `useHeartbeat({ gameId, localPlayer, status })`: while `status === 'playing'` and `localPlayer` exists and is not a bot, calls `writeHeartbeat` every `HEARTBEAT_INTERVAL_MS`. | implementer-a |
| `src/modules/game-board/game-board.staleness.hook.ts` | new (sonnet) | `useStalenessCheck({ gameId, gameState })`: every `STALENESS_CHECK_INTERVAL_MS`, scans peers (excluding self) for `!isBot && lastSeenAt` older than `STALE_THRESHOLD_MS`, calls `handlePlayerExit` for each. Must read the latest `gameState` via a ref at tick time, not restart its interval on every snapshot (same pattern already used for `gameStateRef` in `game-board.engine.hook.ts:100-103`). | implementer-a |
| `src/modules/game-board/game-board.engine.hook.ts` | edit | Compose `useHeartbeat` and `useStalenessCheck`. Add a local (not exported) `isSessionDriver` memo — lowest player `id` with `isBot === false` — and use it in place of `isHost` only for the bot-turn-trigger and death-animation-clearing effects. `isHost` itself (returned value) is untouched. | implementer-a |
| `src/modules/lobby/services/lobby.service.ts` | edit | Add `subscribeToVacantSeat(playerId, onMatch, onError)`: queries `status === 'playing'`, filters client-side for a seat where `playerId` matches and `isVacant === true`, calls back with that `GameState` or `null`. | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.ts` | edit | Subscribe to `subscribeToVacantSeat`; expose `vacantMatch`, `isReclaiming`, `onReclaimSeat` (calls `handleSeatReclaim` then `onJoinGame`). | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.types.ts` | edit | Add the three fields above to `LobbyViewModel`. | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.tsx` | edit | When `model.vacantMatch` is set, render `RejoinMatchPanel` instead of `leftColumn`/`rightColumn`; header (greeting/logout) unchanged. Also gate the existing `<CreateGameDialog>` render (`Lobby.tsx:130`, currently unconditional) behind `!model.vacantMatch`, or force-close it (`onCreateDialogChange(false)`) when `vacantMatch` becomes set — otherwise a dialog already open at the moment a seat goes vacant keeps the create-game flow reachable. | implementer-b |
| `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.tsx` | new | Pure view: match name, "your seat is bot-controlled" message, "Resume Command" button, loading state while reclaiming. | implementer-b |
| `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.styles.ts` | new | Classes for the panel. | implementer-b |
| `src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.types.ts` | new | Props type (below). | implementer-a |
| `src/modules/lobby/components/RejoinMatchPanel/index.ts` | new | Public export. | implementer-b |

## Contracts
```ts
// src/lib/types/player.ts — add to the existing Player type
export type Player = {
  // ...existing fields unchanged
  isBot: boolean;
  /** True only when `isBot` became true because a human's seat was converted (exit or
   *  staleness timeout), not because it was a bot from match setup. Governs reclaim eligibility. */
  isVacant: boolean;
  /** Epoch ms of this seat's last heartbeat write. Null for bot seats and for a human who
   *  hasn't sent one yet. */
  lastSeenAt: number | null;
  /** True while a reclaim is pending because it's currently this seat's (bot) turn. Applied,
   *  and cleared, by handleEndTurn the moment that turn ends. */
  reclaimRequested: boolean;
};

// src/modules/game-rules/services/player-exit.service.ts — behavior contract, signature unchanged
// handlePlayerExit(gameId: string, playerId: string): Promise<void>
// - status !== 'playing': unchanged splice/delete behavior (today's code).
// - status === 'playing':
//   - no-op if the target seat is already isBot (idempotency guard for racing staleness checks
//     and a doubled explicit-exit click).
//   - delete the match if, after removing this player from consideration, remainingRealPlayers.length === 0.
//   - otherwise: target.isBot = true; target.isVacant = true; if it was their turn, handleEndTurn(state).
//   - never splices players/baseTiles/map/combatState; no renumbering.

// src/modules/game-rules/services/player-reclaim.service.ts — new
export async function handleSeatReclaim(gameId: string, playerId: string): Promise<void>;
// Transaction: find players[i] where playerId matches AND isVacant === true.
// - Not found (no such vacant seat, or already reclaimed): no-op (resolves without writing).
// - currentState.currentPlayerIndex === i: set players[i].reclaimRequested = true only.
// - else: players[i].isBot = false; players[i].isVacant = false.

// src/modules/game-rules/player-turn.reducer.ts — handleEndTurn, signature unchanged
// Before rotating currentPlayerIndex, read outgoing = state.players[state.currentPlayerIndex].
// If outgoing.isVacant && outgoing.reclaimRequested:
//   outgoing.isBot = false; outgoing.isVacant = false; outgoing.reclaimRequested = false;
//   pushLogEntry(state, { category: 'system', message: `${outgoing.name} has reclaimed their seat.`,
//     playerId: outgoing.playerId, isPassive: true });
// (Then proceed with today's rotation/skip-sabotaged/collection/win-check logic, unchanged.)

// src/modules/game-board/services/game-board.engine.service.ts — add
export async function writeHeartbeat(gameId: string, playerIndex: number): Promise<void>;
// `players` is a real array (GameState.players: Player[]) — Firestore's dotted updateDoc path only
// traverses nested maps, never array indices, so `{ 'players.N.lastSeenAt': ... }` is invalid and
// cannot be used (corrects the earlier draft of this contract). Instead, runTransaction(db, async (tx) => {
//   const snap = await tx.get(gameDocRef); if (!snap.exists()) return;
//   const state = snap.data() as GameState;
//   if (!state.players[playerIndex]) return;
//   state.players[playerIndex].lastSeenAt = Date.now();
//   tx.set(gameDocRef, state);
// }) — same read-modify-write-whole-array shape as clearDeathAnimations, but transactional (not a
// plain updateDoc) because two players' heartbeats can land in the same tick and a transaction is
// what makes the second write apply on top of the first's result instead of clobbering it.

// src/modules/game-board/game-board.heartbeat.hook.ts — new
export const HEARTBEAT_INTERVAL_MS = 15_000;
export function useHeartbeat(args: {
  gameId: string;
  localPlayer: Player | null; // from @/lib/types
  status: GameStatus | undefined; // from @/lib/types
}): void;
// No-op unless status === 'playing' && localPlayer && !localPlayer.isBot.
// setInterval(HEARTBEAT_INTERVAL_MS) calling writeHeartbeat(gameId, localPlayer.id); clears on unmount
// or when gameId/localPlayer.id/status change. An initial heartbeat fires immediately on mount, not
// only after the first interval tick (so a reconnect's lastSeenAt isn't stale for up to 15s).

// src/modules/game-board/game-board.staleness.hook.ts — new
export const STALE_THRESHOLD_MS = 45_000;
export const STALENESS_CHECK_INTERVAL_MS = 20_000;
export function useStalenessCheck(args: { gameId: string; gameState: GameState | null }): void;
// No-op unless gameState && gameState.status === 'playing'.
// Keeps a ref to the latest gameState (updated by a cheap effect keyed on gameState, mirroring the
// existing gameStateRef pattern in game-board.engine.hook.ts) so the setInterval itself only
// depends on [gameId, gameState?.status, localPlayerId] and doesn't restart every snapshot.
// On each tick, needs this client's own playerId to exclude itself — accept it as
// `localPlayerId: string | null` in args (resolved by the caller from gameState.players, not
// re-derived inside this hook).
// For each p in gameStateRef.current.players where !p.isBot && p.playerId !== localPlayerId
//   && p.lastSeenAt !== null && (Date.now() - p.lastSeenAt) > STALE_THRESHOLD_MS:
//     handlePlayerExit(gameId, p.playerId) — fire and forget each, log (don't throw) on failure.

// src/modules/game-board/game-board.engine.hook.ts — edit, no exported signature change
// Add (not exported, internal only):
//   const isSessionDriver = useMemo(() => {
//     if (!gameState) return false;
//     const lowestActiveId = gameState.players.reduce<number | null>(
//       (lowest, p) => (p.isBot ? lowest : lowest === null ? p.id : Math.min(lowest, p.id)),
//       null,
//     );
//     return lowestActiveId !== null && lowestActiveId === localPlayer?.id;
//   }, [gameState, localPlayer]);
// Replace `isHost` with `isSessionDriver` in the bot-turn-trigger effect's condition (line ~137) and
// the death-animation-clearing effect's condition (line ~109). `isHost` itself (the returned field)
// is untouched. Compose `useHeartbeat({ gameId, localPlayer, status: gameState?.status })` and
// `useStalenessCheck({ gameId, gameState, localPlayerId: playerId })` (the hook's own `playerId` param).

// src/modules/lobby/services/lobby.service.ts — add
export function subscribeToVacantSeat(
  playerId: string,
  onMatch: (match: GameState | null) => void,
  onError: (error: Error) => void,
): () => void;
// query(collection(db,'games'), where('status','==', GameStatus.Playing)); filter client-side for
// games.some(g => g.players.some(p => p.playerId === playerId && p.isVacant)); call onMatch with
// the first match found (a player can only ever hold one vacant seat) or null.

// src/modules/lobby/components/Lobby/Lobby.types.ts — add to LobbyViewModel
vacantMatch: GameState | null;
isReclaiming: boolean;
onReclaimSeat: () => Promise<void>;

// src/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.types.ts — new
export type RejoinMatchPanelProps = {
  game: GameState; // from @/lib/types
  isReclaiming: boolean;
  onReclaim: () => void;
};
```

## Phases

### Phase 1: bot takeover on exit (in-progress matches only)
1. Add `isVacant`, `lastSeenAt`, `reclaimRequested` to `Player`; default them in `createPlayer`. (implementer-a)
2. Rewrite `handlePlayerExit`'s `status === 'playing'` branch per Decisions/Contracts; leave the `status !== 'playing'` branch byte-for-byte as today. **Sonnet.** (implementer-a)
3. tester-a: `handlePlayerExit` — host leaves mid-game with other humans present → conversion, not deletion; non-host leaves → conversion; last human leaves → deletion; pre-game (`waiting`) exit → unchanged splice behavior (characterization test against today's behavior); double-exit / already-`isBot` target → no-op guard fires, no duplicate log entry.
4. `npm run typecheck && npm run lint && npm test`.
5. Commit. Stop and ask the user to type `continue`.

### Phase 2: heartbeat and staleness detection (disconnect, not just explicit exit)
1. `writeHeartbeat` in `game-board.engine.service.ts` (transactional read-modify-write of the whole `players` array, not a dotted-path `updateDoc` — see Contracts); `useHeartbeat` hook. (implementer-a)
2. `useStalenessCheck` hook, calling `handlePlayerExit` for stale peers. **Sonnet** (the self-exclusion and ref-based-interval correctness matter, see Decisions). (implementer-a)
3. `game-board.engine.hook.ts`: add `isSessionDriver`, swap it into the two existing host-gated effects; compose the two new hooks. (implementer-a)
4. tester-a: `useHeartbeat` writes on the expected interval, not when `status !== 'playing'` or `localPlayer.isBot`; `useStalenessCheck` calls `handlePlayerExit` only for stale, non-self, non-bot peers, never for itself even if its own `lastSeenAt` is momentarily behind; `isSessionDriver` picks the lowest non-bot id, including when id 0 is already a bot.
5. `npm run typecheck && npm run lint && npm test`.
6. Commit. Stop and ask the user to type `continue`.

### Phase 3: reconnect-and-reclaim
1. `handleEndTurn`'s deferred-reclaim check. **Sonnet** (turn-boundary timing). (implementer-a)
2. `handleSeatReclaim` service + `game-rules` export. (implementer-a)
3. `subscribeToVacantSeat` in `lobby.service.ts`; wire into `Lobby.hook.ts`/`Lobby.types.ts`. (implementer-a)
4. `RejoinMatchPanel` component (all files) + `Lobby.tsx` conditional render, including gating/force-closing `<CreateGameDialog>` when `vacantMatch` is set (see File plan). (implementer-b)
5. tester-a: `handleSeatReclaim` — immediate flip when it's not the seat's turn; sets `reclaimRequested` and does *not* flip `isBot` when it is; rejects/no-ops for a seat that isn't vacant or doesn't belong to `playerId`. `handleEndTurn` applies a pending `reclaimRequested` exactly when that player's turn ends, never earlier.
6. tester-b: `RejoinMatchPanel` view test (renders match name, disables button while reclaiming); `Lobby` view test (shows the panel instead of create/join UI when `vacantMatch` is set, and that `CreateGameDialog` cannot be opened/stays closed while it is set). E2E (`e2e/`, outside `LEGACY_PATHS` additions only — new spec file, not an edit to a listed legacy spec): a two-player match, one player exits mid-game, a bot visibly takes its next turn, that player's lobby view shows only the rejoin option, reclaiming hands control back and the match continues.
7. preview-a: `RejoinMatchPanel.preview.tsx` — default state, reclaiming/disabled state.
8. UI check (`ui-verify`) of the rejoin panel.
9. `npm run typecheck && npm run lint && npm test`; `npm run test:e2e -- e2e/<new spec>.spec.ts` if a Java 21 runtime is available in the environment (note if skipped, as Phase 4 of `persistent-account-auth` did).
10. Commit.

## Test plan
- tester-a: all `handlePlayerExit` branches (Phase 1); `useHeartbeat`/`useStalenessCheck`/`isSessionDriver` (Phase 2); `handleSeatReclaim` and `handleEndTurn`'s deferred-reclaim (Phase 3). Every case listed under each phase's step above.
- tester-b: `RejoinMatchPanel` and `Lobby` view tests (Phase 3); E2E covering exit → bot turn → rejoin restriction → reclaim → human control resumes (Phase 3). No separate E2E for the heartbeat/staleness path (a real dropped connection isn't simulable in Playwright without a flaky fixed-sleep test; covered by tester-a's unit tests against `STALE_THRESHOLD_MS` instead).

## Preview states
- `RejoinMatchPanel.preview.tsx`: default (not reclaiming), reclaiming (button disabled/loading).
- No other new preview surfaces — Phase 1 and 2 are logic-only, no new UI.

## Risks
- Removing `handlePlayerExit`'s renumbering logic changes invariants other code may assume (e.g. "player count only shrinks," "`id` is always contiguous 0..n-1"). Regression-test beyond the new-behavior cases: existing combat-state/baseTiles tests that exercise the old splice path must still pass unchanged for `waiting`-status exits.
- `takeBotTurn` and `clearDeathAnimations` are plain (non-transactional) writes — the `isSessionDriver` single-driver design is required *because* of this pre-existing gap (functionality-audit point 142), not fixed by this task. If that gap is ever fixed by making those writes transactional, the driver-gating could potentially be relaxed to broadcast too, but that's a future task's call.
- `writeHeartbeat` must be transactional (see Contracts) precisely because two different players' clients can write a heartbeat for their own seat in the same window; a plain whole-array `updateDoc`/`setDoc` built from a stale local snapshot would silently drop the other player's concurrent `lastSeenAt` update (or any other concurrent game-state write). Implementer-a must not simplify this to a non-transactional write for convenience.
- Lobby restriction is UI-only, but this is verified complete, not a hedge: `src/app` has no `/game/[id]` route (confirmed via `find src/app`), and `src/app/page.tsx:8-31` holds the active game only in a root-level `useState<string | null>`, never a URL param — there is no way to navigate directly to a game by URL in this app today, so there is no bypass to close. This would need revisiting only if a shareable game URL is ever added later.
- `HEARTBEAT_INTERVAL_MS` (15s) / `STALE_THRESHOLD_MS` (45s) / `STALENESS_CHECK_INTERVAL_MS` (20s) are first-guess values, not derived from any existing game-design doc number — chosen so a tab backgrounded by the browser (which throttles `setInterval`, not `beforeunload`) has slack before being wrongly converted. Revisit if real play shows them too eager or too slow.

## Known limitations (confirm with the user before building)
- **No backend fallback if every human client for a match closes before staleness is detected.** This app has no Cloud Functions or other server component (`firebase.json` only configures client-SDK-facing Firestore/Auth emulators) — the staleness check is necessarily client-triggered, run by whichever human clients happen to be open. If every human client closes simultaneously, the match sits with a human's seat silently un-converted until someone reopens a tab on it. A real backstop would mean adding Cloud Functions (new infrastructure), not an extension of this plan.
- **A guest who signs in with Google while holding a vacant seat permanently loses it.** `account.service.ts` has no anonymous→Google credential linking (confirmed by grep: no `linkWithCredential` anywhere in the codebase), so switching from a guest session to a Google account produces a different `playerId` (uid) than the one recorded on the vacant seat — neither identity can reclaim it afterward. Accepted as out of scope per this task's reconciled Scope (account linking is explicitly excluded), but the user should know this before it ships: a disconnected guest who later signs in with Google to try to get back in will not recover their seat.

## Review (architect-b)

Round 1 (2026-10-10): CHANGES REQUESTED — `writeHeartbeat`'s contract used an invalid Firestore dotted-array-index path; the lobby-restriction risk needed verifying against the actual routing instead of being left as a hedge; `CreateGameDialog` needed gating against `vacantMatch`; the anon-to-Google limitation needed its own explicit surface, not just general Risks prose. All four addressed above: `writeHeartbeat` now specifies a `runTransaction` read-modify-write of the whole `players` array (Contracts, File plan, Verified context, Phase 2 step 1, Risks); the direct-URL-bypass risk is replaced with the verified fact that no `/game/[id]` route exists; `Lobby.tsx`'s File plan row and Phase 3 step 4/6 now call out gating/force-closing `CreateGameDialog` when `vacantMatch` is set; a new "Known limitations" section surfaces the no-backend and no-anon-to-Google-linking limitations for the user explicitly, separate from Risks.

Round 2 (2026-10-10): re-checked the four diffs listed by the coordinator plus their ripple effects.
- `writeHeartbeat` Contracts block (lines 121-133): correct — `runTransaction` reads the doc, mutates `state.players[playerIndex].lastSeenAt`, `tx.set`s the whole document back, same shape as `handlePlayerExit`'s existing transactional pattern. Resolves the invalid dotted-array-path finding. Risks (line 240) correctly explains why it must be transactional, not a plain `updateDoc`/`setDoc`.
- Lobby.tsx file-plan row and Phase 3 steps 4/6: `CreateGameDialog` gating/force-close against `vacantMatch` is now specified, with a tester-b assertion added in step 6. Matches the fix requested.
- Risks (line 241) replaces the hedge with the verified fact (no `/game/[id]` route; `activeGameId` is root-level `useState` in `src/app/page.tsx`) — re-verified, still accurate.
- New "Known limitations" section cleanly separates the two user-facing-before-building items (no backend fallback, no anon-to-Google linking) from the general Risks list.
- Found one stale cross-reference while re-checking: Decisions bullet on lobby restriction (around line 55) still said "flag this as an accepted gap in Risks" after Risks itself was corrected to "verified complete" — trivial wording inconsistency, folded in directly (now reads "Verified complete, not an accepted gap" and points at the same evidence).

No new issues found. All four blocking/non-blocking findings from round 1 are resolved in the plan text, and the broadcast-vs-single-driver design and the three previously-flagged limitations remain sound per round 1's analysis (unchanged by this pass's diffs).

VERDICT: APPROVED

