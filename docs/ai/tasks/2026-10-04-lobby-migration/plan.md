# Plan: Migrate Lobby domain to src/modules

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `Lobby`, `LobbyBackground`, `LobbyGameRow`, `CreateGameDialog`, `CustomSettingsSheet` live in `src/modules/lobby/components/<Name>/` per the component-architecture standard, each file under the 150-line cap.
- [ ] `src/app/page.tsx` imports `Lobby` and `LobbyBackground` from `@/modules/lobby` instead of `@/features/lobby/components/*`.
- [ ] Visuals and behavior are unchanged: lobby listing, create-game flow (including the solo-vs-bot auto-start), join-game flow (including all four error messages), and the advanced-settings sheet all work exactly as before.
- [ ] The five legacy files under `src/features/lobby/components/` are deleted; no remaining import of `@/features/lobby` anywhere in the repo.
- [ ] `docs/README.md`'s lobby section and `docs/ai/refactor.md` row #9 are updated.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `Lobby` | `src/features/lobby/components/Lobby.tsx:24` | Firestore `onSnapshot` listener (open games) + create/join handlers; imports already repointed to `@/modules/game-rules` (`:6`, `:7`) by the `game-rules-core-migration` task — confirmed landed, nothing to coordinate |
| `LobbyBackground` | `src/features/lobby/components/LobbyBackground.tsx:6` | Static decorative diorama, no props, no state; 7 near-identical "island" blocks and 2 boats |
| `LobbyGameRow` + `SettingsDisplay` | `src/features/lobby/components/LobbyGameRow.tsx:21,76` | `SettingsDisplay` is exported but unused outside this file (grep confirmed) — stays internal, not re-exported |
| `CreateGameDialog` | `src/features/lobby/components/CreateGameDialog.tsx:43` | Local UI state only, no Firestore, no legacy context; imports `@/modules/game-rules` already (`:27`) |
| `CustomSettingsSheet` | `src/features/lobby/components/CustomSettingsSheet.tsx:35` | Local UI state only; imports `@/modules/game-rules` already (`:21`) |
| `GameState`, `GameSettings`, `GameStatus` | `src/lib/types/game.ts:6,13,29` | Authoritative shapes used by the view models below |
| `Player`, `PlayerColor` | `src/lib/types/player.ts:5,19` | Faction/army types |
| `CardName`, `AbilityName` | `src/lib/types/cards.ts:1,18` | Settings toggles |
| `defaultGameSettings`, `initializeGame`, `startGame` | `src/modules/game-rules/game-setup.reducer.ts:36,146`, re-exported `src/modules/game-rules/index.ts:4` | Pure reducers the hook calls to build a new game; `initializeGame`'s map generation uses `Math.random` (`src/modules/game-rules/map-generation.ts:29`), so it cannot be called from a `.fixtures.ts` |
| `addPlayerToGame` | `src/modules/game-rules/player-join.reducer.ts:10`, re-exported `index.ts:5` | Pure reducer; returns `{ newGameState: GameState \| null, newBaseTile }` |
| `PLAYER_COLORS`, `PLAYER_DATA` | `src/modules/game-rules/player-data.ts:4,18`, re-exported `index.ts:2` | Faction list + sprite/name lookup for `CreateGameDialog` |
| `BASE_CARDS` | `src/modules/game-rules/card-data.ts`, re-exported `index.ts:1` | Card list for `CustomSettingsSheet` |
| `db, collection, doc, query, where, onSnapshot, setDoc, runTransaction` | `src/lib/firebase.ts:41-54` | Firestore primitives; importable only from `*.service.ts` (`eslint.config.mjs:46-49`, enforced even inside `*.hook.ts` per `eslint.config.mjs:89-96`) |
| `usePlayer` | `src/hooks/use-player.tsx:143` | Not under `@/features/*`, so not lint-restricted; used from `.hook.ts` only, by convention (precedent: `src/modules/game-board/game-board.hook.ts:2-3` imports `useToast` from `@/hooks/use-toast` the same way) |
| `handlePlayerExit` precedent | `src/modules/game-rules/services/player-exit.service.ts:12`, called from `src/modules/game-board/game-board.session.hook.ts:28` | Exact precedent for a `.hook.ts` calling a sibling `.service.ts`'s Firestore-transaction function through the module's own relative path |
| `GameBoardHeaderView`/`GameBoardHeader` + `useGameBoardHeader` + `createPlayer` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx:9,62`, `GameBoardHeader.hook.ts:1,5-6`, `GameBoardHeader.map.test.ts:5-11` | Real `NameView`/connected precedent: `GameBoardHeaderView` (pure) + `GameBoardHeader()` → `<GameBoardHeaderView {...useGameBoardHeader()} />`; its hook reads external state via `useGameBoard()` the same way `Lobby.hook.ts` will read `usePlayer()`; its test file's `createPlayer` helper is the precedent for building fixtures with `as`-cast plain objects instead of calling randomness-using reducers |
| `toVisibleDecorations` / `FIXED_ROCK_LAYOUT` precedent | `src/modules/map/components/MapDecorations/MapDecorations.map.ts:4,32,98` | Exact precedent for turning a static, hand-authored sprite layout into a `.map.ts` constant + filter function, rendered by a thin `.tsx` |
| Sibling-component import precedent | `src/modules/map/components/IslandTile/IslandTile.tsx:9-14` | `import { X } from '../ComponentFolder'` (via its `index.ts`) is the established way to compose sibling components inside one module |
| Module index precedent | `src/modules/map/index.ts:1`, `src/modules/session/index.ts:1-2` | A module's `index.ts` exports only the component(s) used outside the module, not every internal subcomponent |
| `page.tsx` import sites | `src/app/page.tsx:5-6,47,132` | Only external importer of `Lobby`/`LobbyBackground`; `CreateGameDialog`, `CustomSettingsSheet`, `LobbyGameRow` are imported only from within `src/features/lobby/components/` itself |
| `ComponentPreview` | `src/testbed/testbed.types.ts:10` | Preview contract; registered in `src/testbed/registry.ts:34` |
| `useToast` | `src/hooks/use-toast` | Toast API used identically to the legacy code (`toast({ title, description, variant })`) |

## Decisions
- One new domain `src/modules/lobby/` holding all 5 components plus a `services/lobby.service.ts`, because they are one cohesive feature (CLAUDE.md "Where code goes" / component-architecture layout). Rejected: splitting across existing domains (no existing domain fits; lobby has no gameplay overlap with `game-board`, `map`, etc.).
- `Lobby`'s Firestore calls move into `src/modules/lobby/services/lobby.service.ts`, not `Lobby.hook.ts`, because `*.hook.ts` files cannot import `@/lib/firebase` (`eslint.config.mjs:89-96`) and the existing `game-rules/services/*.service.ts` files are the direct precedent for wrapping an `onSnapshot`/`runTransaction` call this way. Rejected: leaving Firestore calls inline in the hook (fails lint).
- `Lobby` gets the `NameView`/connected split (`LobbyView` + `Lobby`) because its hook reads legacy state (`usePlayer`) and calls services, matching the `GameBoardHeader` precedent. `CreateGameDialog` and `CustomSettingsSheet` do **not** get that split: their hooks only hold local UI state derived from props, matching the `StealResourceDialog` precedent (hook called directly inside the one exported component).
- `LobbyBackground`'s repeated island/boat markup becomes a `.map.ts` constant array (`LOBBY_ISLANDS`, `LOBBY_BOATS`) rendered by a short `.tsx`, exactly mirroring `MapDecorations.map.ts`'s `FIXED_ROCK_LAYOUT`/`FIXED_CLOUD_LAYOUT`. Rejected: keeping one `.tsx` with 7 copy-pasted island blocks (fails the 150-line cap and DRY).
- `CustomSettingsSheet`'s 8 near-identical slider blocks become two config arrays (`GENERAL_SLIDERS`, `COST_SLIDERS`) in `.map.ts`, rendered by one slider-row loop, because the copies must change together and there are more than 3 of them (DRY: "extract at the third copy"). Rejected: keeping the original `renderSlider` closure (ties a pure layout decision to component state, not reusable, harder to test).
- `LobbyGameRow` keeps `SettingsDisplay` as an unexported helper inside `LobbyGameRow.tsx` (not its own component folder) because it is used nowhere else and is small; its repeated label/value rows become a `.map.ts` function `toSettingsSummaryRows`, same DRY reasoning as above.
- Fixtures build plain `GameState`/`Player`-shaped objects with `as GameState`/`as Player` casts (repo precedent: `GameBoardHeader.map.test.ts`'s `createPlayer`), because `initializeGame`/`addPlayerToGame` use `Math.random` and so cannot be called from a `.fixtures.ts` (component-architecture: fixtures forbid randomness).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/lobby/services/lobby.service.ts` | new | `subscribeToOpenGames`, `createGameId`, `saveGame`, `joinOpenGame` — all Firestore I/O for the lobby | implementer-a |
| `src/modules/lobby/services/lobby.service.test.ts` | new | Mocks `@/lib/firebase` (precedent: `bot-turn.service.test.ts`, `player-exit.service.test.ts`); covers all 4 functions | tester-a |
| `src/modules/lobby/components/Lobby/Lobby.types.ts` | new | `LobbyProps`, `LobbyViewModel` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.ts` | new | `useLobby(props): LobbyViewModel` — state, `usePlayer`, `useToast`, calls `lobby.service` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.test.ts` | new | Mocks the service module and `usePlayer`/`useToast` | tester-a |
| `src/modules/lobby/components/Lobby/Lobby.fixtures.ts` | new | `emptyLobby`, `loadingLobby`, `lobbyWithOpenGames` view models | implementer-a |
| `src/modules/lobby/components/Lobby/index.ts` | new | `export { Lobby, LobbyView } from './Lobby'; export type { LobbyProps } from './Lobby.types';` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.styles.ts` | new | Every Tailwind class from the original `Lobby.tsx` JSX | implementer-b |
| `src/modules/lobby/components/Lobby/Lobby.tsx` | new | `LobbyView` (pure) + `Lobby` (connected) | implementer-b |
| `src/modules/lobby/components/Lobby/Lobby.test.tsx` | new | Renders `LobbyView` with fixtures | tester-b |
| `src/modules/lobby/components/Lobby/Lobby.preview.tsx` | new | Testbed states | preview-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.types.ts` | new | `Sprite`, `SpriteDecoration`, `LobbyIsland`, `LobbyBoat` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.ts` | new | `LOBBY_ISLANDS`, `LOBBY_BOATS` constants (verbatim content/classNames from the legacy file) + `toLobbyBackground()` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.map.test.ts` | new | Asserts island/boat counts and that every sprite `src` is a real, existing `/sprites/*` path | tester-a |
| `src/modules/lobby/components/LobbyBackground/index.ts` | new | `export { LobbyBackground } from './LobbyBackground';` | implementer-a |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts` | new | Every Tailwind class (container, gradient, glows, grid texture, fog overlay, image classes) | implementer-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.tsx` | new | Renders `LOBBY_ISLANDS`/`LOBBY_BOATS` via `.map()` | implementer-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.test.tsx` | new | Smoke-renders, checks sprite `alt` text present | tester-b |
| `src/modules/lobby/components/LobbyBackground/LobbyBackground.preview.tsx` | new | Single "Default" state (no props) | preview-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.types.ts` | new | `LobbyGameRowProps`, `SettingsSummaryRow` | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.ts` | new | `toSettingsSummaryRows(settings): SettingsSummaryRow[]` | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.map.test.ts` | new | Verifies row labels/values, resource-density percentage rounding | tester-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.fixtures.ts` | new | `openGame`, `fullGame` `GameState` fixtures (`as GameState` casts) | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/index.ts` | new | `export { LobbyGameRow } from './LobbyGameRow';` | implementer-a |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.styles.ts` | new | Every Tailwind class | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx` | new | `LobbyGameRow` view + internal `SettingsDisplay` helper (not exported) | implementer-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.test.tsx` | new | Full row, joining state, full-room state, popover contents | tester-b |
| `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.preview.tsx` | new | "Open room", "Full room", "Joining" states | preview-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts` | new | `CreateGameDialogProps`, `FactionOption`, `CreateGameDialogViewModel` | implementer-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.ts` | new | `toFactionOptions(): FactionOption[]` from `PLAYER_COLORS`/`PLAYER_DATA` | implementer-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.map.test.ts` | new | Faction option count/order/sprite mapping | tester-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.hook.ts` | new | `useCreateGameDialog(props): CreateGameDialogViewModel` — local UI state only | implementer-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.hook.test.ts` | new | maxPlayers=1 auto-sets debugMode, submit calls `onCreateGame` with exact args, settings-save closes the sheet | tester-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.fixtures.ts` | new | Default props (`onCreateGame` stub resolving `true`), `defaultGameSettings` re-export for the sheet fixture | implementer-a |
| `src/modules/lobby/components/CreateGameDialog/index.ts` | new | `export { CreateGameDialog } from './CreateGameDialog';` | implementer-a |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.styles.ts` | new | Every Tailwind class | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.tsx` | new | View, calls `useCreateGameDialog` directly, renders `CustomSettingsSheet` | implementer-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.test.tsx` | new | Name input, format select, faction pick, debug toggle (solo only), submit disabled when name empty | tester-b |
| `src/modules/lobby/components/CreateGameDialog/CreateGameDialog.preview.tsx` | new | "Multiplayer" and "Solo vs bot" states | preview-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.types.ts` | new | `CustomSettingsSheetProps`, `SliderFieldKey`, `SliderFieldConfig`, `CustomSettingsSheetViewModel` | implementer-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.map.ts` | new | `GENERAL_SLIDERS`, `COST_SLIDERS`, `ALL_ABILITIES`, `toSliderDisplayValue` | implementer-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.map.test.ts` | new | `toSliderDisplayValue` percentage vs. raw-number formatting | tester-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.hook.ts` | new | `useCustomSettingsSheet(props): CustomSettingsSheetViewModel` | implementer-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.hook.test.ts` | new | Slider change, fog toggle, card toggle add/remove, ability toggle add/remove, save passes current settings | tester-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.fixtures.ts` | new | Default props using `defaultGameSettings` | implementer-a |
| `src/modules/lobby/components/CustomSettingsSheet/index.ts` | new | `export { CustomSettingsSheet } from './CustomSettingsSheet';` | implementer-a |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.styles.ts` | new | Every Tailwind class | implementer-b |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.tsx` | new | View, calls `useCustomSettingsSheet` directly, renders slider rows from the config arrays | implementer-b |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.test.tsx` | new | Tabs, slider values/labels, card/ability checkboxes toggle, save/cancel | tester-b |
| `src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.preview.tsx` | new | "Default settings" state | preview-a |
| `src/modules/lobby/index.ts` | new | `export { Lobby } from './components/Lobby'; export { LobbyBackground } from './components/LobbyBackground';` | implementer-a |
| `src/testbed/registry.ts` | edit | Register the 5 new previews | preview-a |
| `src/app/page.tsx` | edit | Repoint the two imports (`:5-6`) to `@/modules/lobby` | implementer-b |
| `src/features/lobby/components/Lobby.tsx` | delete | Superseded by `src/modules/lobby/components/Lobby/` | implementer-b |
| `src/features/lobby/components/LobbyBackground.tsx` | delete | Superseded by `src/modules/lobby/components/LobbyBackground/` | implementer-b |
| `src/features/lobby/components/LobbyGameRow.tsx` | delete | Superseded by `src/modules/lobby/components/LobbyGameRow/` | implementer-b |
| `src/features/lobby/components/CreateGameDialog.tsx` | delete | Superseded by `src/modules/lobby/components/CreateGameDialog/` | implementer-b |
| `src/features/lobby/components/CustomSettingsSheet.tsx` | delete | Superseded by `src/modules/lobby/components/CustomSettingsSheet/` | implementer-b |
| `docs/README.md` | edit | Lobby section (`:50`) updated to the new paths | implementer-b |
| `docs/ai/refactor.md` | edit | Row #9 status → `done` | implementer-b |

Note: `eslint.config.mjs`'s `LEGACY_PATHS` keeps `src/features/**` as one glob (`eslint.config.mjs:13`) covering all remaining legacy feature folders (e.g. `src/features/game/`) — no edit needed there for this task.

## Contracts
```ts
// ---- src/modules/lobby/services/lobby.service.ts ----
import type { GameState } from '@/lib/types';

export function subscribeToOpenGames(
  onGames: (games: GameState[]) => void,
  onError: (error: Error) => void,
): () => void; // unsubscribe; query games where status === GameStatus.Waiting, same shape patch as today (settings ?? defaultGameSettings)

export function createGameId(): string; // doc(collection(db, 'games')).id, no write

export async function saveGame(game: GameState): Promise<void>; // setDoc(doc(db, 'games', game.id), game)

export async function joinOpenGame(
  gameId: string,
  player: { playerId: string; name: string },
): Promise<void>;
// One runTransaction. Throws Error with these exact messages (toasted verbatim today):
//   'Game not found.'
//   'This game has already started or is no longer available.'
//   'This game is full.'
//   'Could not add player to game. The room might be full or color unavailable.'
// Resolves without writing if the player is already in game.players (silent no-op, matches today).
// Calls addPlayerToGame(gameState, player) from '@/modules/game-rules' for the actual mutation.

// ---- src/modules/lobby/components/Lobby/Lobby.types.ts ----
import type { GameSettings, GameState, PlayerColor } from '@/lib/types';

export type LobbyProps = { onJoinGame: (gameId: string) => void };

export type LobbyViewModel = {
  username: string | null;
  games: GameState[];
  isGamesLoading: boolean;
  isCreateDialogOpen: boolean;
  onOpenCreateDialog: () => void;
  onCreateDialogChange: (open: boolean) => void;
  isJoiningGame: string | null;
  onJoinGame: (gameId: string) => void; // join an existing game (NOT the onJoinGame prop, which fires after success)
  onCreateGame: (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor,
    numBots: number,
    debugMode: boolean,
    settings: GameSettings,
  ) => Promise<boolean>;
  onLogout: () => void;
};

// Lobby.hook.ts: useLobby(props: LobbyProps): LobbyViewModel
// Lobby.tsx: export function LobbyView(props: LobbyViewModel): JSX.Element
//            export function Lobby(props: LobbyProps): JSX.Element { return <LobbyView {...useLobby(props)} />; }

// ---- src/modules/lobby/components/LobbyBackground/LobbyBackground.types.ts ----
export type Sprite = { src: string; alt: string; width: number; height: number; imageClassName: string };
export type SpriteDecoration = Sprite & { positionClassName: string };
export type LobbyIsland = {
  id: string;
  wrapperClassName: string; // position + visibility + hover + animation-duration/delay classes
  cardClassName: string;    // size + border-color + rotate classes
  mainSprite: Sprite;
  decorations: SpriteDecoration[];
};
export type LobbyBoat = { id: string; wrapperClassName: string; sprite: Sprite };

// LobbyBackground.map.ts: toLobbyBackground(): { islands: LobbyIsland[]; boats: LobbyBoat[] }
// LobbyBackground.tsx: export function LobbyBackground(): JSX.Element // no props, no hook

// ---- src/modules/lobby/components/LobbyGameRow/LobbyGameRow.types.ts ----
import type { GameSettings, GameState } from '@/lib/types';

export type LobbyGameRowProps = {
  game: GameState;
  isJoining: boolean;
  isAnyJoining: boolean;
  onJoin: (gameId: string) => void;
};
export type SettingsSummaryRow = { label: string; value: string };

// LobbyGameRow.map.ts: toSettingsSummaryRows(settings: GameSettings): SettingsSummaryRow[]
// (Victory Point Goal, Fog of War Enabled/Disabled, Resource Density %, VP per Discovery,
//  Initial Deploy Cost, Upgrade Cost, Ability Cost — same order/labels as today's SettingsDisplay)
// LobbyGameRow.tsx: export function LobbyGameRow(props: LobbyGameRowProps): JSX.Element

// ---- src/modules/lobby/components/CreateGameDialog/CreateGameDialog.types.ts ----
import type { GameSettings, PlayerColor } from '@/lib/types';

export type CreateGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGame: (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor,
    numBots: number,
    debugMode: boolean,
    settings: GameSettings,
  ) => Promise<boolean>;
};
export type FactionOption = { color: PlayerColor; name: string; spriteSrc: string };
export type CreateGameDialogViewModel = {
  gameName: string;
  onGameNameChange: (value: string) => void;
  maxPlayers: number;
  onMaxPlayersChange: (value: number) => void;
  playerColor: PlayerColor;
  onPlayerColorChange: (color: PlayerColor) => void;
  debugMode: boolean;
  onDebugModeChange: (checked: boolean) => void;
  isCreating: boolean;
  isCustomizing: boolean;
  onOpenCustomize: () => void;
  onCustomizeChange: (open: boolean) => void;
  customSettings: GameSettings;
  factionOptions: FactionOption[];
  onSubmit: () => void;
  onSettingsSave: (settings: GameSettings) => void;
};

// CreateGameDialog.map.ts: toFactionOptions(): FactionOption[] // from PLAYER_COLORS + PLAYER_DATA, in PLAYER_COLORS order
// CreateGameDialog.hook.ts: useCreateGameDialog(props: CreateGameDialogProps): CreateGameDialogViewModel
//   - numBots passed to onCreateGame is maxPlayers === 1 ? 1 : 0 (same as today)
//   - finalSettings.fogOfWar = !debugMode only when maxPlayers === 1 (same as today)
//   - onSubmit no-ops when !gameName.trim() || isCreating (same as today)
// CreateGameDialog.tsx: export function CreateGameDialog(props: CreateGameDialogProps): JSX.Element
//   renders <Dialog open={props.open} onOpenChange={props.onOpenChange}> ... and
//   <CustomSettingsSheet open={vm.isCustomizing} onOpenChange={vm.onCustomizeChange}
//     onSave={vm.onSettingsSave} initialSettings={vm.customSettings} />

// ---- src/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.types.ts ----
import type { AbilityName, CardName, GameSettings } from '@/lib/types';

export type CustomSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: GameSettings) => void;
  initialSettings: GameSettings;
};
export type SliderFieldKey =
  | 'victoryPointGoal' | 'vpPerIslandDiscovery' | 'resourceDensity'
  | 'initialDeployCost' | 'deployCostIncrement' | 'upgradeCost' | 'abilityCost' | 'baseResourceAmount';
export type SliderFieldConfig = { key: SliderFieldKey; label: string; min: number; max: number; step: number };
export type CustomSettingsSheetViewModel = {
  settings: GameSettings;
  onSliderChange: (key: SliderFieldKey, value: number) => void;
  onFogOfWarChange: (checked: boolean) => void;
  onCardToggle: (cardName: CardName, checked: boolean) => void;
  onAbilityToggle: (abilityName: AbilityName, checked: boolean) => void;
  onSave: () => void;
};

// CustomSettingsSheet.map.ts:
//   GENERAL_SLIDERS: SliderFieldConfig[]  // victoryPointGoal, vpPerIslandDiscovery, resourceDensity — same min/max/step as today
//   COST_SLIDERS: SliderFieldConfig[]     // initialDeployCost, deployCostIncrement, upgradeCost, abilityCost, baseResourceAmount
//   ALL_ABILITIES: AbilityName[]          // [AbilityName.Explorer, AbilityName.Collector] (moved verbatim from the legacy file)
//   toSliderDisplayValue(key: SliderFieldKey, value: number): string // `${Math.round(value*100)}%` iff key === 'resourceDensity', else String(value)
// CustomSettingsSheet.hook.ts: useCustomSettingsSheet(
//   props: Pick<CustomSettingsSheetProps, 'onSave' | 'initialSettings'>
// ): CustomSettingsSheetViewModel
//   - internal state seeded once from initialSettings via useState (not re-synced on prop change — same as today)
// CustomSettingsSheet.tsx: export function CustomSettingsSheet(props: CustomSettingsSheetProps): JSX.Element
```

## Phases
### Phase 1: logic layer (types, map, hook, fixtures, service, index)
1. `lobby.service.ts` + test: `subscribeToOpenGames`, `createGameId`, `saveGame`, `joinOpenGame`, mocking `@/lib/firebase` (implementer-a, tester-a, **sonnet**).
2. `Lobby.types.ts`, `Lobby.hook.ts`, `Lobby.fixtures.ts`, `Lobby/index.ts` + `Lobby.hook.test.ts` (implementer-a, tester-a, **sonnet** — the Firestore-adjacent layer).
3. `LobbyBackground.types.ts`, `LobbyBackground.map.ts`, `LobbyBackground/index.ts` + `LobbyBackground.map.test.ts` (implementer-a, tester-a). Verify every sprite path against `git show HEAD:src/features/lobby/components/LobbyBackground.tsx` byte-for-byte (same `src`/`alt`/dimensions/classNames).
4. `LobbyGameRow.types.ts`, `LobbyGameRow.map.ts`, `LobbyGameRow.fixtures.ts`, `LobbyGameRow/index.ts` + `LobbyGameRow.map.test.ts` (implementer-a, tester-a).
5. `CreateGameDialog.types.ts`, `CreateGameDialog.map.ts`, `CreateGameDialog.hook.ts`, `CreateGameDialog.fixtures.ts`, `CreateGameDialog/index.ts` + `.map.test.ts`, `.hook.test.ts` (implementer-a, tester-a).
6. `CustomSettingsSheet.types.ts`, `CustomSettingsSheet.map.ts`, `CustomSettingsSheet.hook.ts`, `CustomSettingsSheet.fixtures.ts`, `CustomSettingsSheet/index.ts` + `.map.test.ts`, `.hook.test.ts` (implementer-a, tester-a).
7. `src/modules/lobby/index.ts` exporting `Lobby` and `LobbyBackground` (implementer-a).
8. Checks: `npm run typecheck`, `npm run lint`, `npx jest src/modules/lobby` (implementer-a/tester-a, before handing off).

Model escalation: steps 1-2 (Firestore subscription/transaction logic) — sonnet for implementer-a and tester-a, per triage.

### Phase 2: view layer, wiring, cleanup
1. `.styles.ts` + `.tsx` for all 5 components, each under 150 lines (implementer-b).
2. `.test.tsx` for all 5 components (tester-b).
3. `.preview.tsx` for all 5 components + register them in `src/testbed/registry.ts` (preview-a).
4. Repoint `src/app/page.tsx:5-6` to `@/modules/lobby`; delete the 5 legacy files under `src/features/lobby/components/` in the same commit (implementer-b).
5. Update `docs/README.md`'s lobby section and `docs/ai/refactor.md` row #9 (implementer-b).
6. Checks: `npm run typecheck`, `npm run lint`, `npm test` (repo-wide), `node .claude/skills/ui-verify/scripts/snapshot.mjs http://localhost:9002` against the testbed previews and the real `/` route (login + lobby flow) (ui-verify).

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `lobby.service.test.ts`: `subscribeToOpenGames` builds the `games` array with `id`/`settings` patched from the snapshot and calls `onError` on listener error; `joinOpenGame` throws each of the 4 exact error strings for its trigger condition, resolves silently when the player is already in `game.players`, and calls `transaction.set` with `addPlayerToGame`'s `newGameState` on success; `createGameId`/`saveGame` call the expected firebase functions with the expected args.
  - `Lobby.hook.test.ts`: subscribes on mount and unsubscribes on unmount; toasts `'Lobby Error'` on subscription error; `handleCreateGame` returns `false` without `playerId`/`username`; solo game (`maxPlayers === 1`) calls `startGame` and saves twice; join success calls the prop `onJoinGame`; join failure toasts the thrown message and clears `isJoiningGame`.
  - `LobbyBackground.map.test.ts`: `toLobbyBackground()` returns 7 islands and 2 boats; every sprite `src` matches one that exists today (cross-check against the legacy file's literal strings).
  - `LobbyGameRow.map.test.ts`: `toSettingsSummaryRows` resource-density rounds to the nearest percent; row count and labels match `SettingsDisplay`'s today.
  - `CreateGameDialog.map.test.ts`: `toFactionOptions()` returns one entry per `PLAYER_COLORS` member, in order, with `PLAYER_DATA[color].sprite.idle`/`.name`.
  - `CreateGameDialog.hook.test.ts`: `maxPlayers` flipping to 1 sets `debugMode` true then back to false at other formats; `onSubmit` is a no-op when `gameName` is blank or `isCreating`; `onSubmit` calls `onCreateGame` with `numBots = maxPlayers === 1 ? 1 : 0` and `fogOfWar = !debugMode` only for solo; successful create closes the dialog (`onOpenChange(false)`), failed create does not.
  - `CustomSettingsSheet.map.test.ts`: `toSliderDisplayValue('resourceDensity', 0.45)` → `'45%'`; any other key returns `String(value)`.
  - `CustomSettingsSheet.hook.test.ts`: `onSliderChange` updates only the targeted key; `onCardToggle`/`onAbilityToggle` add on `true`, remove on `false`; `onSave` calls the prop with the current (possibly edited) settings, not `initialSettings`.
- tester-b (view and e2e):
  - `Lobby.test.tsx` (via `LobbyView`): loading state shows the spinner copy; empty state shows "No open matches..."; game list renders one `LobbyGameRow` per game with the right count badge/pluralization; logout button calls `onLogout`.
  - `LobbyBackground.test.tsx`: smoke-renders without throwing; every configured sprite has matching `alt` text in the DOM.
  - `LobbyGameRow.test.tsx`: full room disables Join and shows "Full"; joining state shows the spinner; popover shows the settings summary and card/ability badges.
  - `CreateGameDialog.test.tsx`: typing a name enables Create; selecting "Solo vs. Bot AI" reveals the Debug Mode switch and hides it otherwise; clicking a faction selects it; "Advanced Rules" opens `CustomSettingsSheet`.
  - `CustomSettingsSheet.test.tsx`: tab switching shows General/Costs/Content; dragging/pressing a slider's value updates the displayed number or percentage; toggling a card/ability checkbox reflects in `settings`; Save/Cancel call the right props.
  - e2e: no new spec needed — `e2e/auth-and-lobby.spec.ts` (`eslint.config.mjs:23`, legacy-exempt) already exercises create/join through the DOM; rerun it unchanged against the migrated components to confirm no regression. Run with `npm run test:e2e -- e2e/auth-and-lobby.spec.ts` (requires Java 21 for the Firestore emulator — if unavailable, note it as not run, same as prior tasks).

## Preview states
- `Lobby`: Loading (`loadingLobby`), Empty (`emptyLobby`), With open games (`lobbyWithOpenGames`, 2-3 `LobbyGameRow` fixtures).
- `LobbyBackground`: Default (no fixtures — static).
- `LobbyGameRow`: Open room, Full room, Joining.
- `CreateGameDialog`: Multiplayer (maxPlayers=4, debug hidden), Solo vs bot (maxPlayers=1, debug switch visible).
- `CustomSettingsSheet`: Default settings (`defaultGameSettings`).

## Risks
- `Lobby.hook.ts` calling `lobby.service.ts`'s `joinOpenGame`/`subscribeToOpenGames` is the one real-risk surface (concurrent joins, listener cleanup on unmount) — mitigated by the sonnet escalation on implementer-a/tester-a for Phase 1 steps 1-2 and by porting the exact error strings/branch order so `e2e/auth-and-lobby.spec.ts` catches any behavioral drift.
- `LobbyBackground`'s hand-copied island/boat array is large and easy to transcribe wrong (wrong sprite, dropped decoration, changed animation delay) — mitigated by requiring a byte-for-byte diff against `git show HEAD:src/features/lobby/components/LobbyBackground.tsx` before Phase 1 is reported done.
- Dropping `CustomSettingsSheet`'s original `typeof settings[key] !== 'number'` runtime guard when switching to typed `SliderFieldConfig[]` arrays changes no behavior only if every `SliderFieldKey` in `GENERAL_SLIDERS`/`COST_SLIDERS` is in fact numeric on `GameSettings` — verified above (`src/lib/types/game.ts:13-26`): all 8 are `number`.

## Review (architect-b)
VERDICT: APPROVED
- Previous round's finding fixed: `plan.md:43,47` now cite the real `GameBoardHeader` precedent (added to Verified context at `plan.md:32`) instead of the invented `PlayerStandings`. Re-verified: `GameBoardHeaderView`/`GameBoardHeader` at `GameBoardHeader.tsx:9` (confirmed `export function GameBoardHeaderView({`) — corrected the connected-component line from `:61` to `:62` (confirmed `export function GameBoardHeader(): JSX.Element {`); `useGameBoardHeader` reading `useGameBoard()` at `GameBoardHeader.hook.ts:1,5-6` confirmed; `createPlayer` fixture helper at `GameBoardHeader.map.test.ts:5-11` confirmed.

Everything else checks out (re-verified independently this round, not just carried over):
- All 5 source files, line counts, and current import lines (`Lobby.tsx:4,6,7`; `CreateGameDialog.tsx:22,27`; `CustomSettingsSheet.tsx:16,21`) match the plan's Verified context exactly, including the already-landed `@/modules/game-rules` repoints from `game-rules-core-migration` (confirmed via that task's `progress.md`: all 4 phases done, committed).
- `grep -rn "features/lobby"` across `src e2e docs scripts .claude CLAUDE.md` finds only `src/app/page.tsx:5-6` (the one external call site the plan accounts for) and this task's own docs/plan files — no missed importer.
- Every other precedent cited resolves exactly as described: `StealResourceDialog` (hook holds only local UI state, called directly, no `NameView` split), `MapDecorations.map.ts` (`FIXED_ROCK_LAYOUT`, `FIXED_CLOUD_LAYOUT`, `toVisibleDecorations`), `IslandTile.tsx:9-14` (sibling import via `../Folder` index), `player-exit.service.ts` / `game-board.session.hook.ts` (service-from-hook call pattern), `map/index.ts` / `session/index.ts` (index exports only externally-used components), `use-player.tsx:143`, `testbed.types.ts:10`, `game-rules/index.ts`'s re-exports (`defaultGameSettings`, `initializeGame`, `startGame`, `addPlayerToGame`, `PLAYER_COLORS`, `PLAYER_DATA`, `BASE_CARDS`), and all 8 `GameSettings` slider fields are in fact `number` (`src/lib/types/game.ts:13-26`), confirming the dropped-runtime-guard risk note is correctly reasoned.
- The design is appropriately scoped for M tier: one new domain, no unnecessary abstraction, `NameView` split used only where a hook reads external state, config-array extraction only where the legacy code had 3+ copy-pasted blocks (DRY's "third copy" rule). No simpler alternative found.
- File plan ownership, phase split (logic layer first, then view/wiring/cleanup), and the Firestore-risk sonnet escalation on Phase 1 steps 1-2 are all consistent with CLAUDE.md and the component-architecture skill.
