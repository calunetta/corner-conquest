# Plan: Migrate game map/board visuals to src/modules/map

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change)

## Goal and acceptance criteria
- [ ] `src/modules/map/` exists with `MapZoomControls`, `MapGrid`, `MapDecorations`, `IslandTile`, `TileForest`, `TileResources`, `TileBoats`, `TileOccupants`, `AnimatedMonster`, `DeathEffect` built per component-architecture (types/map/hook/styles/view split where applicable), each rendering **pixel-identical** output to today's legacy components for the same inputs.
- [ ] `src/features/game/components/GameBoard.tsx` imports `MapGrid` from `@/modules/map` instead of `./MapGrid`; no other line of `GameBoard.tsx` changes (GameBoard itself is NOT migrated — see Decisions).
- [ ] All 10 triage-listed legacy files, plus `AnimatedMonster.tsx` and `DeathEffect.tsx` (see Correction below), are deleted once their replacements are verified; their 5 existing unit test files move and are adapted, not dropped.
- [ ] Every new component has a testbed preview covering its visual states, screenshot-verified (skill `ui-verify`).
- [ ] `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, and `npm run build` pass; `docs/README.md` describes `src/modules/map/` and updates the trimmed legacy bullets.

## Correction to triage's file list
Triage's 10 files do not include `AnimatedMonster.tsx` (68 lines) and `DeathEffect.tsx` (47 lines), both in `src/features/game/components/`. Grepped: **both are imported exclusively by `IslandTile.tsx`** (`IslandTile.tsx:11,16,101,172`) — no other consumer in `src`. Once `IslandTile.tsx` moves into `src/modules/map`, its `.tsx` view cannot import `@/features/*` at all (`eslint.config.mjs:50-53,77-86` — the `legacyUi` restriction has no `.tsx` exemption, only `*.hook.ts` is exempted at `:88-96`; component-architecture's import-boundary table says the same). Unlike `GameDialogManager.tsx` in the combat-dialog precedent (13 untouched legacy siblings, out of scope, too large to pull in — `docs/ai/tasks/2026-10-03-migrate-dialog-components/plan.md` Decisions), `AnimatedMonster`/`DeathEffect` are two small single-consumer leaves with no further legacy dependencies of their own (both read only props + browser timers, no `useGameBoard()`, no Firestore). Migrating them is the smaller, more correct move; leaving `IslandTile.tsx` legacy would also strand `TileBoats`/`TileForest`/`TileOccupants`/`TileResources`, which triage does want moved and which are `IslandTile`'s own children. **Decision: pull both into `src/modules/map` as part of Phase 2.**

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameBoard.tsx` | `src/features/game/components/GameBoard.tsx:1-108` | Imports `MapGrid` (`:7,37`), `GameBoardHeader`/`GameStatusBadge` from `@/modules/hud` (`:11` — **already migrated**, uncommitted in-flight work per `git status`'s untracked `src/modules/hud/`), plus still-legacy `ActionsPanel`/`GameLog` (`@/features/game/panels/*`, row #5, not yet migrated), `TutorialBeacon`, `PlayerInfoBar`, `GameDialogManager` (stays legacy per the combat-dialog precedent). Same shape as that precedent's `GameDialogManager`: a `.tsx` under `src/modules/**` can never import `@/features/*`, and `GameBoard.tsx` still renders 4 untouched legacy siblings (`ActionsPanel`, `GameLog`, `TutorialBeacon`, `PlayerInfoBar`, `GameDialogManager`) directly — it must stay at its legacy path (see Decisions). |
| `MapGrid.tsx` (current) | `src/features/game/components/MapGrid.tsx:1-78` | 0 props. Reads `useGameBoard()` (`gameState.map`, `:13,20`), `useIsMobile()` (`:14`), `useMapPanZoom({ initialZoom: DEFAULT_DESKTOP_ZOOM, isMobile })` (`:15-18`). Computes `cols`/`rows` via `useMemo` (`:22-30`, falls back to `MAP_COLS`/`MAP_ROWS` when `map` is empty). Early-returns `null` when `map` is empty (`:32`). Renders `MapZoomControls`, the pan/zoom transform wrapper, `MapDecorations`, and the `IslandTile` grid. `isDragging` is destructured from `useMapPanZoom` (`:15`) but never read anywhere else in the file — dead, drop it from the view model (see Decisions). |
| `IslandTile.tsx` (current) | `src/features/game/components/IslandTile.tsx:1-204` | Props `{ island: Island }` (`:19-21`). Reads `useGameBoard()`: `gameState, localPlayer, uiState, selectedArmy, handleTileClick` (`:37`), all five used. `BORDER_IMAGES` (`:23-27`), `playerTileIndicatorClasses` (`:29-34`). Pure derived booleans (no `Date.now`/`Math.random`): `isTeleporting`, `isScouting`, `isOpponentBase`, `isPossibleMove`, `isSelected`, `isScoutTarget`, `isTeleportTarget`, `isBase`, `baseOwner`, `isPersonallyRevealed` (`:42-60`), `isTileVisible` (`useMemo`, `:62-67`), `tilePlayerColor` (`useMemo`, `:69-80`), `isClickable` (`:144-148`). Impure, view-local (per triage's impurity check — keep in `.hook.ts`, not `.map.ts`): `deathAnimationOnTile` uses `Date.now()` (`:56-59`); `borderImageSequence` uses `Math.random()` inside a `useMemo(() => ..., [])` so it is computed once per mount (`:82-85`). `getTileCenterContent()` (`:108-142`) and `renderMonsterIcons()` (`:93-106`) are pure JSX-selection helpers reading the view model — stay in the view. Button class list `cn(...)` at `:154-163` and the terrain/content wrapper classes — extract to `.styles.ts`. |
| `TileBoats.tsx` (current) | `src/features/game/components/TileBoats.tsx:1-162` | Props `{ island: Island }`. Reads `useGameBoard()`: `{ gameState, localPlayer }` (`:30`) — **both used**: `localPlayer` feeds `isPersonallyRevealed` (`:33`, `localPlayer ? localPlayer.revealedTiles.includes(island.id) : false`), which in turn drives the `fogOfWar` branch of `isTileVisible` (`:41-42`). Uses `gameState.players`, `.debugMode`, `.settings.fogOfWar`. `COLLECTOR_IDLE_SPRITES` (`:14-19`), `BOAT_CORNER_POSITIONS` (`:22-27`, exported — re-export unchanged). All logic pure (visibility incl. `isPersonallyRevealed`, occupant/boat-entry derivation, `getCornerPosition` `:103-115`) — fits `.map.ts`, taking `localPlayer` as an input. |
| `TileForest.tsx` (current) | `src/features/game/components/TileForest.tsx:1-98` | Props `{ island: Island; isBase?: boolean }`. **No `useGameBoard()` call, no `Date.now`/`Math.random`** — fully pure given `island.x/y/type` and `isBase` (seeded arithmetic, `:32`). `TREE_SPRITES` (`:13-18`, exported, re-export unchanged). Early-return `null` for Resource/living-Monster islands (`:23-28`). No connected-component split needed. |
| `TileOccupants.tsx` (current) | `src/features/game/components/TileOccupants.tsx:1-99` | Props `{ island: Island }`. Reads `useGameBoard()`: `gameState, localPlayer` — both used. Uses `Date.now()` (`:27`) for death-animation suppression — impure, keep in `.hook.ts`. `positions` corner array (`:15-20`, not exported, internal). |
| `TileResources.tsx` (current) | `src/features/game/components/TileResources.tsx:1-176` | Props `{ island: Island; isBase?: boolean }`. Reads `useGameBoard()`: only `gameState.players` used. `FARM_SPRITES`, `RESOURCE_SPRITES`, `SINGLE/DUAL/TRIPLE/BASE_RESOURCE_SLOTS` (`:15-56`) — pure data, stays with the pure transform. All logic pure (resource expansion, slot assignment, farmed-node detection) — fits `.map.ts`. |
| `MapDecorations.tsx` (current) | `src/features/game/components/MapDecorations.tsx:1-186` | Props `{ isMobile?: boolean }`. No context. `FIXED_ROCK_LAYOUT`/`FIXED_CLOUD_LAYOUT` (`:26-118`, ~93 lines of static production data, not test fixtures) plus the `isMobile` filter (`:125-131`) are pure — fits `.map.ts` alongside the filter function. No connected-component split needed. |
| `MapZoomControls.tsx` (current) | `src/features/game/components/MapZoomControls.tsx:1-84` | Props `MapZoomControlsProps` (`:8-14`): `zoom`, `defaultZoom = 0.85`, `onZoomIn/onZoomOut/onResetZoom`. Fully prop-driven, no context, no local state — no hook needed at all. |
| `useMapPanZoom.ts` (current) | `src/features/game/hooks/useMapPanZoom.ts:1-233` | 201 effective (non-blank/non-comment) lines — must split (cap is 150). No context, no Firestore; pure local UI state. `clampPan` (`:38-50`) takes `currentZoom` as a **parameter**, not a closure value — pan and zoom-value state are independently extractable; only the action functions (`zoomIn`/`zoomOut`/`resetZoom`/wheel/pinch) need both. Public shape consumed today: `{ zoom, pan, defaultZoom, isDragging, zoomIn, zoomOut, resetZoom, handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel, onTouchStart, onTouchMove, onTouchEnd } }` (`:214-232`) — preserve exactly, including the still-unused `isDragging` field (kept in the hook's own public shape; only `MapGrid`'s view model drops it, see Decisions). `DEFAULT_DESKTOP_ZOOM = 0.85` (`:5`, exported, used externally by `MapGrid.tsx:16` and `src/testbed/legacy/MapZoomControls.preview.tsx:2,30`). |
| `AnimatedMonster.tsx` (current) | `src/features/game/components/AnimatedMonster.tsx:1-68` | Props `{ monster: Monster }`. No context. Local `useState` + `useEffect` interval (`:20-43`) using `Math.random()` to flip attack/idle state and horizontal offset. No existing test. |
| `DeathEffect.tsx` (current) | `src/features/game/components/DeathEffect.tsx:1-47` | Props `{ sprite: string; id: string; createdAt?: number }`. `DEATH_ANIMATION_DURATION = 1200` (`:12`, exported, consumed by `IslandTile.tsx:16,58`). Local `useState` + `useEffect` timeout (`:17-27`) using `Date.now()`. No existing test. |
| `GameBoardContextType` | `src/modules/game-board/game-board.types.ts:94-114` | `useGameBoard()`'s real return shape (already in modules; `src/features/game/context/GameBoardContext.tsx` is a thin re-export — confirmed by reading it, it only re-exports from `@/modules/game-board`). Fields used across these components: `gameState: GameState`, `localPlayer: Player`, `uiState: GameBoardUIState`, `selectedArmy: Army \| null`, `handleTileClick: (x, y) => Promise<void>`. New hooks import `useGameBoard` from `@/modules/game-board` directly (a modules-to-modules import via its public index, not `@/features/*`), not through the legacy re-export. |
| `Island`, `IslandType` | `src/lib/types/map.ts:9-33` | `Island = { id, x, y, type, owner?, resources: IslandResource[], occupants: {playerId,armyId}[], monsters?: Monster[], positionedBy?: {playerId,resource}[] }`. `IslandType = 'base'\|'resource'\|'monster'\|'special'\|'empty'`. |
| `GameState` | `src/lib/types/game.ts:29-47` | Fields read by these components: `players: Player[]`, `map: Island[]`, `debugMode: boolean`, `settings.fogOfWar: boolean`, `deathAnimations: DeathAnimation[]`. |
| `Player` | `src/lib/types/player.ts:19-38` | `color: PlayerColor`, `revealedTiles: string[]`, `armies: Army[]`. |
| `Army` | `src/lib/types/player.ts:13-17` | `{ id, position: {x,y}, hasActed }`. |
| `DeathAnimation` | `src/lib/types/combat.ts:26-32` | `{ id, x, y, sprite, createdAt? }`. |
| `Monster` | `src/lib/types/monsters.ts:9-16` | `{ name, level, sprite: {idle,attack,death} }`. |
| `PLAYER_DATA` | `src/lib/player-data.ts:18-54` | `PLAYER_DATA[color] = { name, sprite: {idle,attack,death}, base }`. Legacy but not `@/features/*` — importable anywhere (same note as the combat-dialog precedent). |
| `MAP_COLS`, `MAP_ROWS` | `src/lib/types/actions.ts` (re-exported via `@/lib/types` barrel, `src/lib/types/index.ts`) | Fallback grid dimensions when `map` is empty. |
| `useIsMobile` | `src/hooks/use-is-mobile.ts:1-17` | Legacy leaf hook, no context/Firestore. Called from `.hook.ts` files only (consistent with "legacy code touched only in hooks," even though ESLint's `legacyUi` restriction literally only names `@/features/*`). |
| ESLint module boundaries | `eslint.config.mjs:45-57` (`RESTRICTED_IMPORTS`), `:73` (`max-lines` 150), `:77-96` (zones) | `legacyUi` group is `['@/features/*','@/features/**']`; only `*.hook.ts` is re-exempted (`:88-96`). `max-lines` applies to every file in `src/modules/**`. |
| Existing tests to move | `src/features/game/components/__tests__/{TileResources,TileBoats,TileForest,TileOccupants,MapDecorations}.test.tsx` | All currently `jest.mock('../../context/GameBoardContext', ...)` for the three that read context (`TileResources`, `TileBoats`, `TileOccupants`); `TileForest`/`MapDecorations` need no mock (no context read). Full content read this session — exact cases listed in Test plan. |
| Testbed preview pattern | `src/testbed/registry.ts`, `src/testbed/testbed.types.ts` (`ComponentPreview { slug, title, group, states }`), `src/testbed/legacy/MapZoomControls.preview.tsx:1-47` | The legacy `MapZoomControls.preview.tsx` has 3 states: `Default zoom`, `Zoomed in` (both static, `ignoreClick` callbacks), `Interactive` (wired to the real `useMapPanZoom()`). Ported into the new component folder; the legacy preview file and its `registry.ts` entry are deleted in Phase 1. |
| `docs/README.md` sections to update | `:33` (`src/modules/` bullet), `:40-61` (the `game/components/` and `game/hooks/` bullet lists — 9 of these bullets describe files this row moves or deletes) | Mirror the `src/modules/combat/` paragraph added by the combat-dialog precedent; trim the legacy bullets for files that move; `GameBoard.tsx`'s bullet (`:42`) gets one added sentence noting it now imports `MapGrid` from `@/modules/map` (same pattern as its existing `GameDialogManager.tsx` bullet, `:46`). |

## Decisions
- **Domain name `map`**, per the example domain list in component-architecture (`hud, combat, cards, lobby, map`).
- **`GameBoard.tsx` stays in `src/features/game/components/`; only its `MapGrid` import changes.** Same reasoning as the combat-dialog precedent's `GameDialogManager.tsx`: it renders `TutorialBeacon`, `PlayerInfoBar`, `GameDialogManager`, `ActionsPanel`, `GameLog` directly in its JSX (`GameBoardHeader`/`GameStatusBadge` have already moved to `@/modules/hud`, but that doesn't change the conclusion) — none of the remaining five migrate in this row (rows #5/#7, still legacy) — and a module `.tsx` has no import path for `@/features/*` at all. Migrating those is out of scope.
- **Pull in `AnimatedMonster.tsx` and `DeathEffect.tsx`** — see "Correction to triage's file list" above. Both get the "local UI state, no context" treatment (hook + view, no `NameView` split), matching `AnimatedMonster`/`DeathEffect`'s actual shape (no `useGameBoard()`).
- **Connected components (hook reads `useGameBoard()`) get the `NameView`/`Name` split**: `MapGrid`, `IslandTile`, `TileBoats`, `TileOccupants`, `TileResources`. **Pure components do not**: `TileForest`, `MapDecorations`, `MapZoomControls`, `AnimatedMonster`, `DeathEffect` (the last two manage only local UI state derived from props, same carve-out the combat-dialog precedent used for its dialogs' local `selectedCard`/`isRolling` state).
- **`useMapPanZoom` splits into three files inside the `MapGrid` component folder**, not a new component of its own, because its only production consumer is `MapGrid` (the preview's "Interactive" state imports it from there too, via the module's internal relative-import rule — same module, index-based). Split, preserving every value/behavior exactly:
  - `MapGrid.pan.hook.ts` — `usePan`: pan state, `clampPan` (parameterized by zoom, unchanged), `schedulePanUpdate`, mouse drag handlers, single-finger touch drag handlers, shared touch-end cleanup.
  - `MapGrid.zoom-state.hook.ts` — `useZoomState`: `zoom`/`setZoom` state, `defaultZoom`, `minZoom`/`maxZoom`, `DEFAULT_DESKTOP_ZOOM` constant (re-exported).
  - `MapGrid.pan-zoom.hook.ts` — `useMapPanZoom` (name preserved): composes the two above, adds `zoomIn`/`zoomOut`/`resetZoom`, wheel handling, and the two-finger pinch dispatch (reading `pan`/`clampPan` from the pan hook, `zoom`/`setZoom` from the zoom-state hook) — this is where the original `handleTouchStart`/`handleTouchMove`'s `touches.length === 1` vs `=== 2` branches become two separate call sites instead of one branching function; no other function's internals change. Public return shape identical to today's, `isDragging` included (see below).
  - This mirrors the combat-dialog precedent's `MonsterCombatDialog` 3-screen split: forced by the 150-line cap, split along real responsibility boundaries (pan state vs zoom state vs the actions that touch both), not arbitrarily.
- **Drop one dead destructure**: `MapGrid`'s unused `isDragging` (the hook `useMapPanZoom` still returns it — preserving that hook's exact public contract — but `MapGrid.hook.ts`'s view model simply does not forward it to the view). Doesn't affect rendered output; would fail `no-unused-vars` once linted. (`TileBoats`'s `localPlayer` is NOT dead — see Verified context; it stays in `useTileBoats` and in `toTileBoatsViewModel`'s signature.)
- **`MapDecorations`' static layout arrays (`FIXED_ROCK_LAYOUT`, `FIXED_CLOUD_LAYOUT`) live in `MapDecorations.map.ts`** alongside the pure `isMobile` filter, not in a separate "fixtures" file — they are real production data consumed by the view, not test/preview fixtures (component-architecture's `.fixtures.ts` row is explicitly for deterministic *test* data).
- **No shared `.styles.ts` across the tile components yet.** Some classes look alike (absolute-positioned overlays, `pointer-events-none`) but kiss-dry-solid's "third copy" threshold isn't met by two or three one-off positioning strings — each component keeps its own, copied verbatim.
- **AnimatedMonster/DeathEffect get a plain characterization pass, not a dedicated characterization-test phase step**: both are small (68/47 lines), already untested, and their new `.hook.test.ts`/`.test.tsx` (written against the fresh implementation, using `jest.useFakeTimers()` and a mocked `Math.random`/`Date.now` where needed) is the first test either has ever had — there is no legacy behavior to separately pin down beyond what those new tests assert directly.
- Rejected: moving `GameBoard.tsx` itself — forced out by the `.tsx`-cannot-import-`@/features/*` rule, no simpler structure meets both that boundary and the "pixel-identical" requirement.
- Rejected: a `.service.ts` anywhere in this module — no Firestore or other I/O in any of these 10 (+2) components.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| **Phase 1 — MapZoomControls + pan/zoom hook** |||
| `src/modules/map/components/MapZoomControls/MapZoomControls.types.ts` | new | `MapZoomControlsProps`, copied unchanged. | implementer-a |
| `src/modules/map/components/MapZoomControls/index.ts` | new | Component public API. | implementer-a |
| `src/modules/map/components/MapZoomControls/MapZoomControls.styles.ts` | new | Every Tailwind class, copied verbatim. | implementer-b |
| `src/modules/map/components/MapZoomControls/MapZoomControls.tsx` | new | The view (pure, prop-driven, no hook). | implementer-b |
| `src/modules/map/components/MapZoomControls/MapZoomControls.test.tsx` | new | tester-b |
| `src/modules/map/components/MapZoomControls/MapZoomControls.preview.tsx` | new | Ports the 3 states from the legacy preview. | preview-a |
| `src/modules/map/components/MapGrid/MapGrid.pan.hook.ts` | new | `usePan`: pan state, `clampPan`, drag handlers. | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.zoom-state.hook.ts` | new | `useZoomState`: zoom value state, `DEFAULT_DESKTOP_ZOOM`. | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.pan-zoom.hook.ts` | new | `useMapPanZoom`: composes the two above + actions. | implementer-a |
| `src/modules/map/components/MapGrid/index.ts` | new (Phase 1: exports `useMapPanZoom`, `DEFAULT_DESKTOP_ZOOM`); edit (Phase 3 adds `MapGrid`) | Component public API. | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.pan.hook.test.ts` | new | tester-a |
| `src/modules/map/components/MapGrid/MapGrid.zoom-state.hook.test.ts` | new | tester-a |
| `src/modules/map/components/MapGrid/MapGrid.pan-zoom.hook.test.ts` | new | tester-a |
| `src/testbed/registry.ts` | edit | Swap `mapZoomControlsPreview` import to `@/modules/map/components/MapZoomControls/MapZoomControls.preview`. | preview-a |
| `src/testbed/legacy/MapZoomControls.preview.tsx` | deleted | End of Phase 1. | implementer-b |
| `src/features/game/components/MapZoomControls.tsx`, `src/features/game/hooks/useMapPanZoom.ts` | deleted | End of Phase 1. | implementer-b |
| **Phase 2 — IslandTile + tile children + AnimatedMonster/DeathEffect** |||
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.types.ts` | new | Props. | implementer-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.ts` | new | `useAnimatedMonster`: interval state. | implementer-a |
| `src/modules/map/components/AnimatedMonster/index.ts` | new | implementer-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.styles.ts` | new | implementer-b |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.tsx` | new | implementer-b |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.hook.test.ts` | new | tester-a |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.test.tsx` | new | tester-b |
| `src/modules/map/components/AnimatedMonster/AnimatedMonster.preview.tsx` | new | preview-b |
| `src/modules/map/components/DeathEffect/DeathEffect.types.ts` | new | implementer-a |
| `src/modules/map/components/DeathEffect/DeathEffect.hook.ts` | new | `useDeathEffect`: visibility/timeout state. | implementer-a |
| `src/modules/map/components/DeathEffect/index.ts` | new | implementer-a |
| `src/modules/map/components/DeathEffect/DeathEffect.tsx` | new | implementer-b |
| `src/modules/map/components/DeathEffect/DeathEffect.hook.test.ts` | new | tester-a |
| `src/modules/map/components/DeathEffect/DeathEffect.test.tsx` | new | tester-b |
| `src/modules/map/components/DeathEffect/DeathEffect.preview.tsx` | new | preview-b |
| `src/modules/map/components/TileForest/TileForest.types.ts` | new | implementer-a |
| `src/modules/map/components/TileForest/TileForest.map.ts` | new | `toForestLayout` (pure), `TREE_SPRITES` (re-exported). | implementer-a |
| `src/modules/map/components/TileForest/TileForest.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/TileForest/index.ts` | new | implementer-a |
| `src/modules/map/components/TileForest/TileForest.tsx` | new | implementer-b |
| `src/modules/map/components/TileForest/TileForest.map.test.ts` | new | tester-a |
| `src/features/game/components/__tests__/TileForest.test.tsx` → `src/modules/map/components/TileForest/TileForest.test.tsx` | moved, adapted | tester-b |
| `src/modules/map/components/TileForest/TileForest.preview.tsx` | new | preview-b |
| `src/modules/map/components/TileResources/TileResources.types.ts` | new | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.ts` | new | `toTileResourcesViewModel` (pure); `FARM_SPRITES`, `RESOURCE_SPRITES`, slot constants. | implementer-a |
| `src/modules/map/components/TileResources/TileResources.hook.ts` | new | `useTileResources`: reads `useGameBoard()` for `players`, delegates to the map fn. | implementer-a |
| `src/modules/map/components/TileResources/TileResources.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/TileResources/index.ts` | new | implementer-a |
| `src/modules/map/components/TileResources/TileResources.tsx` | new | `TileResourcesView` + `TileResources`. | implementer-b |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | new | tester-a |
| `src/modules/map/components/TileResources/TileResources.hook.test.ts` | new | tester-a |
| `src/features/game/components/__tests__/TileResources.test.tsx` → `src/modules/map/components/TileResources/TileResources.test.tsx` | moved, adapted to test `TileResourcesView` with fixtures (no mock needed) | tester-b |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | new | preview-b |
| `src/modules/map/components/TileBoats/TileBoats.types.ts` | new | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | new | `toTileBoatsViewModel` (pure); `COLLECTOR_IDLE_SPRITES`, `BOAT_CORNER_POSITIONS` (re-exported). | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.hook.ts` | new | `useTileBoats`: reads `useGameBoard()` for `gameState` and `localPlayer` (both needed — `localPlayer` drives fog-of-war visibility, see Verified context). | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/TileBoats/index.ts` | new | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.tsx` | new | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | new | tester-a |
| `src/modules/map/components/TileBoats/TileBoats.hook.test.ts` | new | tester-a |
| `src/features/game/components/__tests__/TileBoats.test.tsx` → `src/modules/map/components/TileBoats/TileBoats.test.tsx` | moved, adapted | tester-b |
| `src/modules/map/components/TileBoats/TileBoats.preview.tsx` | new | preview-b |
| `src/modules/map/components/TileOccupants/TileOccupants.types.ts` | new | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.ts` | new | `useTileOccupants`: reads `useGameBoard()`, `Date.now()` (impure, stays here per triage's impurity check). | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/TileOccupants/index.ts` | new | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.tsx` | new | implementer-b |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.test.ts` | new | tester-a |
| `src/features/game/components/__tests__/TileOccupants.test.tsx` → `src/modules/map/components/TileOccupants/TileOccupants.test.tsx` | moved, adapted | tester-b |
| `src/modules/map/components/TileOccupants/TileOccupants.preview.tsx` | new | preview-b |
| `src/modules/map/components/IslandTile/IslandTile.types.ts` | new | Props, view-model types. | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.map.ts` | new | `toIslandTileViewModel` (pure booleans/derivations only, excludes `deathAnimationOnTile`/`borderImageSequence`). | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.hook.ts` | new | `useIslandTile`: reads `useGameBoard()`, `Date.now()`, `Math.random()`-seeded `borderImageSequence`; merges with the pure map result. | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/IslandTile/index.ts` | new | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.styles.ts` | new | Button classes, `playerTileIndicatorClasses`. | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.tsx` | new | `IslandTileView` + `IslandTile`; renders `AnimatedMonster`, `TileForest`, `TileBoats`, `TileResources`, `TileOccupants`, `DeathEffect` from sibling folders. | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.map.test.ts` | new | tester-a |
| `src/modules/map/components/IslandTile/IslandTile.hook.test.ts` | new | tester-a |
| `src/modules/map/components/IslandTile/IslandTile.test.tsx` | new | tester-b |
| `src/modules/map/components/IslandTile/IslandTile.preview.tsx` | new | preview-b |
| `src/features/game/components/{IslandTile,TileBoats,TileForest,TileOccupants,TileResources,AnimatedMonster,DeathEffect}.tsx` | deleted | End of Phase 2, once verified. | implementer-b |
| **Phase 3 — MapGrid, MapDecorations, GameBoard wiring, docs** |||
| `src/modules/map/components/MapDecorations/MapDecorations.types.ts` | new | `RockDef`, `CloudDef`. | implementer-a |
| `src/modules/map/components/MapDecorations/MapDecorations.map.ts` | new | `FIXED_ROCK_LAYOUT`, `FIXED_CLOUD_LAYOUT`, `toVisibleDecorations` (pure). | implementer-a |
| `src/modules/map/components/MapDecorations/index.ts` | new | implementer-a |
| `src/modules/map/components/MapDecorations/MapDecorations.tsx` | new | implementer-b |
| `src/modules/map/components/MapDecorations/MapDecorations.map.test.ts` | new | tester-a |
| `src/features/game/components/__tests__/MapDecorations.test.tsx` → `src/modules/map/components/MapDecorations/MapDecorations.test.tsx` | moved, adapted | tester-b |
| `src/modules/map/components/MapDecorations/MapDecorations.preview.tsx` | new | preview-a |
| `src/modules/map/components/MapGrid/MapGrid.types.ts` | new | `MapGridViewModel`. | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.map.ts` | new | `toGridDimensions` (pure). | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.hook.ts` | new | `useMapGrid`: reads `useGameBoard()`, `useIsMobile()`, calls `useMapPanZoom` + `toGridDimensions`; drops unused `isDragging`. | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.fixtures.ts` | new | implementer-a |
| `src/modules/map/components/MapGrid/index.ts` (edit) | edit | Adds `MapGrid` export. | implementer-a |
| `src/modules/map/index.ts` | new | Module public API: `export { MapGrid } from './components/MapGrid';` | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.styles.ts` | new | implementer-b |
| `src/modules/map/components/MapGrid/MapGrid.tsx` | new | `MapGridView` + `MapGrid`. | implementer-b |
| `src/modules/map/components/MapGrid/MapGrid.map.test.ts` | new | tester-a |
| `src/modules/map/components/MapGrid/MapGrid.hook.test.ts` | new | tester-a |
| `src/modules/map/components/MapGrid/MapGrid.test.tsx` | new | tester-b |
| `src/modules/map/components/MapGrid/MapGrid.preview.tsx` | new | preview-a |
| `src/features/game/components/GameBoard.tsx` | edit | Swap `import { MapGrid } from './MapGrid';` to `import { MapGrid } from '@/modules/map';`. No other line changes. | implementer-b |
| `src/features/game/components/MapGrid.tsx` | deleted | End of Phase 3. | implementer-b |
| `docs/README.md` | edit | `:33` add a `src/modules/map/` clause (mirror the `combat/` one); trim `:40-61` to remove the moved bullets and add one sentence to `GameBoard.tsx`'s bullet (`:42`) about the `@/modules/map` import. | implementer-b |

If any file exceeds 150 counted lines, the owner splits it by responsibility (not arbitrarily) and reports the added file. Do not trim comments or compress code to fit.

## Contracts
```ts
// ======================================================================
// Phase 1 — src/modules/map/components/MapZoomControls/MapZoomControls.types.ts
// ======================================================================
export interface MapZoomControlsProps {
  zoom: number;
  defaultZoom?: number;        // default 0.85, matches legacy MapZoomControls.tsx:18
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}
// MapZoomControls.tsx: pure view, copies legacy MapZoomControls.tsx:16-83 verbatim
// (percentage = Math.round(zoom*100), defaultPercentage = Math.round(defaultZoom*100)).
export function MapZoomControls(props: MapZoomControlsProps): JSX.Element;

// ======================================================================
// Phase 1 — src/modules/map/components/MapGrid/MapGrid.pan.hook.ts
// ======================================================================
export interface UsePanOptions {
  isMobile: boolean;
  maxPanX?: number;
  maxPanY?: number;
}
export interface PanState {
  pan: { x: number; y: number };
  isDragging: boolean;
  clampPan: (x: number, y: number, currentZoom: number) => { x: number; y: number }; // legacy :38-50, unchanged
  resetPan: () => void; // setPan({x:0,y:0})
  setPanClamped: (updater: (current: { x: number; y: number }) => { x: number; y: number }) => void; // wraps setPan, used by zoom actions
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;   // legacy :88-101
    onMouseMove: (e: React.MouseEvent) => void;   // legacy :103-121, calls schedulePanUpdate (internal, legacy :52-65)
    onMouseUp: () => void;                        // legacy :123-134
    onMouseLeave: () => void;                     // same as onMouseUp, legacy :226
    onTouchStart: (e: React.TouchEvent) => void;  // legacy :148-159's single-touch branch ONLY (touches.length === 1); no-ops otherwise
    onTouchMove: (e: React.TouchEvent) => void;   // legacy :171-187's single-touch branch ONLY; no-ops otherwise
    onTouchEnd: () => void;                       // legacy :200-212, shared cleanup (not branched in the original either)
  };
}
export function usePan(options: UsePanOptions, zoom: number): PanState;

// ======================================================================
// Phase 1 — src/modules/map/components/MapGrid/MapGrid.zoom-state.hook.ts
// ======================================================================
export const DEFAULT_DESKTOP_ZOOM = 0.85; // legacy :5, exported unchanged
export interface UseZoomStateOptions {
  initialZoom?: number;
  isMobile?: boolean;
}
export interface ZoomState {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  defaultZoom: number;
  minZoom: number; // 0.85 desktop / 0.75 mobile, legacy :6,8
  maxZoom: number; // 1.15 desktop / 1.35 mobile, legacy :7,9
}
export function useZoomState(options: UseZoomStateOptions): ZoomState;

// ======================================================================
// Phase 1 — src/modules/map/components/MapGrid/MapGrid.pan-zoom.hook.ts
// ======================================================================
export interface UseMapPanZoomOptions {
  initialZoom?: number;
  isMobile?: boolean;
  maxPanX?: number;
  maxPanY?: number;
}
export interface UseMapPanZoomResult {
  zoom: number;
  pan: { x: number; y: number };
  defaultZoom: number;
  isDragging: boolean;           // preserved in this hook's own public shape (see Decisions)
  zoomIn: () => void;            // legacy :67-73, step 0.15, clamps pan after
  zoomOut: () => void;           // legacy :75-81
  resetZoom: () => void;         // legacy :83-86, resets zoom to default AND pan to {0,0}
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onWheel: (e: React.WheelEvent) => void;       // legacy :136-145
    onTouchStart: (e: React.TouchEvent) => void;  // dispatches: 1 finger -> pan.dragHandlers.onTouchStart; 2 fingers -> pinch start (legacy :160-168)
    onTouchMove: (e: React.TouchEvent) => void;   // dispatches: 1 finger -> pan.dragHandlers.onTouchMove; 2 fingers -> pinch move (legacy :188-197)
    onTouchEnd: () => void;                       // calls pan.dragHandlers.onTouchEnd() + resets the pinch-distance ref
  };
}
export function useMapPanZoom(options?: UseMapPanZoomOptions): UseMapPanZoomResult;

// ======================================================================
// Phase 2 — src/modules/map/components/AnimatedMonster/AnimatedMonster.types.ts
// ======================================================================
import type { Monster } from '@/lib/types';
export interface AnimatedMonsterProps { monster: Monster }

// AnimatedMonster.hook.ts — mirrors legacy AnimatedMonster.tsx:12-46 exactly
// (setInterval re-armed every render via the empty-deps effect; Math.random() for both the
// 25% attack chance and the +/-15% horizontal offset; interval delay Math.random()*2500+3000).
// IMPORTANT: the legacy style is a branch, not one formula (AnimatedMonster.tsx:45-58):
//   const transform = `translateX(${horizontalOffset}%) ${isFlipped ? 'scaleX(-1)' : ''}`;  // :46
//   style={{ transform: isAttacking ? (isFlipped ? 'scaleX(-1)' : '') : transform }}         // :58
// While attacking, translateX is dropped entirely — only the flip (or nothing) applies. The
// hook must compute this final, already-branched value itself; do not expose a single
// `transform` field built from line 46 alone (that would shift the monster's position during
// every attack frame — a visible regression).
export interface AnimatedMonsterState {
  spriteSrc: string;       // monster.sprite.attack when isAttacking, else .idle
  styleTransform: string;  // the already-branched value: isAttacking ? (isFlipped ? 'scaleX(-1)' : '') : `translateX(${horizontalOffset}%) ${isFlipped ? 'scaleX(-1)' : ''}`
}
export function useAnimatedMonster(monster: Monster): AnimatedMonsterState;
// AnimatedMonster.tsx: applies `style={{ transform: styleTransform }}` directly — the view
// does no branching of its own.

// ======================================================================
// Phase 2 — src/modules/map/components/DeathEffect/DeathEffect.types.ts
// ======================================================================
export interface DeathEffectProps { sprite: string; id: string; createdAt?: number }
export const DEATH_ANIMATION_DURATION = 1200; // legacy :12, exported unchanged

// DeathEffect.hook.ts — mirrors legacy DeathEffect.tsx:14-27 exactly.
export interface DeathEffectState {
  isVisible: boolean;
  freshSpriteSrc: string; // `${sprite}?anim=${id}`, legacy :32
}
export function useDeathEffect(props: DeathEffectProps): DeathEffectState;

// ======================================================================
// Phase 2 — src/modules/map/components/TileForest/TileForest.types.ts
// ======================================================================
import type { Island } from '@/lib/types';
export interface TileForestProps { island: Island; isBase?: boolean }
export const TREE_SPRITES = [ /* legacy :13-18, unchanged */ ] as const;

