# Plan: Resource-gain animations (HUD + island tile)

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
All eight acceptance criteria in `ui-design.md`'s Final spec (`ui-design.md:162-169`), restated, with the detection-mechanism gap it flagged resolved (all four reducer paths wired, not just two):
- [ ] A Gold/Wood/Food gain for the local player (auto-collection, Collector passive, doubled-resource card, or Wealthy/Steal) shows that one GIF overlay once (~0.8s, `RESOURCE_GAIN_ANIMATION_MS`) under the matching `PlayerInfoStats` chip only; the other two chips never animate.
- [ ] When that gain names a tile (every path except Wealthy/Steal), the matching resource node(s) on that island's `TileResources` show the same GIF overlay once, positioned on the node(s), not the whole tile.
- [ ] Wealthy/Steal gains animate the HUD chip only; no map tile shows an overlay.
- [ ] A Collector tick granting two resource types in one update animates both HUD chips and both islands' matching nodes concurrently and independently.
- [ ] With `prefers-reduced-motion: reduce`, no GIF frame renders; the gaining chip/node shows a ~0.8s `ring-2 ring-accent` flash instead, CSS-only.
- [ ] The three HUD chips never change position/size while one animates.
- [ ] The map overlay sits above the resource sprite, at/below the collector badge.
- [ ] After one GIF loop, the overlay is removed from the DOM (both HUD and tile), not just hidden.
- [ ] A second gain of the same type/node while one is still playing restarts it from frame 1, no crash, no stacked copies.
- [ ] Only the local player's own `PlayerInfo` card gets the HUD animation (`ui-design.md:120`, decided, not deferred).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `StructuredLogEntry` | `src/lib/types/game.ts:30-42` | gets the new optional `resourceGain` field; `resourcesCollected` (line 39-41, toast-only) stays untouched |
| `GameState.log: LogEntry[]` | `src/lib/types/game.ts:59` | diffed by both the existing toast hook and the new detection hook |
| `applyAutomaticCollection` | `src/modules/game-rules/player-turn.reducer.ts:14-42` | tile known via `tile` at line 19; `collectedResources` built line 15,22-23; `pushLogEntry` already sets `resourcesCollected` line 37 — add `resourceGain` alongside |
| `applyCollectorAbility` | `src/modules/game-rules/turn-start-passives.reducer.ts:49-77` | tile known via `tile` at line 56; `resourcesCollected` built line 52,62-64 but never attached to the log entry (line 69-76 has no `resourcesCollected`/`resourceGain` today) |
| `handleUseProductiveCard` | `src/modules/game-rules/card-effects.reducer.ts:53-101` | tile known via `tile` line 73; `collectedResources` built line 55,81-82; `resourcesCollected` already attached line 95 |
| `handleGainWealth` | `src/modules/game-rules/card-targeted-effects.reducer.ts:32-54` | no tile; gain is `{[resource]: WEALTHY_GAIN_AMOUNT}` (constant line 5); `pushLogEntry` line 41-45 has no gain field today |
| `handleStealResource` | `src/modules/game-rules/card-targeted-effects.reducer.ts:57-97` | no tile; gainer is `currentPlayer` (the acting `playerId`), success branch line 72-80 (`stolenAmount`), failure branch line 81-87 pushes no gain (nothing gained) |
| `pushLogEntry` | `src/modules/game-rules/log-entry.ts:7-9` | unchanged; all four reducers already call it |
| `Island.id` | `src/lib/types/map.ts:26` | the tile/island id used for `resourceGain[].tileIds` |
| `resource-collection-feedback.hook.ts`/`.map.ts` | `src/modules/game-board/resource-collection-feedback.hook.ts:23-58`, `.map.ts:9-25` | log-length-ref diffing idiom (`seenLogLength`, seed-without-replay on first render) the new hook copies; untouched, this feature adds a sibling, not an edit |
| `game-board.engine.hook.ts` | `src/modules/game-board/game-board.engine.hook.ts:11,110` | where the existing toast hook is wired centrally — confirms the new hook must NOT be wired there too (HUD/map need independent, per-instance results, see Decisions) |
| `src/modules/game-board/index.ts` | `src/modules/game-board/index.ts:1-10` | public index; add `useResourceGainEvents` + `ResourceGainEvent` export here |
| `@/features/game/context/GameBoardContext` | `src/features/game/context/GameBoardContext.tsx:1-13` | pure re-export shim of `@/modules/game-board` — confirms `PlayerInfo.hook.ts`'s current import is the same context `TileResources.hook.ts` already imports via `@/modules/game-board` |
| `usePlayerInfo` | `src/modules/hud/components/PlayerInfo/PlayerInfo.hook.ts:1-13` | currently destructures only `turnTimer, isMyTurn`; needs `gameState, localPlayer` added |
| `toPlayerInfoViewModel`, `toResources` | `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts:81-99,115-144` | gets a new optional `gainPulses` parameter (default `{}`) |
| `ResourceStatViewModel`, `PlayerInfoViewModel` | `src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts:17-21,29-46` | `ResourceStatViewModel` gets `gainPulse` |
| `PlayerInfoStats` | `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx:84-101` | renders the per-chip overlay; `resourcesGrid`/`resourceChip` classes at `PlayerInfo.styles.ts:54-55` |
| `useTileResources`, `toTileResourcesViewModel` | `src/modules/map/components/TileResources/TileResources.hook.ts:1-11`, `TileResources.map.ts:77-134` | hook already reads `gameState` via `@/modules/game-board`; map fn gets a new `gainPulses` parameter |
| `ResourceNodeViewModel` | `src/modules/map/components/TileResources/TileResources.types.ts:7-21` | gets `gainPulse` |
| `TileResourcesView` | `src/modules/map/components/TileResources/TileResources.tsx:29-78` | renders the overlay per node; `container`/`collectorOverlay` z-indices at `TileResources.styles.ts:2,6` (`z-[28]`/`z-[35]`), new overlay at `z-[32]` per `ui-design.md:125` |
| `RESOURCE_SPRITES`, `getResourceDisplayName` | `src/modules/shared/resource-display.ts:1-17` | sibling constant pattern; new `RESOURCE_GAIN_SPRITES`/`RESOURCE_GAIN_ANIMATION_MS` go in the same file |
| `src/modules/shared/index.ts` | `src/modules/shared/index.ts:1-8` | add the new pulse hook + resource-gain constants here |
| GIF assets | `public/sprites/gold_gain.gif`, `wood_gain.gif`, `food_gain.gif` (verified by ui-designer-b: GIF89a 256x256, 7 frames, ~820ms loop, loop=infinite) | already on disk, no new asset work |
| `--accent` token | `src/app/globals.css:59` | reduced-motion ring color, no raw hex |
| `motion-reduce:animate-none` precedent | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.styles.ts:8,17,27` | CSS-only reduced-motion pattern this feature reuses, no JS media-query hook |
| `PlayerInfo.fixtures.ts`, `TileResources.fixtures.ts` | both files, full contents read | every existing `resources`/node literal needs a `gainPulse: null` added (new required field) |
| `toResources` call site, `ResourceStatViewModel` literals | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts:26` (`toResources(localPlayer)`, 1 arg, unchanged by this fix); `GameBoardHeader.fixtures.ts:14-18` (`startingResources`), `:20-24` (`playingResources`) — reused by reference across the 6 exported view models at lines 26-89 flagged by `tsc`; `GameBoardHeader.test.tsx:182-186`; `GameBoardHeader.map.test.ts:283-289,306-312` (two literal expectations, each needs `gainPulse: null` too — corrected in final review: `gainPulses` being optional only means `GameBoardHeader.map.ts`'s call site itself is untouched, not that its test's literals are, since `ResourceStatViewModel.gainPulse` is required on every object regardless) | `GameBoardHeader` is a third, out-of-scope consumer of `toResources`/`ResourceStatViewModel` found only by running `npm run typecheck` (31 errors); it never needs gain pulses, so `gainPulses` becomes optional (default `{}`) — `GameBoardHeader.map.ts` itself needs no edit — but the two fixture arrays and the map test's two expected-literal arrays, plus one inline view-test literal, still need `gainPulse: null` added since that field itself is required on `ResourceStatViewModel` regardless of the parameter's optionality |
| `src/testbed/registry.ts:23,72` (`playerInfoPreview`), `:5,54` (`tileResourcesPreview`) | already registered; this task only adds states to the existing preview files, no registry edit |
| `eslint.config.mjs:17-22,38-54` | `src/lib/**` is a `LEGACY_PATHS` lint exemption (the `game.ts` edit isn't linted, only typechecked); `deepModuleImport`/`legacyUi` restrictions apply to every new/edited module file |

## Decisions
- New field `resourceGain?: ResourceGainLogEntry[]` on `StructuredLogEntry`, separate from `resourcesCollected`, because reusing `resourcesCollected` for Collector/Wealthy/Steal would silently make `findNewCollectionEntries`/`toCollectionToastContent` (`resource-collection-feedback.map.ts:12-25,29-41`) toast on those three paths too — an unreviewed toast-behavior change outside this feature's scope. Rejected: extending `resourcesCollected` itself.
- Set `resourceGain` on all four reducer paths now, not just the two that already have `resourcesCollected`. The edit is small per reducer and the ui-design Final spec's acceptance criteria require Collector/Wealthy/Steal coverage (`ui-design.md:165`); shipping only two of four leaves the feature visibly incomplete. Rejected: deferring Collector/Wealthy/Steal to a follow-up task.
- A shared stateless helper `toResourceGainEntries` (plain `.ts`, no state in/out, per component-architecture's "logic-only modules" rule) converts a reducer's local amount-map (+ optional tile-id map) into the flat array, called from all four reducer files. Rejected: inlining the same filter/shape logic four times (DRY violation, four places to keep in sync).
- Detection lives in a new sibling hook `useResourceGainEvents` in `game-board` (same log-length-ref diffing idiom as `resource-collection-feedback.hook.ts`), not folded into that existing hook. That hook is wired once, centrally (`game-board.engine.hook.ts:110`); this feature needs the same diff run independently by ~30 `TileResources` instances plus one `PlayerInfo` instance, each filtering to its own scope — a central hook can't fan out per-component results without a new pub/sub layer, which is bigger than this feature needs. Rejected: extending `useResourceCollectionFeedback`.
- A generic `useTransientPulses` hook (keyed, auto-expiring after a duration, restarts on repeat) lives in `src/modules/shared/`, because `PlayerInfo.hook.ts` and `TileResources.hook.ts` both need the identical "flash then clear, restart if retriggered" state machine and it carries zero game-domain knowledge. Rejected: a one-off `useState`+`setTimeout` written separately in each `.hook.ts` (duplicated restart-edge-case logic and tests).
- Pulse keys are the bare `ResourceType` string, not a compound `${islandId}:${type}` key: each hook instance already scopes its own `useResourceGainEvents` filter to itself (its own island id, or its own player id) before building the trigger list, so the key only needs to distinguish resource type within that instance's three possible pulses.
- `findNewResourceGainEvents` does not filter by player. HUD filters the returned events to `playerId === localPlayer.playerId` (only the local player's card animates, per `ui-design.md:120`); `TileResources` ignores `playerId` entirely and filters only by `tileIds.includes(island.id)` — the map tile is shared board state, not scoped to one player, and nothing in the spec restricts it to the local player's own gains.
- `prefers-reduced-motion` is handled entirely with Tailwind's `motion-reduce:` variant in each `.styles.ts` (existing precedent, see Verified context) — both the GIF element and the ring-flash wrapper are always rendered while a pulse is active, and CSS alone decides which one is visible. Rejected: a `window.matchMedia` hook (a new pattern; the codebase already solves this with CSS).
- GIF restart is forced with React `key={pulse.token}` on the `<Image>` (a fresh DOM node on every (re)trigger, guaranteeing frame-1). Rejected: cache-busting the `src` with a query string (defeats `unoptimized` caching for `next/image`, no guarantee of a frame-1 restart).
- `ResourceGainLogEntry.tileIds` is a plain array, built by pushing `tile.id` once per collected position/tile without deduping. A node's membership check is `.includes()`, which behaves identically with or without duplicates. Rejected: deduping with a `Set` in every reducer (extra code, no observable difference).
- Reused location for the two new domain constants: `src/modules/shared/resource-display.ts` (already holds a `ResourceType → sprite` map, `RESOURCE_SPRITES`). Rejected: a new file (the existing file is 17 lines, well under the 150-line limit, and the new constants are the same kind of knowledge).
- `toResources`'s and `toPlayerInfoViewModel`'s `gainPulses` parameter is optional, defaulting to `{}` (`gainPulses: Partial<Record<ResourceType, PulseState>> = {}`), not required. `GameBoardHeader.map.ts:26` is a third caller of `toResources`, found by `npm run typecheck` (31 errors, none in a File-plan file), that only needs the plain resource list for the top-bar strip and has no gain-pulse concept; a default keeps that call site, and its matching `GameBoardHeader.map.test.ts:279` assertion, untouched. Rejected: a required parameter with `toResources(localPlayer, {})` at the call site (smaller type-level guarantee for a parameter every other call site already supplies, dead `{}` noise at the one call site that doesn't need it).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| **Phase 1 — detection foundation + HUD** | | | |
| `src/lib/types/game.ts` | edit | add `ResourceGainLogEntry` type + `resourceGain?` field on `StructuredLogEntry` | implementer-a |
| `src/modules/game-rules/resource-gain-log.ts` | new | `toResourceGainEntries` pure helper | implementer-a |
| `src/modules/game-rules/resource-gain-log.test.ts` | new | tests for the helper | tester-a |
| `src/modules/game-rules/player-turn.reducer.ts` | edit | `applyAutomaticCollection` pushes `resourceGain` with tile ids | implementer-a |
| `src/modules/game-rules/turn-start-passives.reducer.ts` | edit | `applyCollectorAbility` pushes `resourceGain` with tile ids | implementer-a |
| `src/modules/game-rules/card-effects.reducer.ts` | edit | `handleUseProductiveCard` pushes `resourceGain` with tile ids | implementer-a |
| `src/modules/game-rules/card-targeted-effects.reducer.ts` | edit | `handleGainWealth`/`handleStealResource` push `resourceGain`, no tile ids | implementer-a |
| `src/modules/game-rules/player-turn.reducer.test.ts` | edit | extend for `resourceGain` | tester-a |
| `src/modules/game-rules/turn-start-passives.reducer.test.ts` | edit | extend for `resourceGain` | tester-a |
| `src/modules/game-rules/card-effects.reducer.test.ts` | edit | extend for `resourceGain` | tester-a |
| `src/modules/game-rules/card-targeted-effects.reducer.test.ts` | edit | extend for `resourceGain` | tester-a |
| `src/modules/game-board/resource-gain-events.types.ts` | new | `ResourceGainEvent` | implementer-a |
| `src/modules/game-board/resource-gain-events.map.ts` | new | `findNewResourceGainEvents` | implementer-a |
| `src/modules/game-board/resource-gain-events.map.test.ts` | new | tests | tester-a |
| `src/modules/game-board/resource-gain-events.hook.ts` | new | `useResourceGainEvents` | implementer-a |
| `src/modules/game-board/resource-gain-events.hook.test.ts` | new | tests | tester-a |
| `src/modules/game-board/index.ts` | edit | export the new hook + type | implementer-a |
| `src/modules/shared/resource-display.ts` | edit | add `RESOURCE_GAIN_SPRITES`, `RESOURCE_GAIN_ANIMATION_MS` | implementer-a |
| `src/modules/shared/use-transient-pulses.ts` | new | `useTransientPulses`, `PulseState` | implementer-a |
| `src/modules/shared/use-transient-pulses.test.ts` | new | tests | tester-a |
| `src/modules/shared/index.ts` | edit | export the new hook, type, constants | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts` | edit | `ResourceStatViewModel.gainPulse` | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts` | edit | `toResources`/`toPlayerInfoViewModel` take `gainPulses` | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.test.ts` | edit | extend | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.hook.ts` | edit | wire `useResourceGainEvents` + `useTransientPulses`, local-player-only gate | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.hook.test.ts` | edit | extend | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` | edit | add `gainPulse: null` to every resource entry | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.fixtures.ts` | edit | add `gainPulse: null` to `startingResources`/`playingResources` (`:14-18,20-24`) | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.test.ts` | edit | add `gainPulse: null` to the two inline expected-resources literals (`:283-289,306-312`) | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx` | edit | add `gainPulse: null` to the inline resources literal (`:182-186`) | tester-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfoStats.tsx` | edit | render per-chip GIF overlay + reduced-motion ring | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts` | edit | overlay/flash classes | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.test.tsx` | edit | extend view test | tester-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.preview.tsx` | edit | add a gain-active state | preview-a |
| **Phase 2 — map tile integration** | | | |
| `src/modules/map/components/TileResources/TileResources.types.ts` | edit | `ResourceNodeViewModel.gainPulse` | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.ts` | edit | `toTileResourcesViewModel` takes `gainPulses` | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | edit | extend | tester-a |
| `src/modules/map/components/TileResources/TileResources.hook.ts` | edit | wire `useResourceGainEvents` + `useTransientPulses`, filter by `island.id` | implementer-a |
| `src/modules/map/components/TileResources/TileResources.hook.test.ts` | edit | extend | tester-a |
| `src/modules/map/components/TileResources/TileResources.fixtures.ts` | edit | add `gainPulse: null`/active fixtures | implementer-a |
| `src/modules/map/components/TileResources/TileResources.preview.nodes.ts` | edit | add gain-active node fixtures | implementer-a |
| `src/modules/map/components/TileResources/TileResources.tsx` | edit | render per-node GIF overlay + reduced-motion ring | implementer-b |
| `src/modules/map/components/TileResources/TileResources.styles.ts` | edit | overlay/flash classes, `z-[32]` | implementer-b |
| `src/modules/map/components/TileResources/TileResources.test.tsx` | edit | extend view test | tester-b |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | edit | add gain-active preview states | preview-b |
| `docs/architecture/systems-and-visuals.md` | edit | document the new transient gain-overlay feedback (near §"Active Collector Farming", line 118) | docs-sync |

## Contracts
```ts
// src/lib/types/game.ts — add alongside StructuredLogEntry
export type ResourceGainLogEntry = {
  type: ResourceType;
  amount: number;
  /** Island.id values this gain can be attributed to. Omitted = no tile (Wealthy, Steal). */
  tileIds?: string[];
};

// StructuredLogEntry gains one new optional field (resourcesCollected is untouched):
//   /** Set on every log entry that increases `playerId`'s resources, for the resource-gain
//    *  animation feature. `playerId` is always the gainer. Independent of `resourcesCollected`
//    *  (toast-only) — adding this never changes which entries toast. */
//   resourceGain?: ResourceGainLogEntry[];

// src/modules/game-rules/resource-gain-log.ts
import type { ResourceGainLogEntry, ResourceType } from '@/lib/types';

/** Converts a reducer's per-type gained-amount map (and optional per-type tile-id map) into the
 *  flat array `pushLogEntry` attaches as `resourceGain`. A type with amount <= 0 is dropped. A
 *  type absent from `tileIdsByType` (or passed with an empty array) gets no `tileIds` field. */
export function toResourceGainEntries(
  amounts: Partial<Record<ResourceType, number>>,
  tileIdsByType?: Partial<Record<ResourceType, string[]>>,
): ResourceGainLogEntry[];

// src/modules/game-board/resource-gain-events.types.ts
import type { ResourceType } from '@/lib/types';

export interface ResourceGainEvent {
  playerId: string;
  type: ResourceType;
  /** Always an array; empty = no tile for this gain (Wealthy, Steal). May contain duplicates. */
  tileIds: string[];
}

// src/modules/game-board/resource-gain-events.map.ts
import type { GameState } from '@/lib/types';
import type { ResourceGainEvent } from './resource-gain-events.types';

/** Flattens every `resourceGain` entry on structured log entries added since `sinceIndex` into
 *  one event per (log entry, resource type). Entries with no `playerId` are skipped (defensive;
 *  every reducer that sets `resourceGain` also sets `playerId`). Mirrors
 *  `findNewCollectionEntries` (`resource-collection-feedback.map.ts`) but is not player-scoped —
 *  callers filter by `playerId`/`tileIds` themselves. */
export function findNewResourceGainEvents(log: GameState['log'], sinceIndex: number): ResourceGainEvent[];

// src/modules/game-board/resource-gain-events.hook.ts
import type { GameState } from '@/lib/types';
import type { ResourceGainEvent } from './resource-gain-events.types';

/** Seeds on first render without returning events (a reload mid-match never replays history),
 *  matching `useResourceCollectionFeedback`'s seeding. Each call site (one `PlayerInfo`, N
 *  `TileResources`) owns an independent ref and computes its own diff — safe because the whole
 *  map stays mounted (no remount thrashing).
 *
 *  Corrected in final review (was: "otherwise `[]`"): computed with `useMemo` keyed on
 *  `gameState.log`'s reference, so a re-render with the *same* `log` reference returns the
 *  exact same array this hook returned last time — not a fresh `[]` — including any non-empty
 *  batch from the render that grew it. This is intentional and the pinned behavior
 *  (`resource-gain-events.hook.test.ts`, "returns the same batch reference on a re-render with
 *  an unchanged log"): every caller derives its own trigger list from this array inside its own
 *  `useMemo`/`useEffect` keyed on the array's reference (see `PlayerInfo.hook.ts`'s
 *  `pulseTriggers`), so a stable reference — whatever its contents — is what stops a downstream
 *  re-pulse; a fresh `[]` literal every render would work too (callers also guard on
 *  `triggers.length === 0`) but costs an extra effect run per render for no behavioral gain. A
 *  future caller must follow the same pattern: gate on this array's reference, not assume
 *  non-empty implies "new" without that gate. */
export function useResourceGainEvents(gameState: GameState | null): ResourceGainEvent[];

// src/modules/shared/resource-display.ts — additions
export const RESOURCE_GAIN_SPRITES: Record<ResourceType, string>; // gold_gain.gif / wood_gain.gif / food_gain.gif, '/sprites/*'
/** Single GIF loop duration (measured: 160ms + 6x110ms = 820ms, loop=infinite); the view layer
 *  unmounts the overlay after this many ms. */
export const RESOURCE_GAIN_ANIMATION_MS: number; // 820

// src/modules/shared/use-transient-pulses.ts
export interface PulseState {
  isActive: boolean;
  /** Changes every time this key (re)pulses; use as a React `key` to force a GIF to restart. */
  token: number;
}

/** For each `{ key }` in `triggers`, marks that key active and bumps its token, clearing it back
 *  to inactive `durationMs` later. Retriggering the same key before it clears restarts the timer
 *  and bumps `token` again (no stacked timers, no crash). Keys not present in `triggers` keep
 *  their previous state (or are simply absent from the returned record if never triggered).
 *  `triggers` must be a new array reference only when there is a genuinely new batch to pulse
 *  (e.g. `useResourceGainEvents`'s output) — a stable reference across renders is a no-op. */
export function useTransientPulses(
  triggers: { key: string }[],
  durationMs: number,
): Record<string, PulseState>;

// src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts — ResourceStatViewModel addition
export interface ResourceStatViewModel {
  type: ResourceType;
  label: string;
  value: number;
  gainPulse: { token: number; spriteSrc: string } | null;
}

// src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts — signature changes
export function toResources(
  player: Player,
  gainPulses?: Partial<Record<ResourceType, PulseState>>, // default {}
): ResourceStatViewModel[];

export function toPlayerInfoViewModel(
  player: Player,
  isCurrentPlayer: boolean,
  vpGoal: number,
  turnTimer: { formattedTime: string; isExpiring: boolean },
  isMyTurn: boolean,
  gainPulses?: Partial<Record<ResourceType, PulseState>>, // default {}
): PlayerInfoViewModel;

// src/modules/map/components/TileResources/TileResources.types.ts — ResourceNodeViewModel addition
export interface ResourceNodeViewModel {
  // ...existing fields unchanged...
  gainPulse: { token: number; spriteSrc: string } | null;
}

// src/modules/map/components/TileResources/TileResources.map.ts — signature change
export function toTileResourcesViewModel(
  island: Island,
  isBase: boolean,
  players: Player[],
  gainPulses: Partial<Record<ResourceType, PulseState>>,
): ResourceNodeViewModel[] | null;
```

## Phases
### Phase 1: Detection foundation + HUD
1. Add `ResourceGainLogEntry` + `StructuredLogEntry.resourceGain` to `src/lib/types/game.ts` (implementer-a).
2. Add `toResourceGainEntries` + its test (implementer-a, tester-a).
3. Wire `resourceGain` into all four reducer call sites, extending their existing test files (implementer-a, tester-a). Sonnet: these four reducer edits (existing, non-trivial control flow; a wrong tile-id accumulation silently breaks the map phase later).
4. Add `resource-gain-events.types.ts`/`.map.ts`/`.hook.ts` + tests, export from `game-board/index.ts` (implementer-a, tester-a). Sonnet: the hook (diffing/seeding semantics must exactly match the existing toast hook's behavior).
5. Add `RESOURCE_GAIN_SPRITES`/`RESOURCE_GAIN_ANIMATION_MS` to `resource-display.ts`; add `use-transient-pulses.ts` + test; export both from `shared/index.ts` (implementer-a, tester-a). Sonnet: the pulse hook (restart-while-active edge case, timer cleanup on unmount).
6. Extend `PlayerInfo.types.ts`/`.map.ts`/`.hook.ts` (local-player-only gate; `gainPulses` optional, default `{}`) + their tests + fixtures (implementer-a, tester-a). Also add `gainPulse: null` to `GameBoardHeader.fixtures.ts`'s `startingResources`/`playingResources` and `GameBoardHeader.test.tsx`'s inline literal (implementer-a, tester-b) — `GameBoardHeader` reuses `ResourceStatViewModel`/`toResources` but needs no gain-pulse wiring itself. Sonnet: the `PlayerInfo` hook (must only wire pulses when `player.playerId === localPlayer.playerId`).
7. Implement the view: `PlayerInfoStats.tsx` + `PlayerInfo.styles.ts` (overlay positioned over the chip, `motion-reduce:` ring fallback, grid height unchanged) + view test (implementer-b, tester-b). Sonnet: the view (exact overlay positioning without shifting `resourcesGrid`).
8. Add a "Gold gain active" preview state to `PlayerInfo.preview.tsx` (preview-a).
9. Checks: `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` on the HUD preview (desktop + mobile viewport, plus a DevTools "prefers-reduced-motion: reduce" emulation pass).
10. Commit, stop, ask the user to type `continue`.

Model escalation: steps 3, 4, 5, 6, 7 (see sonnet notes above).

### Phase 2: Map tile integration + docs-sync
1. Extend `TileResources.types.ts`/`.map.ts`/`.hook.ts` (filter events by `tileIds.includes(island.id)`, ignore `playerId`) + their tests + fixtures/preview-node fixtures (implementer-a, tester-a). Sonnet: the hook and map fn (same resource type on 2 nodes must both get the identical `gainPulse`, since the pulse key is per-island-per-type, not per-node).
2. Implement the view: `TileResources.tsx` + `.styles.ts` (`z-[32]` overlay above the sprite, at/below the collector badge; `motion-reduce:` ring fallback) + view test (implementer-b, tester-b). Sonnet: the view (z-order interaction with the existing collector badge).
3. Add gain-active preview states to `TileResources.preview.tsx` (preview-b).
4. `docs-sync`: add a short subsection to `docs/architecture/systems-and-visuals.md` near the existing "Active Collector Farming" bullet (`systems-and-visuals.md:118`) describing the new transient GIF overlay (HUD chip + map tile node), its trigger (`StructuredLogEntry.resourceGain`), duration (`RESOURCE_GAIN_ANIMATION_MS`), and the reduced-motion fallback.
5. Checks: `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` on the map preview and on a live board (an auto-collection or Collector tick, desktop + mobile), plus a reduced-motion emulation pass.
6. Commit, stop, ask the user to type `continue`.

Model escalation: steps 1, 2 (see sonnet notes above).

## Test plan
- tester-a (logic, first):
  - `resource-gain-log.test.ts`: empty amounts -> `[]`; a type with amount <= 0 excluded; multiple types each get their own entry; a type present in `tileIdsByType` gets `tileIds`, a type absent does not; `tileIdsByType` omitted entirely -> no entry has `tileIds`.
  - `player-turn.reducer.test.ts`: `applyAutomaticCollection`'s log entry's `resourceGain` matches `resourcesCollected` 1:1, each gain's `tileIds` containing the collected tile's `Island.id`.
  - `turn-start-passives.reducer.test.ts`: `applyCollectorAbility`'s log entry carries `resourceGain` for each type collected, `tileIds: [tile.id]`; two resource types from one island in one tick share the same tile id across their two gain entries.
  - `card-effects.reducer.test.ts`: `handleUseProductiveCard`'s `resourceGain` mirrors `resourcesCollected` including the doubled spot's tile id.
  - `card-targeted-effects.reducer.test.ts`: `handleGainWealth` -> `resourceGain: [{type, amount: 5}]`, no `tileIds`; `handleStealResource` success branch -> gainer's entry has `resourceGain` with `stolenAmount`, no `tileIds`; failure branch (nothing to steal) -> no `resourceGain` field at all.
  - `resource-gain-events.map.test.ts`: ignores entries before `sinceIndex`; ignores plain string log entries; ignores structured entries with no `resourceGain`; flattens a multi-type `resourceGain` array into separate events; defaults a missing `tileIds` to `[]`; skips an entry with no `playerId`.
  - `resource-gain-events.hook.test.ts`: seeds on first render, returns no events; a later `gameState.log` growth returns exactly the new entries' events; re-rendering with the same `gameState` does not re-return the previous batch.
  - `use-transient-pulses.test.ts`: triggering a key -> `{isActive: true}` immediately, `{isActive: false}` after `durationMs` (fake timers); an untriggered key is absent/inactive; retriggering the same key before it clears bumps `token` and restarts the `durationMs` countdown rather than clearing at the original schedule; two different keys pulse and clear independently.
  - `PlayerInfo.map.test.ts`: `toResources`/`toPlayerInfoViewModel` with a `gainPulses` map containing an active Gold entry -> Gold's `gainPulse` has the right `token`/`spriteSrc`, Food/Wood are `null`.
  - `PlayerInfo.hook.test.ts`: the local player's card computes `gainPulses` from matching `playerId` events; a non-local-player card never wires `gainPulses` (always empty), even when matching events exist for that player.
  - `TileResources.map.test.ts`: `toTileResourcesViewModel` with a `gainPulses` entry for a type present on 2 nodes (dual slot) -> both nodes get the identical `gainPulse`; a type absent from the map -> `gainPulse: null`.
  - `TileResources.hook.test.ts`: events are filtered to `tileIds.includes(props.island.id)`, regardless of `playerId`.
- tester-b (view, no new e2e — this is passive visual feedback, no new interactive flow; existing `e2e/bot-vs-bot-ui.spec.ts`/gameplay specs keep covering resource collection unaffected):
  - `PlayerInfo.test.tsx`: an active Gold `gainPulse` renders the overlay only under `data-testid="player-info-resource-gold"`, not under food/wood; after advancing past `RESOURCE_GAIN_ANIMATION_MS` (fake timers) the overlay is gone from the DOM; the reduced-motion classes are present on both the overlay (hidden variant) and the chip (ring variant) regardless of the real OS setting (jsdom can't emulate the media query itself — this is a class-presence assertion only).
  - `TileResources.test.tsx`: a node with `gainPulse` renders the overlay above `resource-sprite`; a node without it renders none; two same-type nodes (dual slot) both show the overlay from one shared pulse.

## Preview states
- `PlayerInfo` (preview-a): add "Gold gain active" (`currentPlayerWithBuffs` with Gold's `gainPulse` set, Food/Wood `null`) alongside the four existing states; note in the preview comment that the reduced-motion fallback is checked by toggling the OS/DevTools "prefers-reduced-motion: reduce" setting, not a separate forced state (CSS-only, no JS branch to fake).
- `TileResources` (preview-b): add "Resource with gain overlay" (single node, `gainPulse` set) and "Dual same-type nodes with gain overlay + collector" (both dual-slot nodes pulsing, collector badge present, to verify the `z-[32]` ordering) alongside the eight existing states.

## Risks
- `StructuredLogEntry` grows by one optional field; all fields on it are already optional, so existing Firestore documents and every reducer that doesn't set `resourceGain` are unaffected — mitigated by `npm run typecheck` plus the four extended reducer test files.
- `useResourceGainEvents` runs its own log diff once per `TileResources` instance (board-size tile count, confirmed small) on every `gameState` change; acceptable at this game's scale, called out here in case a future profiling pass flags it.
- `RESOURCE_GAIN_ANIMATION_MS` (820) is a measured constant tied to today's three GIFs' real loop length; if a GIF is ever re-exported with a different frame count/duration, the overlay will unmount mid-loop or linger — it's a single named constant, a one-line fix, not a design flaw.
- Four reducer files already have test coverage; the plan requires extending those existing test files in place rather than only adding new standalone tests, so today's coverage doesn't silently regress.

## Review (architect-b)
VERDICT: APPROVED

Verified every path/symbol in "Verified context" and the File plan against the real files (not just trusted the citations):
- `src/lib/types/game.ts:30-42` `StructuredLogEntry`/`resourcesCollected` comment, `:59` `log` field — exact match.
- `player-turn.reducer.ts` `applyAutomaticCollection`: tile line 19, `collectedResources` lines 15/22-23, `resourcesCollected` line 37 — exact.
- `turn-start-passives.reducer.ts` `applyCollectorAbility`: tile line 56, `resourcesCollected` lines 52/62-64, no gain field in the push at lines 69-76 — exact.
- `card-effects.reducer.ts` `handleUseProductiveCard`: tile line 73, `collectedResources` lines 55/81-82, `resourcesCollected` line 95 — exact.
- `card-targeted-effects.reducer.ts` `handleGainWealth`/`handleStealResource`: `WEALTHY_GAIN_AMOUNT` line 5, no-gain-field pushes at 41-45 and 81-87, gainer-is-`currentPlayer` at 72-80 — exact.
- `log-entry.ts:7-9` `pushLogEntry`, `src/lib/types/map.ts:26` `Island.id` — exact.
- `resource-collection-feedback.hook.ts`/`.map.ts`, `game-board.engine.hook.ts:11,110`, `game-board/index.ts`, `GameBoardContext.tsx` re-export shim, `game-board.engine.types.ts` (`UseGameEngineResult.gameState`/`localPlayer`), `game-board.types.ts:85-` (`GameBoardContextType.gameState`/`localPlayer`) — all confirmed; `useGameBoard()` does expose both non-null fields, so `useResourceGainEvents(gameState: GameState | null)` accepting a narrower nullable type than what callers pass is safe (not a type error).
- `PlayerInfo.hook.ts:7` destructures only `turnTimer, isMyTurn` from `useGameBoard()` via `@/features/game/context/GameBoardContext` — confirmed, matches the plan's exact claim about which shim it imports.
- `PlayerInfo.map.ts` `toResources`/`toPlayerInfoViewModel`, `PlayerInfo.types.ts` `ResourceStatViewModel`/`PlayerInfoViewModel`, `PlayerInfoStats.tsx:84-101` resources-grid block — confirmed; two citation line-ranges were off (`PlayerInfo.styles.ts` `resourcesGrid`/`resourceChip` are at 54-55, not 46-48; `PlayerInfoViewModel` is at 29-46, not 28-43) — folded the fix into the plan directly (trivial, no symbol was wrong, only the line numbers).
- `TileResources.hook.ts`, `.map.ts` (node key `resource-node-${node.type}-${idx}` at line 134), `.types.ts`, `.tsx` (`TileResourcesView` 29-78), `.styles.ts` (`container` z-[28] line 2, `collectorOverlay` z-[35] line 6) — all exact.
- `resource-display.ts` (existing `RESOURCE_SPRITES`/`getResourceDisplayName`, 17 lines) and `shared/index.ts` — confirmed, room for the two new constants without exceeding the 150-line limit.
- GIF assets: `gold_gain.gif`/`wood_gain.gif`/`food_gain.gif` on disk, confirmed GIF89a 256×256 via `file`, matching the designers' and the plan's claim exactly.
- `globals.css:59` `--accent: 45 100% 55%`; `ConnectionWarningDialog.styles.ts:8,17,27` `motion-reduce:animate-none` precedent — exact.
- `PlayerInfo.fixtures.ts`/`TileResources.fixtures.ts` — confirmed every `resources`/node literal lacks a `gainPulse` field today, so the "add `gainPulse: null`" file-plan entries are real, necessary edits, not busywork.
- `src/testbed/registry.ts:23,72` (`playerInfoPreview`) and `:5,54` (`tileResourcesPreview`) — exact. `TileResources.preview.nodes.ts` exists, confirming that file-plan row isn't inventing a path.
- `eslint.config.mjs` `LEGACY_PATHS` includes `src/lib/**` (within lines 12-24, plan cites 17-22 which is a subset — fine) and `RESTRICTED_IMPORTS` at 41-54 (plan cites 38-54, which includes the preceding `MODULE_FILES` const — fine, no invented rule).
- `docs/architecture/systems-and-visuals.md:118` "Active Collector Farming" bullet — exact line, correct anchor for docs-sync.
- Ran a repo-wide grep for every new symbol name (`resource-gain-events`, `useResourceGainEvents`, `resourceGain`, `use-transient-pulses`, `useTransientPulses`, `RESOURCE_GAIN_SPRITES`, `RESOURCE_GAIN_ANIMATION_MS`, `resource-gain-log`, `toResourceGainEntries`): zero existing hits outside this plan — no naming collision, nothing to reuse that was missed.

Design review:
- Detection mechanism (sibling `useResourceGainEvents` hook, not folded into `useResourceCollectionFeedback`) is justified: the existing hook is wired once centrally and fires side effects (toasts); this feature needs ~30 independent per-component results, which really is a different shape of problem, not a copy of an existing pattern. The rejected alternatives in the Decisions section are correctly rejected.
- `resourceGain` as a new field, separate from `resourcesCollected`, correctly avoids an unreviewed toast-behavior change on Collector/Wealthy/Steal — good boundary-respecting call given `findNewCollectionEntries` filters on `resourcesCollected` presence.
- `useTransientPulses` in `shared/` is the right level of reuse: identical state machine needed by two unrelated modules (`hud`, `map`), zero domain knowledge, and it only gets built once this task needs it twice (not speculative).
- Phasing (HUD first, map second) matches the file-count/module-boundary reasoning in triage; each phase is independently testable and shippable.
- Test plan correctly orders logic (reducers, pure helpers, hooks) before view tests, and specifies the exact observable outcomes (not ranges) per the testing skill.
- Contracts are complete enough for two builders in parallel: implementer-a owns every logic file end-to-end across both phases, implementer-b owns only the two `.tsx`/`.styles.ts` view pairs — a clean, non-overlapping split with explicit signatures for the hand-off points (`gainPulses` parameter shape identical in both map functions).
- Risks section is honest about the one performance tradeoff (per-instance log diffing across ~30 tiles) and the one fragility (a hardcoded animation-duration constant tied to today's GIF export) without treating either as blocking.

No changes required. Status set to APPROVED; `progress.md`'s "plan approved (architect-b)" box ticked.
