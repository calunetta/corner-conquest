# Plan: Resource collection feedback + farmer-boat reset

Status: APPROVED
Inputs: triage.md, game-design.md (Final spec), ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] A positioned army's resource collection clears its `player.positions`/`tile.positionedBy` entry immediately after crediting the resource, in both `applyAutomaticCollection` and `handleUseProductiveCard`.
- [ ] The local player sees a "Resources collected" toast exactly when a new resource-collection log entry is recorded for them (either path).
- [ ] The local player sees an "Army idle" / "Armies idle" toast at the start of their own turn when at least one of their armies sits on an eligible, un-positioned resource/Base spot.
- [ ] The farmer boat sprite reverts to idle-at-boat for the specific army whose position cleared, even when another of the same player's armies on the same island is still positioned (`TileBoats.map.ts` fix).
- [ ] Bot positioning priority is 6 (tied with fog-exploration), not 9, so a bot with a cleared position still prefers attacking over blindly re-farming, but doesn't permanently abandon a farm for an unrevealed tile.
- [ ] Tutorial copy (`GameBoard.tsx`, `TutorialBeacon.preview.tsx`) describes re-positioning, not "automatically every turn".
- [ ] `docs/architecture/game-mechanics.md` §5.3 and §6.3 reflect the new clear-on-collect rule.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `applyAutomaticCollection` | `src/modules/game-rules/player-turn.reducer.ts:8-31` | Credits positioned armies' resources every turn start; must also clear the position and log `resourcesCollected`. |
| `handleEndTurn` | `src/modules/game-rules/player-turn.reducer.ts:53-181`, call at `:143-151` | Calls `applyAutomaticCollection` only when the incoming player has no Productive card. |
| `handleUseProductiveCard` | `src/modules/game-rules/card-effects.reducer.ts:48-92` (not `handleProductiveCollection` — game-design.md's name was wrong, corrected in Final spec item 1) | The second collection path; must clear positions identically and log `resourcesCollected`. |
| `handleSelectResourceForPosition` | `src/modules/game-rules/resource-position.reducer.ts:5-55` | Unchanged flow for re-positioning; `alreadyPositioned` check (`:29-32`) is per-resource on the tile, already correct for the new rule. |
| `handleMoveAction`'s position-clear block | `src/modules/game-rules/movement.reducer.ts:88-99` | Existing precedent for clearing `player.positions` + `tile.positionedBy` together; new code mirrors this pattern. |
| `applyBotArmyActions`, positioning branch | `src/modules/game-rules/bot-army-actions.reducer.ts:54-65`, priority at `:60` | Priority 9 → 6 (Final spec item 3); inline eligibility check (`:54-57`) duplicates the new shared helper and is replaced by it. |
| `PlayerPosition`, `Island` | `src/lib/types/map.ts:18-23,25-35` | `PlayerPosition` has `armyId`; `Island.positionedBy` has no `armyId`, only `{ playerId, resource }` — confirms the `TileBoats` fix must key off `player.positions`, not add a field to `Island`. |
| `GameState`, `StructuredLogEntry` | `src/lib/types/game.ts:30-39,44-66` | `StructuredLogEntry` gets a new optional `resourcesCollected` field; `GameState` itself is untouched (no new shared/synced field). |
| `pushLogEntry`, `LogEntryInput` | `src/modules/game-rules/log-entry.ts:1-8` | `LogEntryInput = Omit<StructuredLogEntry, 'kind'\|'turn'>` already widens to include the new field with no signature change. |
| `ResourceType`, `getResourceDisplayName` | `src/lib/types/cards.ts:24-29`, `src/modules/shared/resource-display.ts:1-11` | Reuse for toast copy instead of re-deriving capitalized names. |
| `useToast`, `toast`, `toast-store.ts` | `src/modules/shared/use-toast.ts`, `src/modules/shared/toast-store.ts:5,112-148` | `TOAST_LIMIT = 3`; `toast()` already de-dupes identical open title+description+variant (`toast-store.ts:123-125`) — no new dedupe logic needed. |
| `AbilitiesDialog.hook.ts` call-site pattern | `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts:1,15,20` | The toast call-site pattern to follow: `import { useToast } from '@/modules/shared'`, `toast({ title, description })`. |
| `useGameEngine` | `src/modules/game-board/game-board.engine.hook.ts:1-20,106-107` | Owns `gameState`, `localPlayer`, `isMyTurn`, `toast`; the new feedback hook is called here, next to `useStalenessCheck`. |
| `useStalenessCheck` | `src/modules/game-board/game-board.staleness.hook.ts:1-58` | Pattern to follow for a flat, domain-specific hook file wired into `useGameEngine`, not a `components/<Name>/` view. |
| `toTileBoatsViewModel`, `isPositionedOnResource` | `src/modules/map/components/TileBoats/TileBoats.map.ts:72-82` | Currently keys the idle/collecting sprite by `playerId` only (`island.positionedBy`); must key by `armyId` via `player.positions` so a second army on the same island isn't affected by the first one's position clearing. |
| `TileBoats.hook.ts` | `src/modules/map/components/TileBoats/TileBoats.hook.ts:1-17` | Passes `gameState.players` (full `Player[]`, each with `.positions`) into `toTileBoatsViewModel` already — no signature change needed to make the fix. |
| `TileBoats.map.test.ts` | `src/modules/map/components/TileBoats/TileBoats.map.test.ts:96-111,293-307` | "hides idle collector when army is positioned" currently sets `island.positionedBy` but not `player.positions` — must be updated to set both (they're both inputs after the fix); needs a new two-armies-one-island regression test. |
| `COLLECTOR_IDLE_SPRITES`, `buildPlayer` | `TileBoats.map.ts:6-11`, `src/modules/map/board-context.fixtures.ts:23` | `buildPlayer` defaults `positions: []`, confirmed — existing fixtures need explicit `positions` set only where a test exercises the positioned case. |
| `GameLog.map.ts` `filterVisibleEntries` | `src/modules/hud/components/GameLog/GameLog.map.ts:41` | Confirms `isPassive: true` entries stay hidden by default; Final spec item 6 keeps this, so no change here. |
| `player-turn.reducer.test.ts` | `:66-87,89-115,117-133` | Three existing tests assert the old "positions persist" behavior; each must be rewritten to assert clear-on-collect instead of being left contradicting the new rule. |
| `card-effects.reducer.test.ts` | `:106-121,123-133,135-148,150-163` | Four tests assert "positions persist after Productive collection" / "does not clear positionedBy" — same rewrite. |
| `bot-turn.reducer.test.ts` | `:1-21` (`buildBotTurnGame`) | Pattern to copy into the new `bot-army-actions.reducer.test.ts` (no shared export exists today; duplicating this one helper a second time is below the skill's "extract at the third copy" threshold). |
| `GameBoard.tsx` tutorial copy | `src/features/game/components/GameBoard.tsx:42` | Live copy site, must change together with the preview fixture. |
| `TutorialBeacon.preview.tsx` | `src/modules/hud/components/TutorialBeacon/TutorialBeacon.preview.tsx:12` | Testbed fixture copy, same string, must change identically. |
| `game-mechanics.md` | `:40` (§5.3), `:85-86` (§6.3) | Documents today's "collects every turn without re-clicking Position" and "removed only when the army moves/loses/dies" — both wrong after this change; `docs-sync`, same phase. |

## Decisions
- **Shared `resourcesCollected` field on `StructuredLogEntry`** (not a new top-level `GameState` field) carries the structured collection data to the client, because the log is already synced per-entry and already carries `playerId`/`category`/`isPassive`; a new `GameState.pendingCollectionSummary`-style field would be shared/synced state with no multi-player purpose (toasts are local-only) and nothing currently mutates `GameState`'s shape for client-only concerns. Rejected: a new transient `GameState` field (unnecessary Firestore surface for data the log already carries).
- **Detect the collection toast by diffing new log entries** (`findNewCollectionEntries`, keyed off log length seen so far), not by watching the `isMyTurn` transition alone, because `handleUseProductiveCard` resolves asynchronously after a dialog the player interacts with — well after the turn-start transition — so a toast tied only to "isMyTurn just became true" would miss the Productive path entirely. Rejected: toast only on the turn-start transition (game-design's literal wording) — breaks the Productive-card path, which game-design and ui-design both require covering.
- **Detect the idle-farm toast by the `isMyTurn` false→true transition**, computed fresh from current state (`countIdleFarmArmies`), because it has no log entry to diff against — it is the *absence* of a collection. Rejected: deriving it from the log too (no log entry exists for "nothing collected", so there is nothing to diff).
- **Extract `isArmyEligibleToPosition`/`findAvailableResourceSpot` into a new stateless helper** (`src/modules/game-rules/army-position-eligibility.ts`), reused by `bot-army-actions.reducer.ts`'s positioning branch and the new idle-farm counter, because both implement the exact same game rule ("can this army legally position here right now") and must change together if that rule changes. Rejected: duplicate the check in both places (the DRY "must change together" bar is met, not just similar-looking code).
- **Fix `TileBoats.map.ts` to key off `player.positions` (has `armyId`) instead of `island.positionedBy` (has no `armyId`)**, in this phase rather than routing it to a later task, because `toTileBoatsViewModel` already receives full `Player[]` objects (`TileBoats.hook.ts:8-14`) — the fix needs no new data plumbing, is a one-line swap in an already-touched area (triage scope explicitly asks to "confirm in preview" that the boat reverts), and leaving it unfixed would make one of this feature's own two acceptance criteria permanently fail for a normal (not edge-case) board state. Rejected: leave as a documented known gap per the design docs' routing note — over-cautious given the fix is this cheap and self-contained.
- **No change to `Island.positionedBy`'s type** (no new `armyId` field) — the `TileBoats` fix doesn't need it (see above), and `positionedBy` is still needed as-is for the tile-level "is this resource spot occupied" check in `resource-position.reducer.ts` and `bot-army-actions.reducer.ts`.
- **Bot priority set to 6, not 5** — architect-b (game-designer) already caught and fixed this in `game-design.md`'s Final spec item 3; carried through unchanged, cited again here so the implementer doesn't need to re-derive it.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/lib/types/game.ts` | edit | Add `resourcesCollected?: Partial<Record<ResourceType, number>>` to `StructuredLogEntry` | implementer-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit | `applyAutomaticCollection` clears `player.positions`/`tile.positionedBy` per collected spot; adds `resourcesCollected` to its log entry | implementer-a |
| `src/modules/game-rules/card-effects.reducer.ts` | edit | `handleUseProductiveCard` does the same clear + `resourcesCollected` | implementer-a |
| `src/modules/game-rules/army-position-eligibility.ts` | new | Stateless helpers `isArmyEligibleToPosition`, `findAvailableResourceSpot` | implementer-a |
| `src/modules/game-rules/army-position-eligibility.test.ts` | new | Unit tests for the two helpers | tester-a |
| `src/modules/game-rules/bot-army-actions.reducer.ts` | edit | Priority `9`→`6`; positioning branch calls the new shared helper instead of its inline check | implementer-a (sonnet) |
| `src/modules/game-rules/bot-army-actions.reducer.test.ts` | new | Bot priority/eligibility tests (final spec item 9) | tester-a (sonnet) |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | Rewrite the 3 "positions persist" assertions to clear-on-collect; add Productive-path-independent coverage if missing | tester-a (sonnet) |
| `src/modules/game-rules/card-effects.reducer.test.ts` | edit | Rewrite the 4 "positions persist" assertions to clear-on-collect | tester-a (sonnet) |
| `src/modules/game-rules/index.ts` | edit | Export `isArmyEligibleToPosition` | implementer-a |
| `src/modules/game-board/resource-collection-feedback.map.ts` | new | Pure transforms: `findNewCollectionEntries`, `toCollectionToastContent`, `countIdleFarmArmies`, `toIdleFarmToastContent` | implementer-a |
| `src/modules/game-board/resource-collection-feedback.map.test.ts` | new | Unit tests for the 4 pure functions | tester-a |
| `src/modules/game-board/resource-collection-feedback.hook.ts` | new | `useResourceCollectionFeedback`: fires both toasts off `gameState`/`isMyTurn` changes | implementer-a |
| `src/modules/game-board/resource-collection-feedback.hook.test.ts` | new | Hook tests (seed-without-toasting on mount, fires once per new log entry, fires once per turn-start transition) | tester-a |
| `src/modules/game-board/game-board.engine.hook.ts` | edit | Call `useResourceCollectionFeedback({ gameState, localPlayer, isMyTurn, toast })` next to `useStalenessCheck` | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | edit | `isPositionedOnResource` keyed by `player.positions.some(p => p.armyId === armyId)` instead of `island.positionedBy` | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | edit | Update "hides idle collector" fixture to also set `player.positions`; add two-armies-one-island regression test | tester-a |
| `src/features/game/components/GameBoard.tsx` | edit | Tutorial copy line 42: "automatically every turn" → re-positioning wording | implementer-b (legacy wiring) |
| `src/modules/hud/components/TutorialBeacon/TutorialBeacon.preview.tsx` | edit | Same copy change, testbed fixture | preview-a |
| `docs/architecture/game-mechanics.md` | edit | §5.3 (`:40`) and §6.3 (`:85-86`): collect-once-then-clear rule | docs-sync |

## Contracts
```ts
// --- src/lib/types/game.ts (edit) ---
export type StructuredLogEntry = {
  kind: 'structured';
  turn: number;
  category: LogCategory;
  message: string;
  playerId?: string;
  targetPlayerId?: string;
  isMilestone?: boolean;
  isPassive?: boolean;
  /** Set only on the two collection log entries (automatic + Productive-card); lets a client
   *  derive a toast without re-parsing `message`. Never read by GameLog rendering. */
  resourcesCollected?: Partial<Record<ResourceType, number>>;
};

// --- src/modules/game-rules/army-position-eligibility.ts (new) ---
import type { Island, IslandResource, Player } from '@/lib/types';

/** True when `armyId` (one of `player`'s armies) could legally position on `tile` right now:
 *  not already positioned, tile is Resource or Base with resources, no monster present, and at
 *  least one resource spot on it has no `positionedBy` entry yet. */
export function isArmyEligibleToPosition(tile: Island, player: Player, armyId: number): boolean;

/** First resource spot on `tile` with no `positionedBy` entry, or `undefined` if none are open. */
export function findAvailableResourceSpot(tile: Island): IslandResource | undefined;

// --- src/modules/game-rules/player-turn.reducer.ts (edit, same exported signature) ---
// applyAutomaticCollection(state, player): after crediting each positioned army's resource,
// remove that entry from player.positions and the matching entry from tile.positionedBy;
// pushLogEntry(...) gains `resourcesCollected: collectedResources`.

// --- src/modules/game-rules/card-effects.reducer.ts (edit, same exported signature) ---
// handleUseProductiveCard(state, selectedResource): identical clear-after-credit behavior;
// pushLogEntry(...) gains `resourcesCollected: collectedResources`.

// --- src/modules/game-board/resource-collection-feedback.map.ts (new) ---
import type { GameState, Player, ResourceType, StructuredLogEntry } from '@/lib/types';

export interface ToastContent {
  title: string;
  description: string;
}

/** Structured log entries appended since index `sinceIndex` that recorded a resource collection
 *  (`resourcesCollected` present) for `playerId`. */
export function findNewCollectionEntries(
  log: GameState['log'],
  sinceIndex: number,
  playerId: string,
): StructuredLogEntry[];

/** "Collected 2 Food, 1 Gold." toast content for one collection log entry, or null if the entry
 *  carries no resources (defensive; should not happen for an entry `findNewCollectionEntries` returned). */
export function toCollectionToastContent(entry: StructuredLogEntry): ToastContent | null;

/** Count of `player`'s armies sitting on a tile where `isArmyEligibleToPosition` is true. */
export function countIdleFarmArmies(state: GameState, player: Player): number;

/** "Army idle" (count === 1) / "Armies idle" (count > 1) toast content, or null if count === 0. */
export function toIdleFarmToastContent(idleCount: number): ToastContent | null;

// --- src/modules/game-board/resource-collection-feedback.hook.ts (new) ---
import type { GameState, Player } from '@/lib/types';
import type { toast as toastFn } from '@/modules/shared';

export interface ResourceCollectionFeedbackArgs {
  gameState: GameState | null;
  localPlayer: Player | null;
  isMyTurn: boolean;
  toast: typeof toastFn;
}

/** Fires one toast per new resource-collection log entry for `localPlayer` (effect 1, keyed off
 *  `gameState.log` length seen so far — seeds on first render without toasting, so a page
 *  reload mid-match never replays history), and one "idle army" toast the instant `isMyTurn`
 *  transitions false→true with at least one eligible-but-unpositioned army (effect 2). No return
 *  value: side-effect only, mirrors `useStalenessCheck`. */
export function useResourceCollectionFeedback(args: ResourceCollectionFeedbackArgs): void;

// --- src/modules/map/components/TileBoats/TileBoats.map.ts (edit) ---
// Inside toTileBoatsViewModel's occupants.forEach: replace
//   const isPositionedOnResource = (island.positionedBy || []).some((pos) => pos.playerId === player.id);
// with
//   const isPositionedOnResource = player.positions.some((pos) => pos.armyId === armyId);
// (`player` and `armyId` are already in scope from the existing `occupants` destructure.)
```

## Phases
### Phase 1: Clear-on-collect, feedback toasts, bot fix, boat fix, docs
1. Add `resourcesCollected` to `StructuredLogEntry` (`src/lib/types/game.ts`). (implementer-a)
2. Create `army-position-eligibility.ts`; update `bot-army-actions.reducer.ts` to use it and change priority 9→6; export it from `game-rules/index.ts`. (implementer-a, sonnet)
3. Edit `applyAutomaticCollection` (`player-turn.reducer.ts`) and `handleUseProductiveCard` (`card-effects.reducer.ts`) for clear-on-collect + `resourcesCollected`. (implementer-a, sonnet)
4. Create `resource-collection-feedback.map.ts` and `resource-collection-feedback.hook.ts`; wire the hook into `game-board.engine.hook.ts`. (implementer-a)
5. Fix `TileBoats.map.ts`'s `isPositionedOnResource` to key off `player.positions`. (implementer-a)
6. Edit tutorial copy in `GameBoard.tsx` (implementer-b) and `TutorialBeacon.preview.tsx` (preview-a).
7. tester-a (sonnet for the game-rules files, default for the rest): new `army-position-eligibility.test.ts`, new `bot-army-actions.reducer.test.ts`, rewritten assertions in `player-turn.reducer.test.ts` and `card-effects.reducer.test.ts`, new `resource-collection-feedback.map.test.ts` and `.hook.test.ts`, updated `TileBoats.map.test.ts`.
8. tester-b: no new view (`.tsx`) files touched this phase; confirm no e2e spec asserts the old "positions persist" or old tutorial copy (grep `e2e/` for both strings) and update if found.
9. preview-a: confirm `TutorialBeacon.preview.tsx` renders the new copy (no new preview states needed — same component, same props shape).
10. docs-sync: update `docs/architecture/game-mechanics.md` §5.3 (`:40`) and §6.3 (`:85-86`).
11. Run `npm run typecheck`, `npm run lint`, `npm test` on every touched/created file (not scoped to a subdirectory).
12. Check in a browser (`npm run dev` → a live match): position an army, end enough turns to collect, confirm the toast, confirm the boat reverts to idle, confirm re-positioning is required next turn.
13. Run the balance-simulator gate (Final spec item 10): `BALANCE_SIMULATOR_ARGS="--players 2,3,4 --fog on,off --games 200 --seed 1" npm run balance:simulate`, before committing; compare match length (M2) and bot economy/combat frequency against the simulator's documented baseline.
14. Commit, then stop and ask the user to type `continue`.

Model escalation: steps 2, 3, and tester-a's work on `army-position-eligibility.test.ts`, `bot-army-actions.reducer.test.ts`, `player-turn.reducer.test.ts`, `card-effects.reducer.test.ts` run on sonnet (triage override `implementer-a=sonnet, tester-a=sonnet`, and these are the game-rule files the override targets).

## Test plan
- tester-a (logic, first):
  - `army-position-eligibility.test.ts`: eligible (open Resource tile, no monster) → true; already-positioned army → false; monster present → false; all resource spots occupied → false; Base tile with an open spot → true; `findAvailableResourceSpot` returns the first open spot, `undefined` when none.
  - `bot-army-actions.reducer.test.ts` (new file, follow `bot-turn.reducer.test.ts`'s `buildBotTurnGame` pattern): a bot with an attackable player on its tile and an already-cleared position elsewhere prefers attack over re-positioning; a bot with only a cleared, eligible position and no unrevealed tile in range re-positions (confirms the 6-vs-6 tie resolves in favor of the same-army position action, since it's pushed to `possibleActions` before that army's move options); a bot whose only options are re-positioning (priority 6) vs. an unrevealed-tile move (priority 6) re-positions, not wanders off (regression test for game-design finding 1).
  - `player-turn.reducer.test.ts`: rewrite "generates resources... position persists" (`:66-87`) to assert `positions` is now empty and `tile.positionedBy` no longer contains the entry; rewrite "positions persist across two consecutive turns" (`:89-115`) to assert the second turn collects nothing (player must re-position between the two `handleEndTurn` calls to collect again) — rename to reflect the new rule; keep the Productive-dialog test (`:117-133`) asserting positions are *not* touched by `handleEndTurn` itself (only `handleUseProductiveCard` clears them) — already correct, just re-verify after the other edits. Add: the log entry's `resourcesCollected` matches the credited amounts.
  - `card-effects.reducer.test.ts`: rewrite all 4 "positions persist" assertions (`:106-148,150-163`) to assert positions and `tile.positionedBy` clear after `handleUseProductiveCard`; the "no positions at all" boundary test (`:165-174`) is unaffected, re-verify it still passes unchanged. Add: `resourcesCollected` on the pushed log entry matches credited (doubled) amounts.
  - `resource-collection-feedback.map.test.ts`: `findNewCollectionEntries` returns only entries at/after `sinceIndex` matching `playerId` and carrying `resourcesCollected`, ignores string log entries, ignores entries for other players; `toCollectionToastContent` formats one resource ("Collected 2 Food.") and multiple, comma-joined, in insertion order; `countIdleFarmArmies` counts 0 for an army mid-position, 1+ for an eligible-but-unpositioned army on a Resource tile, 0 for an army on a monster-occupied or fully-occupied tile; `toIdleFarmToastContent` singular vs. plural copy, `null` at count 0.
  - `resource-collection-feedback.hook.test.ts`: first render with a non-empty log does not toast (seeds silently); a subsequent `gameState` update adding a matching collection entry toasts once; `isMyTurn` transitioning false→true with one idle army fires the singular toast; two idle armies fires the plural toast with the correct count; `isMyTurn` already true on mount does not fire the idle toast (no false→true transition observed).
  - `TileBoats.map.test.ts`: update "hides idle collector when army is positioned on a resource" (`:96-111`) to set `positions: [{ armyId: 0, resource: Food, x:1, y:1 }]` on a cloned `bluePlayer`, not just `island.positionedBy`; new test: two of the same player's armies on one island, only one has a `positions` entry — only that army's `showIdleCollector` is `false`.
- tester-b (view and e2e): no new `.tsx` this phase; grep `e2e/` for assertions tied to "automatically every turn" or positions persisting indefinitely and update any hit; no new e2e spec required (toast and position-clear are covered by the logic tests above and a manual browser check per phase step 12).

## Preview states
- `TutorialBeacon` (existing preview, copy-only change): `default` state already renders the Position tooltip line; confirm it shows the updated copy, no new state needed.

## Risks
- The idle-farm toast's eligibility check (`isArmyEligibleToPosition`) must match `resource-position.reducer.ts`'s own `alreadyPositioned` semantics exactly, or the toast could fire for a spot a player legitimately cannot reposition on (e.g., every spot already taken by another player) — mitigated by reusing the same open-spot logic via the new shared helper rather than re-deriving it.
- Balance-simulator gate (Final spec item 10) can surface a priority-tuning need after implementation; if match length or bot economy shifts outside baseline, the fix is the priority constant, not a feature revert (game-design.md's own guidance).

## Review (architect-b)
VERDICT: APPROVED

Re-verified every path, symbol, and line number cited in "Verified context" and the File plan against the current tree (not the plan's prose) by reading each file directly:
- `player-turn.reducer.ts:8-31` (`applyAutomaticCollection`), `:53-181`/`:143-151` (`handleEndTurn`) — match.
- `card-effects.reducer.ts:48-92` (`handleUseProductiveCard`) — match; the plan's correction of game-design.md's wrong name (`handleProductiveCollection`) is justified, the real function is confirmed at line 48.
- `resource-position.reducer.ts:5-55` (`handleSelectResourceForPosition`, `alreadyPositioned` check) — match.
- `movement.reducer.ts:88-99` (position-clear-on-move precedent) — match, same splice+filter pattern the new code should mirror.
- `bot-army-actions.reducer.ts:54-65`, priority `9` at line 60, inline eligibility at `:54-57` — match exactly, including the inline `availableResource`/`monsterOnTile` logic the new helper replaces.
- `src/lib/types/map.ts:18-23` (`PlayerPosition` has `armyId`), `:25-35` (`Island.positionedBy` has no `armyId`) — match; confirms the `TileBoats` fix must key off `player.positions`, not a new `Island` field.
- `src/lib/types/game.ts:30-39` (`StructuredLogEntry`), `:44-66` (`GameState`) — match.
- `log-entry.ts:1-8` (`pushLogEntry`, `LogEntryInput`) — match, `Omit<StructuredLogEntry, 'kind'|'turn'>` does widen for free.
- `cards.ts:24-29` (`ResourceType`), `resource-display.ts:1-11` (`getResourceDisplayName`) — match.
- `toast-store.ts:5` (`TOAST_LIMIT`), `:112-127` (`toast()`, `isDuplicate`) — match (plan cites `:112-148`, close enough; the function and duplicate-guard are both there).
- `AbilitiesDialog.hook.ts:1,15,20` — match, confirmed as the toast call-site pattern.
- `game-board.engine.hook.ts:1-20` import block, `useToast` destructure — match; `useStalenessCheck` wiring at the bottom of the hook confirms the pattern to copy.
- `game-board.staleness.hook.ts` — full file read, matches the "flat hook file wired into `useGameEngine`" pattern description exactly.
- `TileBoats.map.ts:72-82` region — the exact line is `isPositionedOnResource = (island.positionedBy || []).some((pos) => pos.playerId === player.id)`, confirmed; the fix (`player.positions.some(p => p.armyId === armyId)`) is correct given `armyId` is already destructured in the `occupants.forEach`.
- `TileBoats.hook.ts:1-17` — confirmed `gameState.players` (full `Player[]`) is already passed into `toTileBoatsViewModel`, no signature change needed.
- `TileBoats.map.test.ts:96` ("hides idle collector...") and `:309` ("does not mutate input island") — line numbers match within rounding (plan says `:96-111`/`:293-307`; actual test bodies start exactly at 96 and the next one at 309, close enough that the implementer will find them immediately).
- `board-context.fixtures.ts:23` (`positions: []`) — match.
- `GameLog.map.ts:41` (`filterVisibleEntries`) — match.
- `player-turn.reducer.test.ts:66,89,117` and `card-effects.reducer.test.ts:106,123,135,150,165` — every test name and line quoted in the plan matches the file exactly, including the one the plan says is unaffected (`:165`, the boundary test).
- `bot-turn.reducer.test.ts:1-21` (`buildBotTurnGame`) — match, real pattern to copy.
- `GameBoard.tsx:42` and `TutorialBeacon.preview.tsx:12` — both contain the exact old string `"...gather resources automatically every turn."` today; confirmed as the only two live sites of that phrase in `src/`.
- `game-mechanics.md:40` (§5.3 "Collecting" bullet) and `:82-86` (§6.3 Position resolution) — both contain the exact "without re-clicking Position" / "removed only when the army moves... or is defeated" wording the plan says must change.
- `player-factory.ts:45` and `game-setup.reducer.test.ts:23` (cited in game-design.md, carried by reference) — match.

Additional sweep beyond the plan's own citations, to catch anything it missed:
- Grepped the whole repo (excluding `node_modules`) for the old tutorial string and the "without re-clicking Position"/"keeps collecting it every turn" phrasing: every hit outside this task's own doc files and a stale `.claude/worktrees/inspiring-kare-ee7f7f/` copy is one of the two files the plan already lists (`GameBoard.tsx:42`, `TutorialBeacon.preview.tsx:12`, `game-mechanics.md`). No missed call site.
- Grepped every file touching `positions`/`positionedBy`/`SelectResourcePosition` in `src/` and `e2e/`: `combat-player-resolve.reducer.ts`, `movement.reducer.ts`, `turn-progression.ts`, `game-setup.reducer.ts`, `GameDialogManager.tsx`, `ArmySelectionDialog.map.ts`, `PlayerInfo.map.ts`, `game-board.local-actions.hook.ts`, `e2e/bot-ui-actions.ts` — all read clear-on-move/clear-on-loss or display logic that reads `positions` as data, none of them encode an assumption that collection-time clearing can't happen; none need to change for this plan to be correct. Correctly left out of the File plan.
- Checked whether `isArmyEligibleToPosition`'s planned "no monster present" clause is an invented game rule: it is not a rule enforced by `resource-position.reducer.ts` or `game-board.local-actions.hook.ts`'s `local_Position` case (neither checks for a monster) — it is lifted verbatim from the bot's existing heuristic (`bot-army-actions.reducer.ts:55`). In practice an army can't be parked on a tile that currently has a monster (the UI always routes a monster-tile click to attack, and monsters don't spawn onto an already-occupied tile after the fact), so reusing the bot's heuristic for `countIdleFarmArmies` can't under-report a real idle farmer. Not a blocker, but worth tester-a treating "monster present → false" as tested behavior preserved from the bot path, not a new rule being introduced for humans (plan's own test plan already includes this case, so no action needed).

### Design review
- Simplicity: no new dependency, no new pattern. The toast reuses the exact existing `use-toast`/`AbilitiesDialog` call site; the position-clear mirrors the existing `movement.reducer.ts` splice+filter idiom; the new shared helper is a plain function extraction, not a new abstraction layer.
- DRY: `army-position-eligibility.ts` is justified by the "must change together" bar — the bot's positioning branch and the new idle-farm counter both implement the identical "can this army legally position here" rule today duplicated nowhere else; `resource-position.reducer.ts`'s own `alreadyPositioned` check is correctly left alone since it's a different, per-resource-on-tile check, not the same rule.
- Responsibility split: game-rule clearing lives in the two reducers that already own collection; the view-facing toast logic lives in a new `.map.ts`/`.hook.ts` pair in `game-board`, matching `useStalenessCheck`'s precedent exactly; `TileBoats.map.ts`'s one-line fix stays inside the module that owns that view model. Each file in the File plan has one reason to change.
- Contracts: both new modules' public functions are fully typed with doc comments stating exact behavior (including edge cases: null-returning defensively, seeding without toasting on first render, singular/plural copy). Sufficient for implementer-a and tester-a to work in parallel without re-deriving behavior from each other's code.
- Phases: single phase is appropriately sized for an M-tier task — one cohesive rule change plus its immediate consequences (bot priority, boat sprite, toasts, docs), no artificial splitting needed, and the plan's own step list (1-14) sequences dependencies correctly (types before reducers before the new hook before wiring).
- Risk/Decisions section directly answers the two things a reviewer would otherwise ask ("why a log field and not a new GameState field," "why fix TileBoats now instead of routing it") with a reasoned rejection of the alternative in each case — no unresolved design debt smuggled into "out of scope."
- Game-design and UI-design final specs (bot priority 6, idle-farm toast, TileBoats finding) are all correctly folded into this plan's acceptance criteria, File plan, and test plan; nothing from either final spec was dropped.

No findings requiring a change. Plan is ready to build.