// TileForest.map.ts — pure, mirrors legacy TileForest.tsx:23-66 exactly.
export interface TreeSlot { top?: string; bottom?: string; left?: string; right?: string; size: number; z: number }
export interface ForestLayout { treeSprite: (typeof TREE_SPRITES)[number]; layout: TreeSlot[] }
export function toForestLayout(island: Island, isBase: boolean): ForestLayout | null;
// null exactly when the legacy component would render null (Resource type, or living-Monster type).

// ======================================================================
// Phase 2 — src/modules/map/components/TileResources/TileResources.types.ts
// ======================================================================
import type { Island, Player, ResourceType, PlayerColor } from '@/lib/types';
export interface TileResourcesProps { island: Island; isBase?: boolean }

// TileResources.map.ts — pure, mirrors legacy TileResources.tsx:58-175 exactly.
export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  nodeSize: number;
  slotStyle: { top?: string; bottom?: string; left?: string; right?: string; transform?: string };
  farmingCollector: { color: PlayerColor; sprite: string } | null;
}
export function toTileResourcesViewModel(
  island: Island,
  isBase: boolean,
  players: Player[],
): ResourceNodeViewModel[] | null; // null when suppressed (monster island) or no resources

// TileResources.hook.ts
export function useTileResources(props: TileResourcesProps): { nodes: ResourceNodeViewModel[] | null };

