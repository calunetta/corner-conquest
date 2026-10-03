# Plan: Migrate game panels (ActionsPanel, PlayerInfo, GameLog) to src/modules/hud

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change)

## Goal and acceptance criteria
- [ ] `src/modules/hud/` exists with `ActionsPanel`, `PlayerInfo` and `GameLog` built per component-architecture (types/map/hook/styles/view split), each rendering the same markup and behavior as today's legacy panels for the same inputs.
- [ ] `src/features/game/components/GameBoard.tsx` imports `ActionsPanel` and `GameLog` from `@/modules/hud`; `src/features/game/components/PlayerInfoBar.tsx` imports `PlayerInfo` from `@/modules/hud`. No other line of either file changes except the one new `infoBeacon` prop on `<ActionsPanel>` (see Decisions).
- [ ] `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx` are deleted once the new components are verified.
- [ ] Each new component has a testbed preview covering its visual states, screenshot-verified (skill `ui-verify`).
- [ ] `npm run typecheck`, `npm run lint` (zero warnings) and `npm test` pass; `npm run build` passes; `docs/README.md` describes the new `src/modules/hud/` layout and the updated `GameBoard.tsx`/`PlayerInfoBar.tsx` bullets.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `ActionsPanel` (current) | `src/features/game/panels/ActionsPanel.tsx:27-308` | Zero-prop, reads `useGameBoard()` only (`:28-37`). Builds `mainActions`/`alwaysAvailableActions`/`secondaryActions` (`:77-156`), a `getDisabledReason` switch (`:158-202`), a shared `renderButton` (`:204-235`), and renders a `TutorialBeacon` inline (`:243-248`) plus Cancel/Deselect/EndTurn controls (`:255-287`) and an extra-move banner (`:289-294`). |
| `PlayerInfo` (current) | `src/features/game/panels/PlayerInfo.tsx:16-255` | `React.memo`-wrapped, props `{ player, isCurrentPlayer, vpGoal = 10 }` (`:16-20`), also reads `useGameBoard()` for `turnTimer`/`isMyTurn` (`:44`). Derived fields `:45-67`; color lookup tables `:22-41`; render `:69-254`. |
| `GameLog` (current) | `src/features/game/panels/GameLog.tsx:8-32` | Zero-prop. Reads `gameState.log` (`:9-10`), reverses it while mapping to `<p>` elements (`:22-26`). |
| `useGameBoard` / `GameBoardContextType` | `src/features/game/context/GameBoardContext.tsx:1-13` (re-export) → `src/modules/game-board/game-board.types.ts:86-113` | `onAction`, `onLocalAction`, `localPlayer`, `gameState`, `isMyTurn`, `isHost`, `selectedArmy`, `turnTimer: { timeLeft, formattedTime, turnDuration, isExpiring, percentage }`, `uiState.pendingAction`. |
| `Player` | `src/lib/types/player.ts:19-41` | `armies: Army[]`, `resources: Record<ResourceType, number>`, `armyCount`, `attackPower`, `nextArmyCost`, `victoryPoints`, `specialCards: CardName[]`, `positions: PlayerPosition[]`, `hasExtraMove`, `actionsThisTurn: GameAction[]`, `passiveAbilities`, `isSabotaged`, `reinforceActive`, `efficientActive`, `masterBuilderActive`, `color`, `isBot`, `name`. |
| `Army` | `src/lib/types/player.ts:13-17` | `{ id, position: { x, y }, hasActed }`. |
| `GameAction` | `src/lib/types/actions.ts:5-42` | String-literal union used as `ActionViewModel.id`: `Deploy`, `Upgrade`, `BuyCard`, `EndTurn`, `local_Position`, `local_Attack`, `local_ShowCards`, `local_OpenAbilitiesShop`, `local_CancelAction`, `local_DeselectArmy`. |
| `HAND_LIMIT` | `src/lib/types/actions.ts:3` | `= 7`, used for the Cards action disabled check and label. |
| `GameState` | `src/lib/types/game.ts:29-51` | `map: Island[]`, `settings: GameSettings`, `specialCardsDeck: CardName[]`, `discardPile: CardName[]`, `log: string[]`. |
| `GameSettings` | `src/lib/types/game.ts:13-26` | `gridSize: { rows, cols }`, `upgradeCost: number`, `victoryPointGoal: number`. |
| `Island` | `src/lib/types/map.ts:25-35` | `type: IslandType`, `resources: IslandResource[]`, `occupants: { playerId, armyId }[]`, `monsters?: Monster[]`. |
| `PendingAction` | `src/lib/types/dialogs.ts:56-59+` | Discriminated union, each member has `cardName: CardName`; used for `isPendingMatch`. |
| `PlayerPosition` | `src/lib/types/map.ts:18-23` | `{ x, y, resource, armyId }`, used for `positionedCount` and `canPosition`. |
| `ResourceType` | `src/lib/types/cards.ts:24-29` | `Food: 'food'`, `Wood: 'wood'`, `Gold: 'gold'`. |
| `PLAYER_DATA` | `src/lib/player-data.ts:18-53` | `PLAYER_DATA[color].sprite.idle` — player sprite path. `src/lib/**` is not `@/features/*`, so importable anywhere, including `.map.ts` (precedent: `src/modules/combat/components/CombatDialog/CombatDialog.map.ts:3,26-30`). **Cross-task collision:** `docs/ai/tasks/2026-10-03-game-rules-core-migration/plan.md` (Status: APPROVED, `progress.md` Phase 1 "plan approved" ticked, implementation not started as of this writing) moves `PLAYER_DATA` to `src/modules/game-rules/player-data.ts` and, in that same Phase 1, edits `src/features/game/panels/PlayerInfo.tsx:12` to repoint its import to `@/modules/game-rules` (`game-rules-core-migration/plan.md` File plan, row for `PlayerInfo.tsx`) — the exact file this plan deletes. See the pre-flight check in Phases and the inverse-case note in Decisions/Risks below. |
| `ResourceIcon`, `FightIcon` | `src/components/icons.tsx:29,47` | Not `@/features/*`; importable in `.tsx`. |
| `TutorialBeacon` | `src/features/game/components/TutorialBeacon.tsx:17-74` | Pure, prop-driven (`id`, `title`, `description`, `className?`, `side?`), no context. Lives under `@/features/*` — row #8 (`game-effects-migration`), not migrated here. `ActionsPanel.tsx:243-248` renders one inline; `GameBoard.tsx:9,39-50` already imports and renders a different one. See Decisions for how `ActionsPanel`'s module version keeps this slot without importing `@/features/*` into a `.tsx`. |
| `GameBoard.tsx` call sites | `src/features/game/components/GameBoard.tsx:8-9,12,58-59` | `import { ActionsPanel } from '@/features/game/panels/ActionsPanel'`, `import { GameLog } from '@/features/game/panels/GameLog'`, `<ActionsPanel />`, `<GameLog />`. Also already imports `TutorialBeacon` (`:9`) and renders `<PlayerInfoBar />` (`:34`). |
| `PlayerInfoBar.tsx` call site | `src/features/game/components/PlayerInfoBar.tsx:8,58-63,103-108` | `import { PlayerInfo } from '@/features/game/panels/PlayerInfo'`; two render sites (mobile collapsible, desktop sidebar) both pass `player`, `isCurrentPlayer`, `vpGoal`. `PlayerInfoBar.tsx` itself is out of scope (row #7) — only this one import line changes. |
| `e2e/gameplay.spec.ts:43` | comment only ("Verify player has 20 Food... in HUD/PlayerInfo"), no import of the panel path — no e2e file change needed. | Confirms nothing to repoint in e2e. |
| ESLint module boundaries | `eslint.config.mjs:42-57` (`RESTRICTED_IMPORTS`), `:77-96` (zones), `:73` (`max-lines`: 150) | `@/features/*` forbidden in every module file except `*.hook.ts`; 150-counted-line cap per file (blank/comments excluded). |
| component-architecture reference example | `.claude/skills/component-architecture/reference/example.md` | `PlayerStandings` worked example: exact file list, `NameView`/connected split, `.hook.ts` importing `@/features/game/context/GameBoardContext`, fixtures/preview/test shapes to copy. |
| Preview/registry pattern | `src/modules/combat/components/CombatDialog/CombatDialog.preview.tsx:1-107`, `src/testbed/registry.ts:1-15` | `ComponentPreview { slug, title, group, states: { name, render }[] }`; register by importing the preview and adding it to the `previews` array. |
| `docs/README.md` sections to update | `:33` (module list bullet), `:40` (`ActionsPanel.tsx` named as a legacy consumer), `:44` (`PlayerInfoBar.tsx` bullet, unchanged content but now imports from modules), `:56-59` (the `panels/` bullets being deleted), `:129` (`ActionsPanel` cited as a zero-prop-drilling example) | All found by grep; no other file under `docs/`, `.claude/`, `scripts/`, or `CLAUDE.md` references these three filenames. |

## Decisions
- **Domain name `hud`**, matching the example domain list in component-architecture (`hud, combat, cards, lobby, map`) and the worked `PlayerStandings` reference, which uses this exact domain for a player-stats HUD card.
- **`ActionsPanel`'s connected component takes one prop, `infoBeacon?: ReactNode`**, rendered where the legacy `TutorialBeacon` sat (next to the "Actions" title). `GameBoard.tsx` passes `<TutorialBeacon id="actions-info" .../>` (reusing its existing `TutorialBeacon` import at `:9`) as that prop. Reason: `TutorialBeacon` lives under `@/features/game/components/`, importable only inside `*.hook.ts` (which must never return JSX) — there is no lint-legal way for `ActionsPanel.tsx` to render it directly. This mirrors the "parent stays legacy for the piece that can't move yet" pattern from `docs/ai/tasks/2026-10-03-migrate-dialog-components/plan.md`'s `GameDialogManager` decision, scoped down to a single slot instead of leaving the whole component legacy. `PlayerInfo` and `GameLog` need no such slot: `PlayerInfo.tsx` never renders `TutorialBeacon` itself (only `PlayerInfoBar.tsx` does, which stays legacy, untouched here), and `GameLog.tsx` doesn't either.
  - Rejected: migrating `TutorialBeacon` into this task to unblock a direct import — expands scope beyond triage's three named files and duplicates row #8 (`game-effects-migration`), which is already planned as its own row with no dependency on this one.
  - Rejected: leaving `ActionsPanel.tsx` at its legacy path like `GameDialogManager.tsx` — unlike `GameDialogManager` (which renders 13 untouched legacy dialogs), `ActionsPanel` has exactly one small, static, leaf dependency; a single injected prop is simpler than not migrating a 308-line component at all.
- **Icons become string tags in the view models (`ActionIcon`, buff `id`), not JSX.** `.map.ts` must never contain React (component-architecture file table); `GameAction`→icon and buff-id→icon lookups live in each `.tsx` as a `Record<Tag, ComponentType<{ className?: string }>>`, matching the existing buff pattern this plan introduces for `PlayerInfo`.
- **`PlayerInfo` keeps the `NameView`/connected split** even though its hook only reads two extra fields (`turnTimer`, `isMyTurn`) off `useGameBoard()` beyond its props — it does call legacy context, so component-architecture's "pure view, connected component" rule applies (the split is for "a hook that reads app state", not only zero-prop components).
- **`ActionsPanel` and `GameLog` also get the split** (`ActionsPanelView`/`ActionsPanel`, `GameLogView`/`GameLog`) for the same reason: both hooks call `useGameBoard()`.
- **`React.memo` stays on the connected `PlayerInfo`**, matching today's `React.memo(function PlayerInfo(...))` wrapping (`PlayerInfo.tsx:43,255`) — `PlayerInfoBar` renders one per player in a list; preserves the existing (if limited) re-render optimization.
- **No `.service.ts` for any of the three** — no Firestore or other I/O, all pure render + context read.
- Rejected: a shared `.styles.ts` or shared buff/icon-lookup file across the three components — each is a distinct card with its own classes; no third consumer yet to justify extraction (kiss-dry-solid: "extract at the third copy").
- **`PLAYER_DATA` import source for `PlayerInfo.map.ts`/`.fixtures.ts` depends on which sibling task lands first (see the Verified context collision note and the Phase 1 pre-flight check).** Default assumption in the Contracts block below is today's reality: `import { PLAYER_DATA } from '@/lib/player-data'`. If `game-rules-core-migration`'s Phase 1 commits first, `PLAYER_DATA` will have moved to `src/modules/game-rules/player-data.ts` (re-exported from `@/modules/game-rules`) and `src/lib/player-data.ts` may no longer exist — implementer-a must then import it as `import { PLAYER_DATA } from '@/modules/game-rules'` instead (a same-layer module-to-module import through the public index, allowed by `no-restricted-imports`'s `deepModuleImport` rule since it's the index, not a deep path). Whichever task is implemented second adapts its own import to match whatever is actually on disk at that time — do not assume the Contracts block's literal import path without checking first.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/hud/index.ts` | new | Module public API: exports `ActionsPanel`, `PlayerInfo`, `GameLog`. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.types.ts` | new | `GameLogViewModel`. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.map.ts` | new | Pure `toGameLogEntries`. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.hook.ts` | new | `useGameLog`: reads `useGameBoard()`, calls the map fn. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.fixtures.ts` | new | Empty log, multi-entry log view models. | implementer-a |
| `src/modules/hud/components/GameLog/index.ts` | new | Component public API. | implementer-a |
| `src/modules/hud/components/GameLog/GameLog.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.tsx` | new | `GameLogView` + connected `GameLog`. | implementer-b |
| `src/modules/hud/components/GameLog/GameLog.map.test.ts` | new | Reverse-order, empty-log cases. | tester-a |
| `src/modules/hud/components/GameLog/GameLog.hook.test.ts` | new | Mocks `useGameBoard`. | tester-a |
| `src/modules/hud/components/GameLog/GameLog.test.tsx` | new | Renders entries newest-first; empty state. | tester-b |
| `src/modules/hud/components/GameLog/GameLog.preview.tsx` | new | Empty / With entries states. | preview-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts` | new | `PlayerInfoProps`, `BuffViewModel`, `ResourceStatViewModel`, `PlayerInfoViewModel`. | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts` | new | Pure `toPlayerInfoViewModel`. | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.hook.ts` | new | `usePlayerInfo`: reads `useGameBoard()` for `turnTimer`/`isMyTurn`, calls the map fn with props. | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts` | new | Current-player-with-buffs, bot, no-buffs, near-goal view models + a sample `Player`. | implementer-a |
| `src/modules/hud/components/PlayerInfo/index.ts` | new | Component public API. | implementer-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts` | new | Color lookup tables + every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx` | new | `PlayerInfoView` + `React.memo`-wrapped connected `PlayerInfo`. If over 150 counted lines, split a `PlayerInfoStats.tsx` and/or `PlayerInfoBuffs.tsx` sub-component in the same folder (not part of the public API) — report which, if any, in the DONE message. | implementer-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.map.test.ts` | new | Derived-stat cases, buff presence/absence, vp% clamping. | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.hook.test.ts` | new | Mocks `useGameBoard`. | tester-a |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.test.tsx` | new | Renders stats, buffs, turn badge presence/absence. | tester-b |
| `src/modules/hud/components/PlayerInfo/PlayerInfo.preview.tsx` | new | Current player w/ buffs, bot, no buffs, near goal states. | preview-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.types.ts` | new | `ActionIcon`, `ActionViewModel`, `ActionsPanelData`, `ActionsPanelHandlers`, `ActionsPanelViewModel`, `ActionsPanelProps`. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.map.ts` | new | Pure `toActionsPanelData`. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.hook.ts` | new | `useActionsPanel`: reads `useGameBoard()`, calls the map fn, assembles `onActionClick`/`onCancelAction`/`onDeselectArmy`/`onEndTurn`. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.fixtures.ts` | new | My-turn-no-selection, army-selected-can-attack, card-action-in-progress, extra-move-active states. | implementer-a |
| `src/modules/hud/components/ActionsPanel/index.ts` | new | Component public API. | implementer-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.styles.ts` | new | Every Tailwind class + `cva` for the button variant (`isMain`, `isPendingMatch`), copied from the legacy file. | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.tsx` | new | `ActionsPanelView` + connected `ActionsPanel(props: ActionsPanelProps)`. | implementer-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.map.test.ts` | new | `canPosition`/`canAttack`/`deployCost`/disabled-reason cases. | tester-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.hook.test.ts` | new | Mocks `useGameBoard`; asserts `onActionClick` dispatches the right payload per id. | tester-a |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.test.tsx` | new | Button disabled states, tooltip content, cancel/deselect/end-turn, extra-move banner, `infoBeacon` slot renders. | tester-b |
| `src/modules/hud/components/ActionsPanel/ActionsPanel.preview.tsx` | new | States below. | preview-a |
| `src/features/game/components/GameBoard.tsx` | edit | Swap `ActionsPanel`/`GameLog` imports to `@/modules/hud`; pass `infoBeacon={<TutorialBeacon id="actions-info" .../>}` to `<ActionsPanel>` (same copy as today's `ActionsPanel.tsx:244-247`). No other line changes. | implementer-b |
| `src/features/game/components/PlayerInfoBar.tsx` | edit | Swap `PlayerInfo` import to `@/modules/hud`. No other line changes. | implementer-b |
| `src/testbed/registry.ts` | edit | Register `gameLogPreview`, `playerInfoPreview`, `actionsPanelPreview`. | preview-b (after preview-a's previews exist) |
| `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx` | deleted | Once the new components are verified. | implementer-b |
| `docs/README.md` | edit | Update `:33` (module list), `:40` (drop `ActionsPanel.tsx` from the legacy-consumers list), `:44` (note `PlayerInfoBar.tsx` now imports `PlayerInfo` from `@/modules/hud`), delete the `panels/` bullets at `:56-59` and add a `src/modules/hud/` paragraph mirroring the `combat/` one, `:129` (update the `ActionsPanel` zero-prop-drilling example reference if its shape changed). | implementer-b |

If any file exceeds 150 counted lines, the owner splits it by responsibility (not arbitrarily) and reports the added file. Do not trim comments or compress code to fit.

## Contracts
```ts
// ======================================================================
// src/modules/hud/index.ts
// ======================================================================
export { ActionsPanel } from './components/ActionsPanel';
export { PlayerInfo } from './components/PlayerInfo';
export { GameLog } from './components/GameLog';

// ======================================================================
// src/modules/hud/components/GameLog/GameLog.types.ts
// ======================================================================
export interface GameLogViewModel {
  /** Newest entry first — already reversed, the view renders in order. */
  entries: string[];
}

// ======================================================================
// src/modules/hud/components/GameLog/GameLog.map.ts
// ======================================================================
// Pure. Mirrors GameLog.tsx:22-26 (legacy): same entries, newest first.
export function toGameLogEntries(log: string[]): string[];

// ======================================================================
// src/modules/hud/components/GameLog/GameLog.hook.ts
// ======================================================================
import { useGameBoard } from '@/features/game/context/GameBoardContext';
export function useGameLog(): GameLogViewModel; // { entries: toGameLogEntries(gameState?.log ?? []) }

// ======================================================================
// src/modules/hud/components/GameLog/GameLog.tsx
// ======================================================================
// 'use client'. Pure view + connected wrapper (hook reads useGameBoard()).
export function GameLogView(viewModel: GameLogViewModel): JSX.Element;
export function GameLog(): JSX.Element; // return <GameLogView {...useGameLog()} />;

// ======================================================================
// src/modules/hud/components/PlayerInfo/PlayerInfo.types.ts
// ======================================================================
import type { ReactNode } from 'react';
import type { CardName, Player, PlayerColor, ResourceType } from '@/lib/types';

export interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer: boolean;
  vpGoal?: number; // default 10, matches legacy PlayerInfo.tsx:19
}

export type BuffId = 'collector' | 'explorer' | 'reinforce' | 'efficient' | 'builder' | 'extra-move' | 'sabotaged';

export interface BuffViewModel {
  id: BuffId;
  label: string;
  description: string; // the tooltip text, legacy PlayerInfo.tsx:60-66
}

export interface ResourceStatViewModel {
  type: ResourceType;
  label: string;
  value: number;
}

export interface TurnBadgeViewModel {
  isExpiring: boolean;
  showCountdown: boolean; // isMyTurn, legacy PlayerInfo.tsx:132
  formattedTime: string;
}

export interface PlayerInfoViewModel {
  name: string;
  color: PlayerColor;
  isBot: boolean;
  isCurrentPlayer: boolean;
  spriteSrc: string;
  armyCount: number;
  positionedCount: number;
  victoryPoints: number;
  vpGoal: number;
  vpPercent: number; // 0-100, clamped, legacy PlayerInfo.tsx:48
  specialCardsCount: number;
  specialCards: CardName[];
  attackPower: number;
  resources: ResourceStatViewModel[]; // Food, Wood, Gold in that order, legacy :211-214
  buffs: BuffViewModel[];
  /** null when isCurrentPlayer is false — legacy only rendered the badge then (:123-134). */
  turnBadge: TurnBadgeViewModel | null;
}

// ======================================================================
// src/modules/hud/components/PlayerInfo/PlayerInfo.map.ts
// ======================================================================
// Pure. Mirrors PlayerInfo.tsx:45-67 (derived stats, buffs) and :121-134 (turn badge fields).
// No React/JSX: buff/resource "icon" choice is a `BuffId`/`ResourceType` the view resolves.
export function toPlayerInfoViewModel(
  player: Player,
  isCurrentPlayer: boolean,
  vpGoal: number,
  turnTimer: { formattedTime: string; isExpiring: boolean },
  isMyTurn: boolean,
): PlayerInfoViewModel;

// ======================================================================
// src/modules/hud/components/PlayerInfo/PlayerInfo.hook.ts
// ======================================================================
import { useGameBoard } from '@/features/game/context/GameBoardContext';
export function usePlayerInfo(props: PlayerInfoProps): PlayerInfoViewModel;
// { turnTimer, isMyTurn } = useGameBoard(); return toPlayerInfoViewModel(props.player, props.isCurrentPlayer, props.vpGoal ?? 10, turnTimer, isMyTurn);

// ======================================================================
// src/modules/hud/components/PlayerInfo/PlayerInfo.tsx
// ======================================================================
// 'use client'. Buff/resource icon lookups (Record<BuffId | ResourceType, ComponentType<{className?:string}>>)
// live here, not in .map.ts or .styles.ts.
export function PlayerInfoView(viewModel: PlayerInfoViewModel): JSX.Element;
export const PlayerInfo: React.MemoExoticComponent<(props: PlayerInfoProps) => JSX.Element>;
// = React.memo(function PlayerInfo(props) { return <PlayerInfoView {...usePlayerInfo(props)} />; })

// ======================================================================
// src/modules/hud/components/ActionsPanel/ActionsPanel.types.ts
// ======================================================================
import type { ReactNode } from 'react';
import type { GameAction } from '@/lib/types';

export type ActionIcon = 'position' | 'attack' | 'deploy' | 'upgrade' | 'buy-card' | 'show-cards' | 'abilities-shop';

export interface ActionViewModel {
  id: GameAction;
  label: string;
  icon: ActionIcon;
  tooltip: string;
  disabled: boolean;
  disabledReason: string; // legacy getDisabledReason(action), ActionsPanel.tsx:158-202
  isPendingMatch: boolean; // legacy renderButton, ActionsPanel.tsx:205-210
}

export interface ActionsPanelData {
  mainActions: ActionViewModel[];       // Position, Attack
  alwaysAvailableActions: ActionViewModel[]; // Deploy
  secondaryActions: ActionViewModel[];  // Upgrade, Buy Card, Cards, Abilities
  deckCount: number;
  isMyTurn: boolean;
  hasSelectedArmy: boolean;
  isCancellableActionInProgress: boolean; // legacy :70-75
  hasExtraMoveBanner: boolean; // legacy :289, isMyTurn && localPlayer.hasExtraMove
  isEndTurnDisabled: boolean;  // legacy :270, isCardActionInProgress
  turnTimer: { formattedTime: string; percentage: number; isExpiring: boolean };
}

export interface ActionsPanelHandlers {
  onActionClick: (id: GameAction) => void;
  onCancelAction: () => void;
  onDeselectArmy: () => void;
  onEndTurn: () => void;
}

export type ActionsPanelViewModel = ActionsPanelData & ActionsPanelHandlers;

export interface ActionsPanelProps {
  /** Rendered next to the "Actions" title — see plan.md Decisions. */
  infoBeacon?: ReactNode;
}

// ======================================================================
// src/modules/hud/components/ActionsPanel/ActionsPanel.map.ts
// ======================================================================
import type { Army, GameState, Player } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';

export interface ActionsPanelMapInput {
  localPlayer: Player;
  gameState: GameState;
  isMyTurn: boolean;
  selectedArmy: Army | null;
  pendingAction: PendingAction;
  turnTimer: { formattedTime: string; percentage: number; isExpiring: boolean };
}

// Pure. Mirrors ActionsPanel.tsx:40-202 (legacy) exactly: currentTile lookup, hasArmyActed,
// canPosition, canAttack, canUseCardForAbility, deployCost, isCancellableActionInProgress,
// the three action lists, and getDisabledReason per action id.
export function toActionsPanelData(input: ActionsPanelMapInput): ActionsPanelData;

// ======================================================================
// src/modules/hud/components/ActionsPanel/ActionsPanel.hook.ts
// ======================================================================
import { useGameBoard } from '@/features/game/context/GameBoardContext';
export function useActionsPanel(): ActionsPanelViewModel;
// Reads useGameBoard(), calls toActionsPanelData(...), then builds onActionClick as a
// switch over GameAction.local_Position / local_Attack (onLocalAction(id, { army: selectedArmy })),
// local_ShowCards (onLocalAction(id, { playerId: localPlayer.id })),
// local_OpenAbilitiesShop (onLocalAction(id)), default (onAction(id)) — same payloads as
// legacy ActionsPanel.tsx:84,92,108,124,138,146,154.

// ======================================================================
// src/modules/hud/components/ActionsPanel/ActionsPanel.tsx
// ======================================================================
// 'use client'. Icon lookup (Record<ActionIcon, ComponentType<{className?:string}>>) lives here.
export function ActionsPanelView(viewModel: ActionsPanelViewModel & { infoBeacon?: ReactNode }): JSX.Element;
export function ActionsPanel(props: ActionsPanelProps): JSX.Element;
// return <ActionsPanelView {...useActionsPanel()} infoBeacon={props.infoBeacon} />;
```

## Phases
### Phase 1: Migrate all three panels into src/modules/hud
0. **Pre-flight check (whoever picks up this task, before implementer-a starts):** read `docs/ai/tasks/2026-10-03-game-rules-core-migration/progress.md`. If its Phase 1 is checked off through "implementation" but not yet "committed" (i.e. in progress, mid-edit, uncommitted), stop and do not start this task's implementation in parallel — finish or pause that task's Phase 1 first (it edits `src/features/game/panels/PlayerInfo.tsx:12`, which this task deletes; running both at once risks the exact conflict `docs/ai/lessons-learned.md:32` describes). If that task's Phase 1 is either not started yet or already committed, proceed — but if already committed, update step 2 below: import `PLAYER_DATA` from `@/modules/game-rules`, not `@/lib/player-data` (see Decisions, "`PLAYER_DATA` import source").
1. implementer-a: `GameLog.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`.
2. implementer-a: `PlayerInfo.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`. (sonnet — the buff/resource view-model shape and null `turnBadge` need care to avoid silently dropping a case; confirm the `PLAYER_DATA` import source per step 0 before writing `.map.ts`/`.fixtures.ts`)
3. implementer-a: `ActionsPanel.types.ts`, `.map.ts`, `.hook.ts`, `.fixtures.ts`, `index.ts`, `src/modules/hud/index.ts`. (sonnet — largest, most-branching `.map.ts`: `getDisabledReason` has 7 cases, each must keep its exact copy)
4. tester-a: `GameLog.map.test.ts`, `GameLog.hook.test.ts`.
5. tester-a: `PlayerInfo.map.test.ts`, `PlayerInfo.hook.test.ts`.
6. tester-a: `ActionsPanel.map.test.ts`, `ActionsPanel.hook.test.ts`. (sonnet — cover every `disabledReason` branch and the per-id `onActionClick` payloads)
7. implementer-b: `GameLog.styles.ts`, `GameLog.tsx`. Keep each entry's React `key` stable across the reversal (e.g. key by the post-reversal index is fine, but prefer keying by something that survives a log append, such as `log.length - 1 - index`, so new entries don't reshuffle existing keys) — not a behavior change today's output is visible-identical either way, but it's a one-line improvement worth doing while the file is already open.
8. implementer-b: `PlayerInfo.styles.ts`, `PlayerInfo.tsx` (split into sub-components if over 150 lines, see File plan). (sonnet — largest view, must stay pixel-identical)
9. implementer-b: `ActionsPanel.styles.ts`, `ActionsPanel.tsx`. (sonnet — button disabled/tooltip wiring, `infoBeacon` slot)
10. implementer-b: edit `GameBoard.tsx` (swap imports, add `infoBeacon`), edit `PlayerInfoBar.tsx` (swap import).
11. tester-b: `GameLog.test.tsx`, `PlayerInfo.test.tsx`, `ActionsPanel.test.tsx`; run `e2e/gameplay.spec.ts` (no source edit expected) to confirm the HUD still renders Food/Wood/Gold as before (triage: "`PlayerInfo` ... also by the e2e gameplay spec").
12. preview-a: `GameLog.preview.tsx`, `ActionsPanel.preview.tsx`.
13. preview-b: `PlayerInfo.preview.tsx`, then edit `src/testbed/registry.ts` to register all three previews.
14. implementer-b: delete `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx`; edit `docs/README.md`.

Model escalation: steps 2, 3, 6, 8, 9 (noted inline above) — the two largest/most-branching components (`ActionsPanel`, `PlayerInfo`) and their tests.

## Test plan
- tester-a (logic, first):
  - `toGameLogEntries`: empty array in → empty out; `['a','b','c']` → `['c','b','a']`; does not mutate the input array.
  - `usePlayerInfo`/hook: builds a view model from a mocked `useGameBoard()`.
  - `toPlayerInfoViewModel`: vpPercent clamps at 0 and 100 (vpGoal 0 case too, matching legacy `Math.min(100, Math.max(0, ...))`); each buff appears only when its source flag is true (`collector`, `explorer`, `reinforce`, `efficient`, `builder`, `extra-move`, `sabotaged`) and in the original order; `turnBadge` is `null` when `isCurrentPlayer` is false, and `showCountdown` is false when `isMyTurn` is false even if current player; resources array is `[Food, Wood, Gold]` in that order with the right values; falls back to `armyCount` when `player.armies` is absent (legacy `:45`) — add a fixture/case for it, don't assume `armies` is always populated.
  - `toActionsPanelData`: `canPosition`/`canAttack` true/false matrix against tile type, occupants, monsters, already-positioned; `deployCost` with `reinforceActive` (free), `efficientActive` (halved, rounded up), neither; every `disabledReason` branch for each of the 7 actions; `isCancellableActionInProgress` true for each of its 4 source flags; `isPendingMatch` true only when `pendingAction.cardName` (case-insensitively) is contained in the action label.
  - `useActionsPanel`/hook: `onActionClick(GameAction.local_Position)` calls `onLocalAction` with `{ army: selectedArmy }`; `local_ShowCards` with `{ playerId }`; `local_OpenAbilitiesShop` with no payload; `Deploy`/`Upgrade`/`BuyCard`/`EndTurn` call `onAction(id)`; `onCancelAction`/`onDeselectArmy` call `onLocalAction` with the right id.
- tester-b (view and e2e):
  - `GameLogView`: renders entries in view-model order; empty state shows no `<p>` elements.
  - `PlayerInfoView`: stat chips show the right numbers; buffs render only when present, each with its tooltip; turn badge absent for non-current player, present with countdown only when `isMyTurn`.
  - `ActionsPanelView`: each button's `disabled` and tooltip/disabledReason text; Cancel/Deselect buttons appear only when applicable; End Turn width style reflects `turnTimer.percentage`; extra-move banner shown only when `hasExtraMoveBanner`; `infoBeacon` prop renders in the header when provided, nothing when omitted.
  - e2e: `npm run test:e2e -- e2e/gameplay.spec.ts` (no source change expected) to confirm resource counts in the HUD render identically.

## Preview states
- `ActionsPanel`: My turn, no selection (`ActionsPanel.fixtures.ts`); Army selected, can attack; Card action in progress (Cancel visible); Extra Move active (banner + Cancel visible).
- `PlayerInfo`: Current player with buffs; bot player, no buffs; near victory goal (high vpPercent); non-current player (no turn badge).
- `GameLog`: Empty; With entries (multiple, confirm newest-first order visually).

## Risks
- `ActionsPanel`'s `getDisabledReason` has 7 branches with subtly different conditions (`ActionsPanel.tsx:158-202`) — a dropped branch is a silent behavior change, not a type error. Mitigated by the map test plan enumerating every branch explicitly.
- `PlayerInfo`'s buff list order is visually meaningful (badges render left-to-right in source order) — the map function must preserve the exact order from `PlayerInfo.tsx:60-66`, not reorder for convenience.
- The `infoBeacon` prop is a new public prop on a previously zero-prop component; if a future consumer forgets to pass it, the beacon silently disappears with no type error (it's optional). Acceptable: triage scope excludes `TutorialBeacon` copy/behavior changes, and `GameBoard.tsx` is the only call site, updated in this same phase.
- **Cross-task collision with `game-rules-core-migration` (row 2):** that task's Phase 1 also edits `src/features/game/panels/PlayerInfo.tsx` (repointing its `PLAYER_DATA` import), which this task's Phase 1 deletes outright. `docs/ai/refactor.md` row 5's "Depends on" column lists only `#1, #3`, so nothing stops both being worked in the same window. Mitigated by the Phase 1 step 0 pre-flight check (don't run both uncommitted at once) and the inverse-case note in Decisions (if `game-rules-core-migration` Phase 1 already committed, `PlayerInfo.map.ts`/`.fixtures.ts` import `PLAYER_DATA` from `@/modules/game-rules` instead of `@/lib/player-data`). Whichever task's Phase 1 lands second must reconcile its `PLAYER_DATA` import source against whatever is actually on disk, not this plan's literal Contracts text.

## Review (architect-b)
VERDICT: APPROVED (after revision — see Revision (architect-a) below; original CHANGES REQUESTED findings follow for the record)

- **Undocumented collision with the in-progress `game-rules-core-migration` task (row 2).** That task's `plan.md` (Status: APPROVED, `progress.md` Phase 1 "plan approved" ticked, implementation not yet started) lists `src/features/game/panels/PlayerInfo.tsx` as an edit target for its implementer-b: "repoint `PLAYER_DATA` import (`:12`) to `@/modules/game-rules`" (`docs/ai/tasks/2026-10-03-game-rules-core-migration/plan.md`, File plan). This plan's Phase 1 step 14 deletes that exact file, and its `PlayerInfo.map.ts` contract imports `PLAYER_DATA` from `@/lib/player-data` (Verified context row: `PLAYER_DATA` | `src/lib/player-data.ts:18-53`). `docs/ai/refactor.md` row 5's "Depends on" column lists only `#1, #3`, not `#2` — so nothing currently stops both tasks from being implemented in the same window, and row 2's own "Files" column in `refactor.md` doesn't disclose that its implementation also touches a row-5 file. This is the exact failure mode already recorded in `docs/ai/lessons-learned.md:32` ("a migration task was kicked off in parallel with a task it depended on... the dependency task deleted a module mid-migration and broke the dependent task's typecheck/dev-server partway through"), just with the dependency direction reversed (here, two independent rows each plan to edit/delete the same file).
  - Fix: add a step to this plan's Phase 1 (before implementer-a starts) requiring whoever picks up this task to check `docs/ai/tasks/2026-10-03-game-rules-core-migration/progress.md` first. If that task's Phase 1 implementation is in progress (started but not committed) when this task begins, do not run both at once — finish or pause one first. Also add a one-line note to this plan's Risks (or File plan row for `src/features/game/panels/PlayerInfo.tsx`) stating the inverse case: if `game-rules-core-migration` Phase 1 lands first, `PLAYER_DATA` will already be re-exported from `@/modules/game-rules` and no longer live at `@/lib/player-data` — this plan's `PlayerInfo.map.ts`/`.fixtures.ts` must then import it from `@/modules/game-rules` instead, and the Verified context row updated accordingly. Either way, whichever task lands second must adapt its own `PLAYER_DATA` import source to match reality at that time, not what's currently on disk.
  - Not blocking the rest of the plan's design — everything else in Verified context, the File plan, and the Contracts checks out against the current code (see below). This is purely a sequencing/coordination gap between two sibling task folders.

## Verification performed
- Re-read `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx` in full: every line range, prop shape, `GameAction` id, and `getDisabledReason`/`isPendingMatch` condition cited in Verified context and the Contracts matches the live file byte-for-byte (e.g. `ActionsPanel.tsx:158-202`'s 7-branch switch, `PlayerInfo.tsx:59-67`'s buff list order and conditions, `GameLog.tsx:22-26`'s map-then-reverse).
- Confirmed `GameAction`, `HAND_LIMIT`, `PendingAction` (`src/lib/types/actions.ts`, `src/lib/types/dialogs.ts:56-59`) match the plan's cited shapes exactly, including every `local_*` id used in the hook contract.
- Confirmed `GameBoardContextType` (`src/modules/game-board/game-board.types.ts:86-113`) exposes `turnTimer`, `isMyTurn`, `uiState.pendingAction`, `onAction`/`onLocalAction` as cited.
- Re-grepped `ActionsPanel|PlayerInfo|GameLog` across `src`, `e2e`, `docs`, `scripts`, `.claude`, `CLAUDE.md`, and every other task folder (including untracked ones). Every hit besides the one above is either already in the File plan (`GameBoard.tsx`, `PlayerInfoBar.tsx`, the five `docs/README.md` line ranges — all five line numbers reverified with `grep -n`, exact matches at :33, :40, :44, :56-59, :129) or informational prose in `docs/ai/refactor.md`/`docs/gameplay-ideas.md`/sibling triage docs that already defers to this row.
- Noted in passing, not a plan defect: `src/docs/README.md` is a stale, fully-committed duplicate of `docs/README.md` (predates the module migrations, e.g. still describes `GameBoardContext.tsx` as the real implementation rather than a re-export). Pre-existing, unrelated to this task, out of scope here.
- `GameLog`'s legacy code reverses the array of already-keyed `<p>` elements (`log.map((log, index) => <p key={index}>...).reverse()`), so each message's React key is its original array index. The planned `toGameLogEntries` reverses the strings first, so the view's `entries.map((entry, index) => <p key={index}>...)` assigns index keys post-reversal — a different key per message than today. Not a visible behavior change (no per-message state or animation to lose on reconciliation), so not a blocking finding, but worth a one-line callback if implementer-b wants key stability to match exactly.

## Revision (architect-a)
Addressed the blocking finding:
- Verified context's `PLAYER_DATA` row now states the collision with `game-rules-core-migration`'s Phase 1 (same file, `PlayerInfo.tsx:12`, both an edit target there and a delete target here).
- Added Phase 1 step 0: a pre-flight check of `game-rules-core-migration/progress.md` before implementation starts, so the two tasks are never both mid-edit on `PlayerInfo.tsx` at once.
- Added a Decisions bullet and a Risks bullet covering the inverse case: if `game-rules-core-migration` Phase 1 commits first, `PlayerInfo.map.ts`/`.fixtures.ts` import `PLAYER_DATA` from `@/modules/game-rules` instead of `@/lib/player-data`, and implementer-a is pointed to this check from step 2.
Addressed one non-blocking note: Phase 1 step 7 now tells implementer-b to key `GameLog` entries by a value stable across appends rather than post-reversal index.
Not addressed (per coordinator instruction, optional and left as-is): the stale `src/docs/README.md` duplicate — out of scope, already recorded as "not a plan defect" above.
