# Plan: Migrate CombatDialog and MonsterCombatDialog to src/modules/combat

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change)

## Goal and acceptance criteria
- [ ] `src/modules/combat/` exists with `CombatDialog` and `MonsterCombatDialog` built per component-architecture (types/map/hook/styles/view split), each rendering **pixel-identical** output to today's legacy components for the same props.
- [ ] `src/features/game/components/GameDialogManager.tsx` imports both dialogs from `@/modules/combat` instead of `../dialogs/CombatDialog` / `../dialogs/MonsterCombatDialog`; no other line of `GameDialogManager.tsx` changes (see Decisions — GameDialogManager itself is NOT migrated).
- [ ] `src/features/game/dialogs/CombatDialog.tsx` and `src/features/game/dialogs/MonsterCombatDialog.tsx` are deleted once the new components are verified; no other file under `src/features/game/dialogs/` changes.
- [ ] Each new component has a testbed preview covering its visual states, screenshot-verified (skill `ui-verify`).
- [ ] `npm run typecheck`, `npm run lint` (zero warnings) and `npm test` pass; `npm run build` passes; `docs/README.md` describes the new `src/modules/combat/` layout and the updated `GameDialogManager` bullet.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameDialogManager` | `src/features/game/components/GameDialogManager.tsx:24-273` | The parent. Mounts `CombatDialog` (`:79-87`) and `MonsterCombatDialog` (`:89-98`) as siblings under a `{/* SHARED DIALOGS */}` comment, alongside ~13 other legacy dialogs it keeps rendering directly (`PositionDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `AbilitiesDialog`, `StealResourceDialog`, `SabotageDialog`, `WealthyDialog`, `CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `ConfirmExitDialog`, `HostLeaveDialog`). Imports at `:1-22`. |
| `CombatDialog` (current) | `src/features/game/dialogs/CombatDialog.tsx:1-250` | Props `CombatDialogProps` (`:23-29`): `gameState`, `onRoll`, `onClose`, `isMyTurn` (required), `localPlayerId` (required). **Does not call `useGameBoard()`** — fully prop-driven. Local state: `selectedCard` (`:32`), `isRolling` (`:33`). Early returns `null` if `!combatState` (`:36`) or no matching `defender` (`:43`). |
| `MonsterCombatDialog` (current) | `src/features/game/dialogs/MonsterCombatDialog.tsx:1-354` | Props `MonsterCombatDialogProps` (`:23-30`): `gameState`, `onRoll`, `onClose`, `onCancel`, `isMyTurn = false`, `localPlayerId` (both optional). Also prop-driven, no `useGameBoard()`. Local state: `selectedCard` (`:41`), `decidedValue` (`:42`). Three render branches via `renderContent()` (`:337-345`): results (`phase === 'results'`, highest priority, shown to attacker AND spectators) → spectator (`!isAttacker`, rolling) → attack (attacker, rolling). |
| `GameState.combatState` / `.monsterCombatState` | `src/lib/types/combat.ts:5-24` | `CombatState { attackerId, attackingArmyId, defenderId, defendingArmyId, attackerRolls: number[], defenderRolls: number[], winnerId: number \| null, phase: 'rolling' \| 'results' }`. `MonsterCombatState { attackerId, attackerPosition, monster: Monster, attackerRolls: number[], monsterRolls: number[], winnerId: number \| null, phase }`. |
| `GameState.players` | `src/lib/types/game.ts:29-47` | `players: Player[]`, indexable by seat id. |
| `Player` | `src/lib/types/player.ts:19-38` | `color: PlayerColor` (`'blue'\|'red'\|'purple'\|'yellow'`), `specialCards: CardName[]`, `actionsThisTurn: GameAction[]`, `attackPower: number`. |
| `Monster` | `src/lib/types/monsters.ts:9-16` | `{ name: MonsterName; level: number; sprite: { idle, attack, death } }`. |
| `PLAYER_DATA` | `src/lib/player-data.ts:19-53` | `PLAYER_DATA[color].sprite.{idle,attack,death}` — player sprite paths. Legacy, but `src/lib/**` is not `@/features/*`, so importable anywhere (not restricted by `no-restricted-imports`). |
| `FightIcon` | `src/components/icons.tsx:47` | Used in `CombatDialog`'s header and VS divider. `@/components/icons` is not `@/features/*`, importable in `.tsx`. |
| ESLint module boundaries | `eslint.config.mjs:42-57` (`RESTRICTED_IMPORTS`), `:77-96` (zones) | `MODULE_FILES` (`src/modules/**/*.{ts,tsx}`) forbids `@/features/*` in **every** module file; the override at `:88-96` re-adds that permission **only** for `*.hook.ts`. `max-lines` caps every file at 150 counted lines (`:73`). |
| component-architecture table | `.claude/skills/component-architecture/SKILL.md:56` | "Legacy UI and context (`@/features/*`) only in `*.hook.ts`." Combined with ".hook.ts ... Never: Return JSX" (same file, file-responsibility table), this is why `GameDialogManager` cannot be migrated as one `.tsx` (see Decisions). |
| Dead code in the current files | `CombatDialog.tsx:21` (`Badge` imported, never rendered), `:71` (`isViewer` computed, never read), `MonsterCombatDialog.tsx:27,32` (`onCancel` prop typed and destructured, never called — `handleCancel` at `:49-51` calls only `onClose`) | None of these affect rendered output. `src/features/**` is unlinted (`LEGACY_PATHS`); once moved into `src/modules`, `no-unused-vars` would flag all four. Dropping them is not a behavior change (see Decisions). |
| Testbed preview pattern | `src/testbed/legacy/SabotageDialog.preview.tsx:1-119`, `src/testbed/registry.ts:1-8`, `src/testbed/testbed.types.ts` | `ComponentPreview { slug, title, group, states: { name, render }[] }`. Register by importing the preview and adding it to the `previews` array. |
| `GameAction` values used | `src/lib/types/actions.ts:21-25` | `CombatRoll`, `CloseCombat`, `MonsterCombatRoll`, `CloseMonsterCombat`, `UseCard` — read-only reference for `GameDialogManager`'s existing call sites (`:82-96`), which do not change. |
| `docs/README.md` sections to update | `:33` (`src/modules/` bullet), `:40` (game-board description, the pattern to mirror), `:46` (`GameDialogManager.tsx` bullet), `:127` (game-board "Definition Files" paragraph, the pattern to mirror) | No existing bullet lists individual dialog files (`grep` for `CombatDialog.tsx`/`MonsterCombatDialog.tsx` as filenames found nothing), so there is nothing to remove, only to add. `src/docs/README.md` is a stale duplicate, not the canonical doc (CLAUDE.md points to `docs/README.md`) — do not edit it. |

**Correction to triage's premise:** triage.md's "Why this tier" calls these components "direct view-layer consumers of the already-migrated GameBoardContext." That is not accurate for `CombatDialog`/`MonsterCombatDialog` themselves — neither calls `useGameBoard()`; both are already pure, prop-driven components. Only `GameDialogManager` (which is *not* being migrated structurally, see below) reads the context. The file-count/LOC rationale for tier M and 3 phases still holds.

## Decisions
- **`GameDialogManager.tsx` stays in `src/features/game/components/`; only its two imports change.** It renders ~15 dialogs, 13 of which stay legacy. A `.tsx` under `src/modules/**` cannot import `@/features/*` at all (`eslint.config.mjs:77-86`, only `*.hook.ts` is exempted at `:88-96`), and a `.hook.ts` must never return JSX (component-architecture file table). There is no lint-legal way to move a component that directly renders 13 untouched legacy dialog components into `src/modules`. Migrating those 13 dialogs is out of scope (triage Scope: "Out: any change to dialog content... or GameBoardContext itself"; doing so would also blow past tier M). This is exactly the "Migrating a legacy component" pattern in component-architecture: build the new component, "switch the import in the parent" — the parent is allowed to stay legacy.
- **Domain name `combat`**, matching the example domain list in component-architecture (`hud, combat, cards, lobby, map`).
- **Neither component gets a `NameView`/connected split.** That split is for a hook that reads legacy context (`useGameBoard()`, a service). Here each hook only manages local UI state derived from props (`selectedCard`, `isRolling`/`decidedValue`) — component-architecture: "When the hook only manages UI state derived from props..., the view calls it directly and there is no `NameView`." So each `.tsx` exports exactly one component, taking the same props the legacy version takes.
- **`MonsterCombatDialog` splits its three render branches into three small presentational components** (`MonsterAttackScreen.tsx`, `MonsterResultsScreen.tsx`, `MonsterSpectatorScreen.tsx`) inside the same component folder, each receiving only the slice of the view model it renders (narrow props, interface segregation). This is necessary to stay under the 150-line cap (the current `renderAttackScreen` alone is ~130 JSX lines) and keeps one JSX responsibility per file. They are not part of the module's public API — only `MonsterCombatDialog` is exported from `index.ts`.
- **Drop the four dead-code items** found above (`Badge` import, `isViewer`, the unused `onCancel` destructure in the new component's render path — the prop stays in the type since `GameDialogManager` still passes it, it is simply not destructured/used internally, matching today's actual behavior exactly). None of these affect rendered output; keeping them would fail `no-unused-vars` once linted.
- **No shared `.styles.ts` between the two components yet.** Several classes (dice cell, combatant box, VS divider) look alike between `CombatDialog` and `MonsterCombatDialog`. kiss-dry-solid: "extract when the copies must change together, or at the third copy." Two components, no third consumer yet — each keeps its own `.styles.ts`, copied verbatim from the cited source lines below.
- **Characterization tests first**, one per component, written against the CURRENT legacy file, before any extraction (component-architecture "Migrating a legacy component", step 1). They get adapted into each component's `.test.tsx` against the new implementation (step 3), then the characterization file and the legacy source file are deleted together (step 4) once the new version passes.
- **Preserve both prop signatures exactly**, including the asymmetry: `CombatDialogProps.isMyTurn`/`localPlayerId` are required; `MonsterCombatDialogProps.isMyTurn = false`/`localPlayerId` are optional with that default. `GameDialogManager` always passes both, so the default never fires in production — do not "fix" or harmonize this.
- **`winner`/outcome text keep reading `players[winnerId]` conceptually, but the map functions use the already-known `attacker`/`defender` objects directly** (when `isCombatOver`/`isPlayerWinner`, `winnerId` always equals either `attackerId` or `defenderId`, so indexing `players[winnerId]` and using the matching side's own fields are equivalent — avoids a second lookup, same output).
- Rejected: moving `GameDialogManager` to modules by wrapping the 13 remaining legacy dialogs behind a single new legacy-only adapter component — unnecessary indirection for dialogs nobody asked to migrate (kiss-dry-solid: no speculative layers).
- Rejected: a `.service.ts` for either component — no Firestore or other I/O; both are pure render + local UI state.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx` | new (deleted end of Phase 1) | Captures today's `CombatDialog` behavior before extraction. | tester-a |
| `src/modules/combat/index.ts` | new (Phase 1), edit (Phase 2 adds `MonsterCombatDialog`) | Module public API. | implementer-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.types.ts` | new | `CombatDialogProps`, `CombatCardSelection`, view-model types. | implementer-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.map.ts` | new | Pure `toCombatDialogViewModel`. | implementer-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.hook.ts` | new | `useCombatDialog`: local UI state + handlers. | implementer-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.fixtures.ts` | new | Deterministic `GameState`/player fixtures for tests + preview. | implementer-a |
| `src/modules/combat/components/CombatDialog/index.ts` | new | Component public API. | implementer-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.tsx` | new | The view. | implementer-b |
| `src/features/game/components/GameDialogManager.tsx` | edit | Swap the `CombatDialog` import to `@/modules/combat` (Phase 1), then `MonsterCombatDialog` too (Phase 2). No other line changes. | implementer-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.hook.test.ts` | new | tester-a |
| `src/modules/combat/components/CombatDialog/CombatDialog.test.tsx` | new | Adapted characterization cases against the new view. | tester-b |
| `src/modules/combat/components/CombatDialog/CombatDialog.preview.tsx` | new | preview-a |
| `src/testbed/registry.ts` | edit | Register `combatDialogPreview` (Phase 1), `monsterCombatDialogPreview` (Phase 2). | preview-a (Phase 1), preview-b (Phase 2) |
| `src/features/game/dialogs/CombatDialog.tsx`, `src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx` | deleted | End of Phase 1, once the new version is verified. | implementer-b |
| `src/features/game/dialogs/__tests__/MonsterCombatDialog.characterization.test.tsx` | new (deleted end of Phase 2) | Captures today's `MonsterCombatDialog` behavior. | tester-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.types.ts` | new | Props, screen view-model union. | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts` | new | Pure `toMonsterCombatViewModel`. | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.hook.ts` | new | `useMonsterCombatDialog`: local UI state + handlers. | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.fixtures.ts` | new | Fixtures for all three screens. | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/index.ts` | new | Component public API. | implementer-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.tsx` | new | Shell: `AlertDialog` + picks the screen. | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterAttackScreen.tsx` | new | Attack-screen JSX. | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterResultsScreen.tsx` | new | Results-screen JSX. | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterSpectatorScreen.tsx` | new | Spectator-screen JSX. | implementer-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.test.ts` | new | tester-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.hook.test.ts` | new | tester-a |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.test.tsx` | new | tester-b |
| `src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview.tsx` | new | preview-b |
| `src/features/game/dialogs/MonsterCombatDialog.tsx`, `src/features/game/dialogs/__tests__/MonsterCombatDialog.characterization.test.tsx` | deleted | End of Phase 2. | implementer-b |
| `docs/README.md` | edit | `src/modules/` bullet (`:33`), add a `src/modules/combat/` paragraph mirroring the game-board one (`:127`), update the `GameDialogManager.tsx` bullet (`:46`) to note it mounts the two migrated dialogs from `@/modules/combat`. | implementer-b (Phase 3) |

If any file exceeds 150 counted lines, the owner splits it by responsibility (not arbitrarily) and reports the added file. Do not trim comments or compress code to fit.

## Contracts
```ts
// ======================================================================
// src/modules/combat/index.ts
// ======================================================================
export { CombatDialog } from './components/CombatDialog';
export { MonsterCombatDialog } from './components/MonsterCombatDialog';

// ======================================================================
// src/modules/combat/components/CombatDialog/CombatDialog.types.ts
// ======================================================================
import type { GameState, PlayerColor } from '@/lib/types';

export interface CombatDialogProps {
  gameState: GameState;
  onRoll: (payload: { useWarChief: boolean; useOvercome: boolean }) => void;
  onClose: () => void;
  isMyTurn: boolean;
  localPlayerId: number;
}

export type CombatCardSelection = 'none' | 'overcome' | 'warchief';

export interface CombatantViewModel {
  name: string;
  color: PlayerColor;
  sprite: string;       // attack or death sprite, already resolved
  isWinner: boolean;     // only meaningful when isCombatOver
  rolls: number[];
  total: number;
}

export interface CombatDialogViewModel {
  phase: 'rolling' | 'results';
  isCombatOver: boolean;
  attacker: CombatantViewModel;
  defender: CombatantViewModel;
  winner: { name: string; color: PlayerColor } | null; // null = draw; only read when isCombatOver
  canPerformAction: boolean;   // isMyTurn && isAttacker
  canSelectCard: boolean;      // phase === 'rolling' && canPerformAction && canUseCard && (hasOvercomeCard || hasWarChiefCard)
  hasOvercomeCard: boolean;
  hasWarChiefCard: boolean;
}

// ======================================================================
// src/modules/combat/components/CombatDialog/CombatDialog.map.ts
// ======================================================================
// Pure. Mirrors CombatDialog.tsx:36-83 (legacy) exactly, minus `isViewer` (dead).
// Returns null exactly when the legacy component would have returned null:
// no combatState (:36), or no matching defender (:43).
export function toCombatDialogViewModel(
  gameState: GameState,
  localPlayerId: number,
  isMyTurn: boolean,
): CombatDialogViewModel | null;

// ======================================================================
// src/modules/combat/components/CombatDialog/CombatDialog.hook.ts
// ======================================================================
export interface CombatDialogState {
  viewModel: CombatDialogViewModel | null;
  selectedCard: CombatCardSelection;
  isRolling: boolean;
  onSelectCard: (card: CombatCardSelection) => void;
  onRollClick: () => void;   // sets isRolling true, then onRoll({ useWarChief: selectedCard === 'warchief', useOvercome: selectedCard === 'overcome' })
  onClose: () => void;       // passthrough of props.onClose
}
export function useCombatDialog(props: CombatDialogProps): CombatDialogState;

// ======================================================================
// src/modules/combat/components/CombatDialog/CombatDialog.tsx
// ======================================================================
// 'use client'. No NameView split (see Decisions). Renders null when viewModel is null.
export function CombatDialog(props: CombatDialogProps): JSX.Element | null;

// ---- CombatDialog.styles.ts: required literal classes (copy verbatim; this is not an
// exhaustive list of every className in the legacy file — copy the rest from the cited lines) ----
// AlertDialogContent wrapper, CombatDialog.tsx:87 (legacy):
//   'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden'
// Dice cell, :58-62 (legacy) — a function of isWinner, e.g. styles.diceCell({ isWinner }):
//   isWinner:  'flex h-9 w-9 items-center justify-center rounded-lg border-2 text-base font-black shadow-md transition-transform duration-300 bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
//   !isWinner: 'flex h-9 w-9 items-center justify-center rounded-lg border-2 text-base font-black shadow-md transition-transform duration-300 bg-black/60 border-white/20 text-foreground'
// Combatant box, :143-147 and :173-177 (legacy) — a function of isWinnerBox:
//   isWinnerBox:  'flex-1 flex flex-col items-center p-3 rounded-xl border transition-all border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
//   !isWinnerBox: 'flex-1 flex flex-col items-center p-3 rounded-xl border transition-all border-white/10 bg-black/40'
// Roll button, :224 (legacy): 'w-full font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)]'
// Confirm Results button, :241 (legacy): 'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]'
// Drop the `Badge` import (dead) and `isViewer` local (dead) — see Decisions.

// ======================================================================
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.types.ts
// ======================================================================
import type { CardName, GameState, Monster, PlayerColor } from '@/lib/types';

export interface MonsterCombatDialogProps {
  gameState: GameState;
  onRoll: (payload: {
    monster: Monster;
    useDecideCard: boolean;
    decidedValue: number;
    useOvercomeCard: boolean;
    useWarChief: boolean;
  }) => void;
  onClose: () => void;
  // Kept for signature compatibility with GameDialogManager's call site; never invoked
  // internally today (legacy handleCancel calls only onClose) — do not wire it up, that
  // would be a behavior change, out of scope.
  onCancel: (payload?: { cardName?: CardName }) => void;
  isMyTurn?: boolean;
  localPlayerId?: number;
}

export type MonsterCombatCardSelection = 'none' | 'overcome' | 'warchief' | 'decide';

export interface MonsterAttackViewModel {
  title: string;               // `Monster Encounter: ${monsterLabel ?? 'Monster'}`
  attackerName: string;
  attackerColor: PlayerColor;
  attackerSprite: string;      // attack sprite
  attackerPowerLabel: string;  // `Power: ${n} (${n === 1 ? '1 Die' : n + ' Dice'})`, n = attackPower + 1
  monster: { name: string; sprite: string; powerLabel: string } | null; // attack sprite; powerLabel uses monster.level
  canSelectCard: boolean;      // canUseCard && (hasOvercomeCard || hasWarChiefCard || hasDecideCard)
  hasOvercomeCard: boolean;
  hasWarChiefCard: boolean;
  hasDecideCard: boolean;
  canAttack: boolean;          // !!monster
}

export interface MonsterResultsViewModel {
  isPlayerWinner: boolean;
  attacker: { name: string; color: PlayerColor; sprite: string; rolls: number[]; total: number; isWinner: boolean };
  monster: { name: string; sprite: string | null; rolls: number[]; total: number; isWinner: boolean } | null;
  outcomeText: string;         // `${attackerName} Defeated the Monster!` | 'The Monster prevailed!'
}

export interface MonsterSpectatorViewModel {
  attackerName: string;
  monsterLabel: string;        // `${monster.name} (Lvl ${monster.level})`, or 'the monster' if absent
}

export type MonsterCombatScreen =
  | { kind: 'attack'; data: MonsterAttackViewModel }
  | { kind: 'results'; data: MonsterResultsViewModel }
  | { kind: 'spectator'; data: MonsterSpectatorViewModel };

export interface MonsterCombatViewModel {
  isAttacker: boolean; // drives AlertDialog's onOpenChange, independent of which screen is shown
  screen: MonsterCombatScreen;
}

// ======================================================================
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.map.ts
// ======================================================================
// Pure. Mirrors MonsterCombatDialog.tsx:33-345 (legacy): isAttacker formula at :39
// (`localPlayerId !== undefined ? localPlayerId === attackerId : isMyTurn`), screen choice
// at :337-345 (results first regardless of isAttacker, then spectator, then attack).
// Returns null exactly when the legacy component would (!monsterCombatState, :34).
export function toMonsterCombatViewModel(
  gameState: GameState,
  isMyTurn: boolean,
  localPlayerId?: number,
): MonsterCombatViewModel | null;

// ======================================================================
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.hook.ts
// ======================================================================
export interface MonsterCombatDialogState {
  viewModel: MonsterCombatViewModel | null;
  selectedCard: MonsterCombatCardSelection;
  decidedValue: number;             // default 6, legacy :42
  onSelectCard: (card: MonsterCombatCardSelection) => void;
  onDecidedValueChange: (value: number) => void;
  onAttack: () => void;             // builds the onRoll payload from gameState.monsterCombatState!.monster + selectedCard/decidedValue; no-ops if there is no monster (legacy :54 guard)
  onCancel: () => void;             // wraps legacy handleCancel: calls props.onClose only (see Decisions)
  onContinue: () => void;           // results screen's "Continue" button -> props.onClose
}
export function useMonsterCombatDialog(props: MonsterCombatDialogProps): MonsterCombatDialogState;

// ======================================================================
// src/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.tsx
// ======================================================================
// 'use client'. Renders null when viewModel is null. Shell only:
// <AlertDialog open={true} onOpenChange={viewModel.isAttacker ? onCancel : undefined}>
//   <AlertDialogContent className={styles.content}>
//     {screen.kind === 'attack' && <MonsterAttackScreen .../>}
//     {screen.kind === 'results' && <MonsterResultsScreen .../>}
//     {screen.kind === 'spectator' && <MonsterSpectatorScreen .../>}
//   </AlertDialogContent>
// </AlertDialog>
export function MonsterCombatDialog(props: MonsterCombatDialogProps): JSX.Element | null;

// ---- MonsterAttackScreen.tsx props ----
export interface MonsterAttackScreenProps {
  data: MonsterAttackViewModel;
  selectedCard: MonsterCombatCardSelection;
  decidedValue: number;
  onSelectCard: (card: MonsterCombatCardSelection) => void;
  onDecidedValueChange: (value: number) => void;
  onCancel: () => void;
  onAttack: () => void;
}
// ---- MonsterResultsScreen.tsx props ----
export interface MonsterResultsScreenProps {
  data: MonsterResultsViewModel;
  onContinue: () => void;
}
// ---- MonsterSpectatorScreen.tsx props ----
export interface MonsterSpectatorScreenProps {
  data: MonsterSpectatorViewModel;
}

// ---- MonsterCombatDialog.styles.ts: required literal classes (copy verbatim; copy the
// rest from the cited lines, same dice-cell/combatant-box shapes as CombatDialog but this
// is a separate file per the "no shared styles yet" decision) ----
// AlertDialogContent wrapper, MonsterCombatDialog.tsx:349 (legacy): same string as CombatDialog's.
// Attack-screen attacker/monster box, :109 and :129 (legacy):
//   attacker: 'flex-1 flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40'
//   monster:  'flex-1 flex flex-col items-center p-3 rounded-xl border border-destructive/30 bg-destructive/10'
// Results-screen boxes, :250-254 and :273-277 (legacy) — functions of isWinnerBox:
//   attacker isWinner:  'flex-1 flex flex-col items-center p-3 rounded-xl border border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
//   attacker !isWinner: 'flex-1 flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40'
//   monster !isPlayerWinner: 'flex-1 flex flex-col items-center p-3 rounded-xl border border-red-500 bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
//   monster isPlayerWinner:  'flex-1 flex flex-col items-center p-3 rounded-xl border border-white/10 bg-black/40'
// Dice cell: identical shape to CombatDialog's (duplicated, not shared — see Decisions).
// Attack button, :212 (legacy): 'font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)] text-xs px-4'
// Continue button (AlertDialogAction), :309 (legacy): 'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)]'

// ======================================================================
// src/features/game/components/GameDialogManager.tsx — the only edit (two import lines)
// ======================================================================
// Replace:
//   import { CombatDialog } from '../dialogs/CombatDialog';
//   import { MonsterCombatDialog } from '../dialogs/MonsterCombatDialog';
// With:
//   import { CombatDialog, MonsterCombatDialog } from '@/modules/combat';
// No other line changes (JSX at :79-98 stays byte-identical).
```

## Phases
### Phase 1: CombatDialog
1. (tester-a) Write `CombatDialog.characterization.test.tsx` against the CURRENT `../CombatDialog`; run it, must pass against the unmodified file. Cases per Test plan.
2. (implementer-a) `CombatDialog.types.ts`, `CombatDialog.map.ts`.
3. (tester-a) `CombatDialog.map.test.ts`; run it.
4. (implementer-a) `CombatDialog.hook.ts`, `CombatDialog.fixtures.ts`, `src/modules/combat/components/CombatDialog/index.ts`, `src/modules/combat/index.ts`.
5. (tester-a) `CombatDialog.hook.test.ts`; run it.
6. (implementer-b) `CombatDialog.styles.ts`, `CombatDialog.tsx`.
7. (tester-b) `CombatDialog.test.tsx`, adapting the characterization cases to import `CombatDialog` from `..`; run it against the new component.
8. (preview-a) `CombatDialog.preview.tsx`; register it in `src/testbed/registry.ts`.
9. (implementer-b) Swap the `CombatDialog` import in `GameDialogManager.tsx` to `@/modules/combat`.
10. Run `npx jest src/modules/combat/components/CombatDialog src/features/game/components`; all green.
11. ui-verify: screenshot the new preview's states (skill `ui-verify`, `node .claude/skills/ui-verify/scripts/snapshot.mjs`).
12. (implementer-b) Delete `src/features/game/dialogs/CombatDialog.tsx` and `src/features/game/dialogs/__tests__/CombatDialog.characterization.test.tsx`.
13. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none (prop-driven component, no context extraction risk).

### Phase 2: MonsterCombatDialog
1. (tester-a) Write `MonsterCombatDialog.characterization.test.tsx` against the CURRENT `../MonsterCombatDialog`; run it. Cases per Test plan.
2. (implementer-a) `MonsterCombatDialog.types.ts`, `MonsterCombatDialog.map.ts`.
3. (tester-a) `MonsterCombatDialog.map.test.ts`; run it.
4. (implementer-a) `MonsterCombatDialog.hook.ts`, `MonsterCombatDialog.fixtures.ts`, component `index.ts`; add `MonsterCombatDialog` to `src/modules/combat/index.ts`.
5. (tester-a) `MonsterCombatDialog.hook.test.ts`; run it.
6. (implementer-b) `MonsterCombatDialog.styles.ts`, `MonsterAttackScreen.tsx`, `MonsterResultsScreen.tsx`, `MonsterSpectatorScreen.tsx`, `MonsterCombatDialog.tsx`.
7. (tester-b) `MonsterCombatDialog.test.tsx`; run it against the new component.
8. (preview-b) `MonsterCombatDialog.preview.tsx`; register it in `src/testbed/registry.ts`.
9. (implementer-b) Swap the `MonsterCombatDialog` import in `GameDialogManager.tsx` to the combined `@/modules/combat` import (Contracts, final form).
10. Run `npx jest src/modules/combat/components/MonsterCombatDialog src/features/game/components`; all green.
11. ui-verify: screenshot the new preview's states.
12. (implementer-b) Delete `src/features/game/dialogs/MonsterCombatDialog.tsx` and `src/features/game/dialogs/__tests__/MonsterCombatDialog.characterization.test.tsx`.
13. `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: sonnet for implementer-a/implementer-b on this phase only (three-screen split, discriminated-union view model — more structural risk than Phase 1).

### Phase 3: Verification and docs
1. `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build`.
2. `grep -rn "dialogs/CombatDialog\|dialogs/MonsterCombatDialog" src` returns nothing; `grep -rn "@/modules/combat" src` shows exactly `GameDialogManager.tsx`.
3. Browser smoke (skill `ui-verify`): both new testbed preview pages, all states. If a live game page is reachable without Firebase credentials, exercise a combat and a monster-combat flow; otherwise state "unverified in browser beyond the testbed" and, if the emulator and Java 21 are available, run `npm run test:e2e -- e2e/gameplay.spec.ts` and report its result (otherwise report it as not run).
4. (implementer-b) Update `docs/README.md` per the File plan.
5. architect-b final review; coordinator commits per phase: `refactor(combat): migrate CombatDialog to src/modules [phase 1/3]`, `refactor(combat): migrate MonsterCombatDialog to src/modules [phase 2/3]`, `docs(combat): document the combat module [phase 3/3]`.

## Test plan
- tester-a (logic, first):
  - **Characterization (`CombatDialog.characterization.test.tsx`, against the legacy file first, then ported)**: rolling phase + `canPerformAction` (isMyTurn && localPlayerId === attackerId) shows the Roll button, not the waiting message; rolling phase + not attacker shows "Waiting for attacker to roll..."; the tactical-card radio group is absent when the attacker has neither card, present with only "Overcome" when `hasOvercomeCard`, with only "War Chief" when `hasWarChiefCard`, with both when both, and absent entirely when `canUseCard` is false (attacker already used a card this turn); clicking Roll with "Overcome" selected calls `onRoll({ useWarChief: false, useOvercome: true })` (and the War Chief / neither cases); results phase shows both dice rows, both totals, and the winner banner with the winning player's name, or "Draw - No Victor" when `winnerId` is null; the losing side's sprite is the death sprite, the winner's (or non-combatant's) is the attack sprite; clicking "Confirm Results" calls `onClose`; no `combatState` or no matching `defender` renders nothing.
  - `CombatDialog.map.test.ts`: `toCombatDialogViewModel` — null on no `combatState`; null when `defenderId` matches no player; `canPerformAction` true only when `isMyTurn && localPlayerId === attackerId`; `canSelectCard` false when `phase === 'results'`, false when the attacker already used a card (`actionsThisTurn` includes `UseCard`), false with neither special card, true with at least one and `canPerformAction`; `winner` is `{ name, color }` of the winning side when `winnerId` is set, `null` when `winnerId` is null; `attacker.isWinner`/`defender.isWinner` match `winnerId`; `attacker.sprite`/`defender.sprite` are the death sprite only for the losing side when `isCombatOver`, attack sprite otherwise (including both sides' sprite while `phase === 'rolling'`); totals equal the sum of `attackerRolls`/`defenderRolls` (including the empty-array / phase-rolling case, total 0).
  - `CombatDialog.hook.test.ts`: default `selectedCard` is `'none'`, default `isRolling` is `false`; `onSelectCard` updates `selectedCard`; `onRollClick` sets `isRolling` true and calls `props.onRoll` with the payload matching the current `selectedCard` (each of the three values); `onClose` calls `props.onClose`; when `toCombatDialogViewModel` returns null (via a `combatState`-less `gameState` fixture), `viewModel` is null and `onRollClick` still does not throw.
  - **Characterization (`MonsterCombatDialog.characterization.test.tsx`)**: attacker + `phase === 'rolling'` shows the attack screen with correct title (`Monster Encounter: <Name> (Lvl N)`), attacker power label, monster power label, and the Attack button disabled only when there is no monster; the tactical-card block is absent with no cards, shows "Decide Dice Roll" only when `hasDecideCard`, and selecting it reveals the slider (`decidedValue` starts at 6); non-attacker + `phase === 'rolling'` shows the spectator screen with no interactive buttons; `phase === 'results'` shows the results screen for BOTH the attacker and a non-attacker, with correct winner/loser sprites (attack vs death), both dice rows, both totals, and the outcome line ("`<name>` Defeated the Monster!" or "The Monster prevailed!"); clicking "Attack Monster!" calls `onRoll` with the selected card flags and `decidedValue`; clicking "Cancel" calls `onClose` (not `onCancel`); clicking "Continue" on the results screen calls `onClose`; no `monsterCombatState` renders nothing.
  - `MonsterCombatDialog.map.test.ts`: `toMonsterCombatViewModel` — null with no `monsterCombatState`; `isAttacker` uses `localPlayerId` when defined, falls back to `isMyTurn` when `localPlayerId` is `undefined`; screen is `'results'` whenever `phase === 'results'` regardless of `isAttacker` (both true and false); screen is `'spectator'` when `phase === 'rolling'` and not attacker; screen is `'attack'` when `phase === 'rolling'` and attacker; attack view model's `canSelectCard`/`canAttack`/power labels match each combination of the three special cards and presence/absence of a monster; results view model's `isPlayerWinner` and sprite selection match `winnerId === attackerId`; spectator view model's `monsterLabel` falls back to `'the monster'` only when the monster is literally absent (should not happen given the type, but mirrors the legacy `?? 'the monster'`/`? ... : 'the monster'` fallback at `:326`).
  - `MonsterCombatDialog.hook.test.ts`: default `selectedCard` `'none'`, default `decidedValue` `6`; setters update state; `onAttack` calls `props.onRoll` with the current monster and flags, and does nothing when the view model's monster is absent; `onCancel` calls `props.onClose` only (not `props.onCancel`); `onContinue` calls `props.onClose`.
- tester-b (view and e2e):
  - `CombatDialog.test.tsx`: ported characterization assertions, querying by role/text against the new `CombatDialog` + `CombatDialog.fixtures.ts` fixtures (rolling/attacker, rolling/spectator, results/win, results/draw).
  - `MonsterCombatDialog.test.tsx`: ported characterization assertions against the new component + fixtures (attack/with-cards, attack/no-cards, results/win, results/loss, spectator).
  - e2e: run `npm run test:e2e -- e2e/gameplay.spec.ts` in Phase 3 if the Firestore emulator and Java 21 are available; otherwise report "not run" (do not write a new e2e spec — no new user-visible flow).

## Preview states
- `CombatDialog` (group "Combat"): Rolling — attacker can act, no tactical cards; Rolling — attacker can act, both tactical cards available; Rolling — spectator/defender waiting; Results — attacker wins; Results — draw.
- `MonsterCombatDialog` (group "Combat"): Attack screen — no tactical cards; Attack screen — all three tactical cards available; Results — player wins; Results — monster wins; Spectator — waiting.

## Risks
- Visual drift during the Tailwind-class extraction into `.styles.ts`. Mitigation: the literal strings quoted in Contracts for the conditional/trickiest classes, "copy verbatim" instruction for the rest, and the ui-verify screenshot step before deleting the legacy file.
- `MonsterCombatDialog`'s three-screen split missing a state transition (e.g. the `isAttacker` flag read from the wrong place once screen and `isAttacker` are split into separate fields). Mitigation: the characterization test asserts `onOpenChange`/Cancel behavior independent of which screen renders.
- A map or hook file exceeding 150 lines. Mitigation: split-by-responsibility rule in the File plan; `MonsterCombatDialog.map.ts` is the most likely candidate given three branches.
- Deleting the legacy files before the new ones are fully verified. Mitigation: deletion is the last step of each phase, after the full `jest`/`typecheck`/`lint` run and the ui-verify screenshot.
- `docs/README.md` vs `src/docs/README.md`: only the former is canonical (CLAUDE.md). Mitigation: called out explicitly in Verified context so implementer-b does not edit the stale copy.

## Review (architect-b)
VERDICT: APPROVED

Focused verification per the coordinator's instruction, on the GameDialogManager deviation:
- `eslint.config.mjs:50-53` — `RESTRICTED_IMPORTS.legacyUi` group `['@/features/*', '@/features/**']`, message "Legacy UI and context may only be adapted inside *.hook.ts files."
- `eslint.config.mjs:77-86` — this restriction applies to `MODULE_FILES = 'src/modules/**/*.{ts,tsx}'`, i.e. every file in a module, `.tsx` included.
- `eslint.config.mjs:88-96` — the `*.hook.ts` override re-adds only `firestore` and `deepModuleImport`, silently dropping `legacyUi` — so only `.hook.ts` may import `@/features/*`. Confirmed: no exemption exists for `.tsx`.
- Component-architecture's file-responsibility table (preloaded skill): `.hook.ts` → "Never: Return JSX". Confirmed verbatim.
- Read `src/features/game/components/GameDialogManager.tsx:1-22` directly: it imports 13 legacy dialog components (`PositionDialog`, `ArmySelectionDialog`, `AttackSelectionDialog`, `MonsterSelectionDialog`, `AbilitiesDialog`, `StealResourceDialog`, `SabotageDialog`, `WealthyDialog`, `CardsDialog`, `ProductiveCardDialog`, `SpecialIslandRollDialog`, `ConfirmExitDialog`, `HostLeaveDialog`) from `../dialogs/*` and renders all of them directly in its JSX (`:61-273`), plus calls `useGameBoard()` itself (`:6,35`) rather than through a hook file.
- Conclusion: the "NameView / connected component" split (hook reads context, `.tsx` renders) does not rescue this case, because the blocker isn't only the context read — it's that the `.tsx` view itself would need to import and render 13 untouched `@/features/*` components, which no module `.tsx` may do under any circumstance (there is no hook-file exemption for a `.tsx`). The plan's Decisions bullet (`plan.md` Decisions, 2nd bullet) states this correctly and completely, not just the context-read half of it. The deviation from triage.md's file list is justified by direct evidence, not asserted.