// ======================================================================
// Phase 2 — src/modules/map/components/TileBoats/TileBoats.types.ts
// ======================================================================
import type { GameState, Island, Player, PlayerColor } from '@/lib/types';
export interface TileBoatsProps { island: Island }
export const BOAT_CORNER_POSITIONS = [ /* legacy :22-27, unchanged */ ];

// TileBoats.map.ts — pure, mirrors legacy TileBoats.tsx:30-115 exactly, INCLUDING the
// `isPersonallyRevealed`/fog-of-war visibility check (legacy :33,36-49) — `localPlayer` is a
// required input, not dead (see Verified context: it is read at :33 and drives the fogOfWar
// branch of isTileVisible at :41-42).
export interface BoatEntryViewModel {
  key: string;
  color: PlayerColor;
  cornerStyle: Record<string, string>;
  showIdleCollector: boolean;
  idleCollectorSprite?: string;
}
export function toTileBoatsViewModel(
  island: Island,
  players: GameState['players'],
  localPlayer: Player | null,
  debugMode: boolean,
  fogOfWar: boolean,
): BoatEntryViewModel[] | null;
// null when the tile isn't visible (legacy :47-49, mirrors isTileVisible exactly) or there are
// no boats to show (legacy :99-101, empty occupants and no base owner).

// TileBoats.hook.ts — reads useGameBoard() for gameState AND localPlayer (both required).
export function useTileBoats(props: TileBoatsProps): { boats: BoatEntryViewModel[] | null };

// ======================================================================
// Phase 2 — src/modules/map/components/TileOccupants/TileOccupants.types.ts
// ======================================================================
import type { Island, PlayerColor } from '@/lib/types';
export interface TileOccupantsProps { island: Island }

// TileOccupants.hook.ts — mirrors legacy TileOccupants.tsx:22-69 exactly (Date.now() stays
// here, not in a .map.ts, per triage's impurity note).
export interface OccupantSpriteViewModel {
  key: string;
  color: PlayerColor;
  sprite: string;
  positionClasses: string; // the `pos.origin`-derived cn() result, legacy :74-90
  isFaded: boolean;        // army.hasActed
}
export function useTileOccupants(props: TileOccupantsProps): { occupants: OccupantSpriteViewModel[] };

// ======================================================================
// Phase 2 — src/modules/map/components/IslandTile/IslandTile.types.ts
// ======================================================================
import type { Island, Player, PlayerColor } from '@/lib/types';
export interface IslandTileProps { island: Island }

// IslandTile.map.ts — pure, mirrors legacy IslandTile.tsx:42-80,144-148 exactly. Excludes
// deathAnimationOnTile (Date.now) and borderImageSequence (Math.random) — those stay in the hook.
export interface IslandTileStaticViewModel {
  isSelected: boolean;
  isPossibleMove: boolean;
  isTeleportTarget: boolean;
  isScoutTarget: boolean;
  isTileVisible: boolean;
  isBase: boolean;
  baseOwner: Player | null;
  tilePlayerColor: PlayerColor | null;
  isClickable: boolean;
}
export function toIslandTileViewModel(
  island: Island,
  context: { gameState: GameState; localPlayer: Player; uiState: GameBoardUIState; selectedArmy: Army | null },
): IslandTileStaticViewModel;
// (import type { GameState, Army } from '@/lib/types'; import type { GameBoardUIState } from '@/modules/game-board')