Other checks performed this session (all passed):
- Every "Verified context" row cross-checked against source: `CombatDialog.tsx` (full read, 250 lines), `MonsterCombatDialog.tsx` (full read, 354 lines) — prop shapes, default values, dead code (`Badge` import, `isViewer`, unused `onCancel`), screen-selection order (`renderContent`, results → spectator → attack), `isAttacker` formula, and every cited Tailwind class string in the Contracts section all match the legacy source exactly, including line numbers.
- `src/lib/types/{combat,game,player,monsters,actions}.ts` and `src/lib/player-data.ts`, `src/components/icons.tsx` (`FightIcon:47`) — all cited symbols and shapes exist as described; all are re-exported through the `@/lib/types` barrel used by the legacy files today.
- `docs/README.md:33,40,46,127` — each line number cited matches its claimed content exactly (`src/modules/` bullet, the game-board context paragraph to mirror, the `GameDialogManager.tsx` bullet, the game-board "Definition Files" paragraph).
- `src/testbed/registry.ts`, `src/testbed/testbed.types.ts`, `src/testbed/legacy/SabotageDialog.preview.tsx` — the cited preview-registration pattern exists as described.
- No pre-existing `src/modules/combat/`, no existing previews for either dialog, and `src/features/game/dialogs/__tests__/ResourceDialogs.test.tsx` covers unrelated dialogs — no duplicate-work risk from the planned characterization tests.
- Design: no `NameView` split (hooks only manage local UI state, not context) is correct per the skill's own carve-out; the three-screen split for `MonsterCombatDialog` is forced by the 150-line cap and splits along real responsibility boundaries, not arbitrarily; "no shared `.styles.ts` yet" correctly applies the "third copy" DRY threshold; dropping the four dead-code items is not a behavior change and is required once the files are linted. No simpler structure meets both the lint boundaries and the pixel-identical requirement.

No findings. Tick "plan approved" for both phases in `progress.md`.