// IslandTile.hook.ts
export interface IslandTileViewModel extends IslandTileStaticViewModel {
  island: Island;
  deathAnimationOnTile: DeathAnimation | undefined; // legacy :56-59, needs Date.now()
  borderImageSequence: [string, string, string];    // legacy :82-85, needs Math.random(), computed once per mount
  onClick: () => void; // wraps handleTileClick(island.x, island.y)
}
export function useIslandTile(props: IslandTileProps): IslandTileViewModel;
// IslandTile.tsx: IslandTileView(viewModel) renders AnimatedMonster/TileForest/TileBoats/
// TileResources/TileOccupants/DeathEffect from their sibling component folders
// (`import { TileForest } from '../TileForest'` etc.), getTileCenterContent()/renderMonsterIcons()
// stay as internal JSX-selection functions in the view (legacy :93-142), reading only viewModel
// fields + island.type/monsters/resources — no additional logic.

// ======================================================================
// Phase 3 — src/modules/map/components/MapDecorations/MapDecorations.types.ts
// ======================================================================
export interface RockDef { id: string; src: string; left: string; top: string; size: number; desktopOnly?: boolean }
export interface CloudDef { id: string; src: string; left: string; top: string; width: number; height: number; opacity?: number; desktopOnly?: boolean }
export interface MapDecorationsProps { isMobile?: boolean }

// MapDecorations.map.ts — FIXED_ROCK_LAYOUT/FIXED_CLOUD_LAYOUT copied verbatim from legacy
// MapDecorations.tsx:26-118 (every id/src/left/top/size/opacity/desktopOnly value unchanged).
export const FIXED_ROCK_LAYOUT: RockDef[];
export const FIXED_CLOUD_LAYOUT: CloudDef[];
export function toVisibleDecorations(isMobile: boolean): { rocks: RockDef[]; clouds: CloudDef[] };

// ======================================================================
// Phase 3 — src/modules/map/components/MapGrid/MapGrid.types.ts
// ======================================================================
import type { Island } from '@/lib/types';
export interface MapGridViewModel {
  map: Island[];
  cols: number;
  rows: number;
  isMobile: boolean;
  zoom: number;
  pan: { x: number; y: number };
  defaultZoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handlers: UseMapPanZoomResult['handlers'];
}
// MapGrid.map.ts — pure, mirrors legacy MapGrid.tsx:22-30 exactly (MAP_COLS/MAP_ROWS fallback
// when map is empty).
export function toGridDimensions(map: Island[]): { cols: number; rows: number };

// MapGrid.hook.ts
export function useMapGrid(): MapGridViewModel | null; // null exactly when map is empty, legacy :32

// MapGrid.tsx: MapGridView(viewModel) renders MapZoomControls, MapDecorations, and the
// IslandTile grid exactly as legacy MapGrid.tsx:34-78; MapGrid() = viewModel && <MapGridView .../>.
export function MapGrid(): JSX.Element | null;

// ======================================================================
// src/modules/map/index.ts
// ======================================================================
export { MapGrid } from './components/MapGrid';

// ======================================================================
// src/features/game/components/GameBoard.tsx — the only edit (one import line)
// ======================================================================
// Replace:  import { MapGrid } from './MapGrid';
// With:     import { MapGrid } from '@/modules/map';
// No other line changes (JSX at :38 stays byte-identical).
```

## Phases
### Phase 1: MapZoomControls + the pan/zoom hook
1. (implementer-a) `MapZoomControls.types.ts`.
2. (implementer-b) `MapZoomControls.styles.ts`, `MapZoomControls.tsx`, component `index.ts`.
3. (tester-b) `MapZoomControls.test.tsx`: renders the three callback buttons, shows `Math.round(zoom*100)%`, clicking each button calls its handler, tooltip shows `Reset Zoom (<defaultPercentage>%)`.
4. (implementer-a) `MapGrid.pan.hook.ts`, `MapGrid.zoom-state.hook.ts`, `MapGrid.pan-zoom.hook.ts`, `MapGrid` component `index.ts` (exports `useMapPanZoom`, `DEFAULT_DESKTOP_ZOOM`).
5. (tester-a) `MapGrid.pan.hook.test.ts`, `MapGrid.zoom-state.hook.test.ts`, `MapGrid.pan-zoom.hook.test.ts` — cases per Test plan.
6. (preview-a) `MapZoomControls.preview.tsx` (ports the 3 states, Interactive imports `useMapPanZoom` from `../MapGrid`); register in `src/testbed/registry.ts`; delete `src/testbed/legacy/MapZoomControls.preview.tsx` and its old registry import.
7. (implementer-b) Delete `src/features/game/components/MapZoomControls.tsx` and `src/features/game/hooks/useMapPanZoom.ts` — first confirm `MapGrid.tsx` (legacy) has not yet been repointed (it still imports these; Phase 1 does NOT touch `MapGrid.tsx` itself, so this step must wait until Phase 3 repoints `MapGrid.tsx`'s own imports to the new hook). **Reorder: do not delete the legacy files in this phase; they are still imported by the legacy `MapGrid.tsx` until Phase 3.** Keep both legacy files until Phase 3's wiring step, then delete them together with the legacy `MapGrid.tsx`.
8. Run `npx jest src/modules/map/components/MapZoomControls src/modules/map/components/MapGrid src/features/game/components`; all green.
9. ui-verify: screenshot the new `MapZoomControls` preview's states.
10. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none (pure extraction, well-understood boundaries).

### Phase 2: IslandTile and its tile children
1. (implementer-a) `AnimatedMonster.types.ts`, `.hook.ts`, `index.ts`; `DeathEffect.types.ts`, `.hook.ts`, `index.ts`.
2. (implementer-b) `AnimatedMonster.styles.ts`, `.tsx`; `DeathEffect.tsx` (no styles file needed — single className, inline per architecture's "runtime numbers only" carve-out does not apply here; if the one className warrants it for consistency, a minimal `.styles.ts` is fine either way, owner's call).
3. (tester-a) `AnimatedMonster.hook.test.ts` (fake timers + mocked `Math.random`), `DeathEffect.hook.test.ts` (fake timers + `Date.now`).
4. (tester-b) `AnimatedMonster.test.tsx`, `DeathEffect.test.tsx`.
5. (preview-b) `AnimatedMonster.preview.tsx`, `DeathEffect.preview.tsx`; register both.
6. (implementer-a) `TileForest.types.ts`, `.map.ts`, `.fixtures.ts`, `index.ts`.
7. (tester-a) `TileForest.map.test.ts` — cases per Test plan.
8. (implementer-b) `TileForest.tsx`.
9. (tester-b) Move + adapt `TileForest.test.tsx` from `src/features/game/components/__tests__/`.
10. (preview-b) `TileForest.preview.tsx`; register.
11. (implementer-a) `TileResources.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`.
12. (tester-a) `TileResources.map.test.ts`, `TileResources.hook.test.ts`.
13. (implementer-b) `TileResources.tsx`.
14. (tester-b) Move + adapt `TileResources.test.tsx` to render `TileResourcesView` with fixtures (no `useGameBoard` mock needed).
15. (preview-b) `TileResources.preview.tsx`; register.
16. (implementer-a) `TileBoats.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`.
17. (tester-a) `TileBoats.map.test.ts`, `TileBoats.hook.test.ts`.
18. (implementer-b) `TileBoats.tsx`.
19. (tester-b) Move + adapt `TileBoats.test.tsx`.
20. (preview-b) `TileBoats.preview.tsx`; register.
21. (implementer-a) `TileOccupants.types.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`.
22. (tester-a) `TileOccupants.hook.test.ts`.
23. (implementer-b) `TileOccupants.tsx`.
24. (tester-b) Move + adapt `TileOccupants.test.tsx`.
25. (preview-b) `TileOccupants.preview.tsx`; register.
26. (implementer-a) `IslandTile.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`.
27. (tester-a) `IslandTile.map.test.ts`, `IslandTile.hook.test.ts`.
28. (implementer-b) `IslandTile.styles.ts`, `IslandTile.tsx` (imports the 5 sibling components).
29. (tester-b) `IslandTile.test.tsx` (new — no legacy test existed).
30. (preview-b) `IslandTile.preview.tsx`; register.
31. Run `npx jest src/modules/map src/features/game/components`; all green.
32. ui-verify: screenshot every new preview's states.
33. (implementer-b) Delete `src/features/game/components/{IslandTile,TileBoats,TileForest,TileOccupants,TileResources,AnimatedMonster,DeathEffect}.tsx` and the 4 moved `__tests__` files (`TileBoats`, `TileForest`, `TileOccupants`, `TileResources`; `IslandTile` had no test to delete).
34. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet for implementer-a/implementer-b on `IslandTile` specifically (6-way composition, the view/map/hook purity split is the most structurally risky piece of this task); haiku is fine for the 4 tile children and `AnimatedMonster`/`DeathEffect`.

### Phase 3: MapGrid, MapDecorations, GameBoard wiring, docs
1. (implementer-a) `MapDecorations.types.ts`, `.map.ts`, `index.ts`.
2. (tester-a) `MapDecorations.map.test.ts`.
3. (implementer-b) `MapDecorations.tsx`.
4. (tester-b) Move + adapt `MapDecorations.test.tsx`.
5. (preview-a) `MapDecorations.preview.tsx`; register.
6. (implementer-a) `MapGrid.types.ts`, `MapGrid.map.ts`, `MapGrid.hook.ts`, `MapGrid.fixtures.ts`; edit `MapGrid` component `index.ts` to add `MapGrid`; create `src/modules/map/index.ts`.
7. (tester-a) `MapGrid.map.test.ts`, `MapGrid.hook.test.ts`.
8. (implementer-b) `MapGrid.styles.ts`, `MapGrid.tsx`.
9. (tester-b) `MapGrid.test.tsx` (new — no legacy test existed).
10. (preview-a) `MapGrid.preview.tsx`; register.
11. (implementer-b) Swap `GameBoard.tsx`'s `MapGrid` import to `@/modules/map`.
12. (implementer-b) Delete `src/features/game/components/MapGrid.tsx` and (now unused) `src/features/game/components/MapZoomControls.tsx` / `src/features/game/hooks/useMapPanZoom.ts` if they were deliberately kept until this point per Phase 1 step 7's reorder note.
13. Run `npx jest src/modules/map src/features/game/components`; all green.
14. ui-verify: screenshot the new `MapGrid`/`MapDecorations` previews' states; if a live game page is reachable without Firebase credentials, load it and confirm the map renders and pans/zooms identically; otherwise state "unverified in browser beyond the testbed" and, if the emulator and Java 21 are available, run `npm run test:e2e -- e2e/map-viewport.spec.ts` and `e2e/gameplay.spec.ts`, reporting their result (otherwise report "not run").
15. `grep -rn "features/game/components/MapGrid\|features/game/components/IslandTile\|features/game/components/Tile\(Boats\|Forest\|Occupants\|Resources\)\|features/game/components/MapDecorations\|features/game/components/MapZoomControls\|features/game/components/AnimatedMonster\|features/game/components/DeathEffect\|features/game/hooks/useMapPanZoom" src` returns nothing; `grep -rn "@/modules/map" src` shows exactly `GameBoard.tsx` plus the module's own internal files.
16. (implementer-b) Update `docs/README.md` per the File plan.
17. `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build`.
18. architect-b final review; coordinator commits per phase: `refactor(map): migrate MapZoomControls and the pan-zoom hook [phase 1/3]`, `refactor(map): migrate IslandTile and its tile children [phase 2/3]`, `refactor(map): migrate MapGrid and MapDecorations, wire GameBoard [phase 3/3]`.

## Test plan
- tester-a (logic, first):
  - `MapGrid.pan.hook.test.ts`: `clampPan` clamps symmetrically around 0 using the mobile/desktop limits and the `scaleFactor` formula (legacy `:38-50` — test at least one in-range, one over-max-positive, one under-max-negative case, and the zoom-scaling effect); mouse-down/move/up updates `pan` only past the 4px drag threshold, `isDragging` becomes true only after that threshold; `onMouseDown` on an interactive element (button/a/input/select/`[role=button]`) still records drag start but does not immediately set `isDragging`; single-finger touch mirrors the mouse case; `onTouchStart`/`onTouchMove` no-op on a 2-touch event (pinch is not this hook's concern).
  - `MapGrid.zoom-state.hook.test.ts`: default `zoom` is `initialZoom ?? DEFAULT_DESKTOP_ZOOM`; `minZoom`/`maxZoom` switch correctly with `isMobile`.
  - `MapGrid.pan-zoom.hook.test.ts`: `zoomIn`/`zoomOut` step by 0.15 and clamp at `minZoom`/`maxZoom`; `resetZoom` sets `zoom` to `defaultZoom` and `pan` to `{0,0}`; `onWheel` zooms in/out only when `ctrlKey`/`metaKey`/`altKey` or `|deltaY| > 20` (legacy `:136-145`); two-finger `onTouchStart` + `onTouchMove` scales `zoom` by the pinch distance ratio and clamps it (legacy `:160-168,188-197`); `onTouchEnd` resets the pinch-distance ref so a subsequent single-finger touch pans normally; `isDragging` is present in the returned shape even though nothing in this module reads it.
  - `AnimatedMonster.hook.test.ts` (`jest.useFakeTimers()`, mock `Math.random`): with `Math.random` forced `< 0.25`, after the interval fires `spriteSrc` is `monster.sprite.attack` and `styleTransform` is just the flip (`''` or `'scaleX(-1)'`) — it must NOT contain `translateX`; forced `>= 0.25`, `spriteSrc` is `monster.sprite.idle` and `styleTransform` includes the new `translateX(<offset>%)` plus the optional flip; the interval delay is `Math.random()*2500+3000` (assert `setInterval` was called with a value in `[3000, 5500)` given a mocked `Math.random` sequence); unmount clears the interval.
  - `DeathEffect.hook.test.ts` (fake timers, mock `Date.now`): `isVisible` starts `true`; given `createdAt` in the past such that `elapsed >= DEATH_ANIMATION_DURATION`, the timeout fires after `100`ms (the `Math.max(100, ...)` floor, legacy `:20`) and `isVisible` becomes `false`; given no `createdAt`, the timeout fires after the full `1200`ms; `freshSpriteSrc` is `${sprite}?anim=${id}`; changing `id` or `createdAt` resets `isVisible` to `true` (effect re-runs).
  - `TileForest.map.test.ts`: `toForestLayout` returns `null` for `IslandType.Resource` and for `IslandType.Monster` with a non-empty `monsters` array; returns the 2-tree base layout when `isBase`; the 1-tree special layout for `IslandType.Special`; for Empty/Cleared islands, exactly 2 or 3 trees depending on `(seed % 2 === 0)` where `seed = |x*7 + y*13 + (isBase?3:0)|`; `treeSprite` is deterministic for the same `(x, y, type, isBase)` and cycles through `TREE_SPRITES` by `seed % 4`.
  - `TileResources.map.test.ts`: ports every case from the existing `TileResources.test.tsx` (now as pure-function assertions) — correct sprite per resource type; N distinct nodes for `amount: N` (non-base) vs exactly 1 per type when `isBase`; `isBase` uses `BASE_RESOURCE_SLOTS`; active vs idle sprite and the farming-collector entry depend on `positionedBy` matching the node's resource type, on every node of that type (dual-resource case); `null` on a monster island with living monsters; `null` with no resources.
  - `TileBoats.map.test.ts`: ports every case from the existing `TileBoats.test.tsx` — base tile with no occupants docks the owner's boat with an idle collector; 2 occupants get 2 non-overlapping corners; an occupant `positionedBy` for any resource hides its idle collector; base-tile corner assignment follows `baseCornerMap` (`0→br,1→tr,2→tr,3→bl`) by `owner.id`, falling back to `entryIndex % 4` for other ids; empty island with no occupants and no base owner returns `null` (legacy `:99-101` — visible but nothing to show renders the same as not-visible). Plus new fog-of-war cases (not in the existing suite, needed because `localPlayer` stays in scope): `debugMode: true` returns boats regardless of `fogOfWar`/`revealedTiles`; a `Base` island always returns boats regardless of `fogOfWar`; a non-base island with `fogOfWar: true` and `localPlayer.revealedTiles` NOT including the island returns `null`; the same island WITH it included returns the boats; `fogOfWar: false` returns boats whenever any player (not necessarily `localPlayer`) has revealed the tile.
  - `TileOccupants.hook.test.ts`: ports both existing cases (soldier sprite renders for an unpositioned and for a positioned army) plus: an occupant currently in `deathAnimations` within `DEATH_ANIMATION_DURATION` (hardcode `1200` or import the constant from `DeathEffect`) is suppressed; `debugMode` always shows; non-fog-of-war always shows; fog-of-war hides a non-local, non-base-tile army unless personally revealed; `army.hasActed` sets `isFaded`.
  - `IslandTile.map.test.ts`: every pure boolean/derivation from `toIslandTileViewModel` against hand-built `island`/context fixtures — `isPossibleMove` differs correctly between teleport-pending (`selectedArmyId !== null && !isOpponentBase`) and the normal case (membership in `uiState.possibleMoves`); `isScoutTarget` is `false` in `debugMode`, otherwise `fogOfWar && !revealedTiles.includes(island.id)`; `isTileVisible` is always `true` for `Base` islands and in `debugMode`; `tilePlayerColor` is non-null only when exactly one player occupies the tile and it is the local player; `isClickable` is `true` when the local player already occupies the tile even if it is not a possible move.
  - `IslandTile.hook.test.ts`: `deathAnimationOnTile` matches an animation at the island's `(x,y)` only while `now - createdAt < DEATH_ANIMATION_DURATION` (mock `Date.now`); `borderImageSequence`'s first and third entries are always `island_edge_1.gif`/`island_edge_2.gif`, the middle one varies with a mocked `Math.random`, and does not change across re-renders with the same mount (stable `useMemo`); `onClick` calls `handleTileClick(island.x, island.y)`.
  - `MapDecorations.map.test.ts`: `toVisibleDecorations(true)` excludes every `desktopOnly` rock/cloud; `toVisibleDecorations(false)` returns the full `FIXED_ROCK_LAYOUT`/`FIXED_CLOUD_LAYOUT` arrays unchanged.
  - `MapGrid.map.test.ts`: `toGridDimensions([])` returns `{ cols: MAP_COLS, rows: MAP_ROWS }`; a non-empty `map` returns `max(x)+1`/`max(y)+1`.
  - `MapGrid.hook.test.ts`: returns `null` when `gameState.map` is empty; otherwise assembles `cols`/`rows`/`isMobile`/the pan-zoom fields into one object, with `isDragging` NOT present in the returned shape (dropped, see Decisions).
- tester-b (view and e2e):
  - `MapZoomControls.test.tsx`: as in Contracts/Phase 1 step 3.
  - `AnimatedMonster.test.tsx`, `DeathEffect.test.tsx`: render with a fixture `Monster`/sprite, assert the initial idle sprite / visible death frame; `next/image` mocked per `.claude/skills/testing/SKILL.md`.
  - `TileForest.test.tsx` (adapted from the moved file): ports its 5 existing cases (default renders `tile-forest`/`tile-forest-tree` nodes, suppressed on Resource islands, base layout, suppressed on monster islands with monsters, NOT suppressed on a defeated-monster — now-empty — monster island) against the new `TileForest` + `TileForest.fixtures.ts`.
  - `TileResources.test.tsx` (adapted): renders `TileResourcesView` directly with a view-model fixture for each of its 6 existing cases — no `useGameBoard` mock needed anymore.
  - `TileBoats.test.tsx` (adapted): same pattern, 3 existing cases, via `TileBoatsView` + fixtures.
  - `TileOccupants.test.tsx` (adapted): same pattern, 2 existing cases, via `TileOccupantsView` + fixtures.
  - `MapDecorations.test.tsx` (adapted): 3 existing cases (mobile filters out `desktopOnly`, desktop renders all, rocks+clouds both present) against the new component.
  - `IslandTile.test.tsx` (new): one case per island type's center content (Base with/without owner, Special, Resource, Monster, Empty); clicking a clickable tile calls `onClick`; selected/possible-move/teleport/scout border classes each appear only under their condition; fog-of-war hides content behind the `HelpCircle` fallback.
  - `MapGrid.test.tsx` (new): renders `null` when the fixture `GameState.map` is empty; otherwise renders the zoom controls, decorations, and one `IslandTile` per fixture island; the pan/zoom transform's inline `style` reflects the hook's `pan`/`zoom`.
  - e2e: run `npm run test:e2e -- e2e/map-viewport.spec.ts` and `e2e/gameplay.spec.ts` in Phase 3 if the emulator and Java 21 are available; otherwise report "not run" (no new user-visible flow, no new spec needed).

## Preview states
- `MapZoomControls` (group "Game map"): Default zoom, Zoomed in, Interactive.
- `AnimatedMonster` (group "Game map"): Idle, Attacking (force via a wrapper that mocks `Math.random`).
- `DeathEffect` (group "Game map"): Visible, Expired (createdAt far in the past).
- `TileForest` (group "Game map"): Empty island (2 trees), Empty island (3 trees), Base tile, Special island, Suppressed (Resource island).
- `TileResources` (group "Game map"): Single food node, dual gold nodes (one farmed), base tile banner, suppressed (monster island).
- `TileBoats` (group "Game map"): Base tile boat, two-occupant contested tile, idle collector hidden while farming.
- `TileOccupants` (group "Game map"): Visible army, faded (`hasActed`) army, hidden under fog of war.
- `IslandTile` (group "Game map"): Base (owned/unowned), Resource, Monster, Special, Empty, fog-of-war-hidden, selected, possible-move highlight.
- `MapDecorations` (group "Game map"): Desktop, Mobile.
- `MapGrid` (group "Game map"): Populated board, empty map (renders nothing).

## Risks
- The `useMapPanZoom` 3-way split changing pinch/pan interaction subtly (e.g. a stale `clampPan` closure after the split). Mitigation: `MapGrid.pan-zoom.hook.test.ts` exercises the pinch + pan interplay directly; ui-verify on the live preview before deleting the legacy hook.
- `IslandTile`'s pure/impure split misplacing a formula (e.g. `isTileVisible` accidentally gaining a `Date.now()` dependency). Mitigation: `IslandTile.map.test.ts` pins every boolean independently; `toIslandTileViewModel` takes no `Date.now`/`Math.random` input at all, enforced by its signature.
- Triage's file list was incomplete (missed `AnimatedMonster`/`DeathEffect`) — the same grep-based call-site check could still be missing something. Mitigation: Phase 3 step 15's exhaustive `grep` across `src` for every one of the 10+2 old paths, run after all deletions, before the final review.
- Visual drift during Tailwind-class extraction into `.styles.ts` (`IslandTile`, `MapGrid`, `MapZoomControls`). Mitigation: "copy verbatim" instruction + ui-verify screenshots per phase before deleting each legacy file.
- Deleting a legacy file while another not-yet-migrated legacy file still imports it (e.g. legacy `MapGrid.tsx` still importing legacy `MapZoomControls.tsx`/`useMapPanZoom.ts` until Phase 3). Mitigation: Phase 1 step 7 explicitly defers those two deletions to Phase 3; Phase 3 step 12 performs them once `MapGrid.tsx` itself is gone.

## Review (architect-b)
VERDICT: APPROVED

Revision note (addressed, for this pass's reviewer): architect-b's last CHANGES REQUESTED verdict found the Test plan's `TileBoats.map.test.ts` entry contradicted the Contracts section — Contracts correctly says `toTileBoatsViewModel` returns `null` for a visible tile with zero boats (legacy `TileBoats.tsx:99-101`), but the Test plan said the same case returns `[]`. Fixed: the Test plan line now asserts `null` for the empty-island-no-occupants-no-base-owner case, citing `:99-101`, with no remaining `[]`/`null` contradiction between the two sections. No other section changed this pass.

Verified: `TileBoats.map.test.ts` bullet (~line 559) now reads "returns `null` (legacy `:99-101` — visible but nothing to show renders the same as not-visible)" — matches both the Contracts section (~line 360-362) and `src/features/game/components/TileBoats.tsx:99-101`. This closes the last open finding from the two prior review passes:
1. `TileBoats`'s `localPlayer` restored (fog-of-war fidelity) — fixed, verified.
2. `AnimatedMonsterState`'s `styleTransform` pre-branched in the hook (attack-frame fidelity) — fixed, verified.
3. `GameBoardHeader`/`GameStatusBadge` already-migrated note corrected — fixed, verified.
4. Test plan/Contract contradiction on the empty-tile `null`/`[]` case — fixed, verified.

No new issues found in this pass. Plan approved; Status set to APPROVED.

- <findings, each with evidence>

Nothing else needed re-checking beyond these three fixes and their ripple effects; the rest of the plan (phase sizing, eslint-boundary reasoning for `AnimatedMonster`/`DeathEffect`, the `useMapPanZoom` 3-way split's return-shape fidelity, `GameBoard.tsx` staying legacy) was already verified in the previous review pass and is unaffected by this revision.

Fix the one Test plan line (the `TileBoats.map.test.ts` bullet, ~line 559) and re-submit.
