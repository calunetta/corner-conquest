# Plan: Migrate GameBoardHeader and GameStatusBadge to src/modules/hud

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change)

## Goal and acceptance criteria
- [ ] `src/modules/hud/` exists with `GameBoardHeader` and `GameStatusBadge` built per component-architecture (types/map/hook/styles/view split, `NameView`/connected split), each rendering **pixel-identical** output to today's legacy components for the same `useGameBoard()` state.
- [ ] `src/features/game/components/GameBoard.tsx` imports `GameBoardHeader` and `GameStatusBadge` from `@/modules/hud` instead of `./GameBoardHeader` / `./GameStatusBadge`; no other line of `GameBoard.tsx` changes.
- [ ] `src/features/game/components/PlayerInfoBar.tsx` is **not** migrated and **not** edited in this task (see Decisions) — it stays at its current path, importing `PlayerInfo` and `TutorialBeacon` exactly as it does today.
- [ ] `src/features/game/components/GameBoardHeader.tsx` and `GameStatusBadge.tsx` are deleted once the new components are verified; no other file under `src/features/game/components/` changes.
- [ ] Each new component has a testbed preview covering its visual states, screenshot-verified (skill `ui-verify`).
- [ ] `npm run typecheck`, `npm run lint` (zero warnings) and `npm test` pass; `npm run build` passes; `docs/README.md` describes the new `src/modules/hud/` layout, updates the `GameBoardHeader.tsx`/`GameStatusBadge.tsx` bullets, and notes why `PlayerInfoBar.tsx` stays legacy.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameBoardHeader` (current) | `src/features/game/components/GameBoardHeader.tsx:1-50` | Zero props, calls `useGameBoard()` directly (`:9`). Destructures `gameState, isHost, uiState, isMyTurn, turnTimer, handleExitClick, handleStartGame`. Reads `gameState.{status,name,players,settings,currentPlayerIndex}`. `canStartGame = status === 'waiting' && isHost && players.length > 1` (`:11`). Renders the VP-goal badge and turn-timer block only `when status === 'playing'` (`:20,29`); renders the Start Game button only when `canStartGame` (`:42`). |
| `GameStatusBadge` (current) | `src/features/game/components/GameStatusBadge.tsx:1-45` | Zero props, calls `useGameBoard()` directly (`:9`). Destructures `gameState, isMyTurn, turnTimer`. `formattedTime = turnTimer?.formattedTime \|\| '02:00'` and `isExpiring = !!turnTimer?.isExpiring` (`:11-12`) — defensive optional-chaining even though `turnTimer` is a required field on `GameBoardContextType` (see below); preserve this fallback exactly, do not "fix" it. Waiting branch (`status === 'waiting'`) shows a player-count message; otherwise shows `isMyTurn ? 'Your Turn' : "${players[currentPlayerIndex]?.name || 'Player'}'s Turn"` (`:24`) and, only when `isMyTurn`, a `Badge` with the countdown (`:27-40`). |
| `PlayerInfoBar` (current) | `src/features/game/components/PlayerInfoBar.tsx:1-123` | Imports `PlayerInfo` from `@/features/game/panels/PlayerInfo` (`:8`) and `TutorialBeacon` from `./TutorialBeacon` (`:9`) and renders both directly in JSX (`:42-47, 58-64, 86-91, 103-109`). Both stay at legacy paths until `docs/ai/refactor.md` rows #5 and #8 land — **out of scope here**, see Decisions. |
| `GameBoardContextType` | `src/modules/game-board/game-board.types.ts:86-113` | `gameState: GameState`, `isMyTurn: boolean`, `isHost: boolean`, `uiState: GameBoardUIState`, `turnTimer: { timeLeft: number; formattedTime: string; turnDuration: number; isExpiring: boolean; percentage: number }` (`:94-100`, required, not optional), `handleStartGame: () => Promise<void>`, `handleExitClick: () => Promise<void>` (`:109-110`). |
| `GameBoardUIState.isExiting` | `src/modules/game-board/game-board.types.ts:27` | `uiState.isExiting: boolean`, read by `GameBoardHeader.tsx:16` to show a spinner on the exit button. |
| `useGameBoard` | `src/modules/game-board/game-board.provider.tsx:9-15`, re-exported from `src/modules/game-board/index.ts:8` | Already migrated (row #2's dependency, row #1 done). Importable as `@/modules/game-board` from any file — not restricted by `no-restricted-imports` (only `@/features/*` and `@/modules/*/*` deep paths are restricted; `@/modules/game-board` is a module's own public index). By established convention (component-architecture: "a component's hook reads app state (legacy context such as `useGameBoard()`...)" and every prior migration — `CombatDialog`, `game-board`'s own consumers), **calling `useGameBoard()` happens only inside `*.hook.ts`**, not because lint forces it here, but to keep the view pure and match the project's pattern. |
| `GameState` | `src/lib/types/game.ts:29-48` | `status: GameStatus` (`'waiting'\|'playing'\|'finished'`), `name: string`, `players: Player[]`, `settings.victoryPointGoal: number`, `currentPlayerIndex: number`. |
| `Player` | `src/lib/types/player.ts:19-38` | `name: string`. Only field these two components read off a `Player`. |
| Prior preview rejection | `docs/ai/tasks/2026-10-03-sabotage-dialog-preview/triage.md:16` | "an earlier candidate (`GameStatusBadge`) was rejected because it calls `useGameBoard()` directly with no pure view to render, which the `testbed-preview` skill forbids" — confirms the `NameView`/connected split is required here, not optional, for either component to be previewable at all. |
| `GameDialogManager` precedent | `docs/ai/tasks/2026-10-03-migrate-dialog-components/plan.md` Decisions, 1st bullet; `eslint.config.mjs:50-53,77-96` | A module `.tsx` can never import `@/features/*` (no `.hook.ts` exemption applies to a `.tsx`, since a hook must never return JSX). When a component's `.tsx` must directly render an untouched legacy JSX component, the whole component stays at its legacy path until that dependency itself migrates. Same reasoning applies to `PlayerInfoBar` and its two still-legacy children — see Decisions. |
| ESLint module boundaries | `eslint.config.mjs:42-58,73,77-96` | `RESTRICTED_IMPORTS.legacyUi` (`@/features/*`) blocked in every `src/modules/**` file except `*.hook.ts` (`:88-96`); `RESTRICTED_IMPORTS.deepModuleImport` (`@/modules/*/*`) blocked everywhere in modules — cross-module imports go through the public index (`@/modules/game-board`, not `@/modules/game-board/game-board.types`). `max-lines`: 150 counted lines per file (`:73`). |
| Testbed preview pattern | `src/modules/combat/components/CombatDialog/CombatDialog.preview.tsx`, `src/testbed/registry.ts`, `src/testbed/testbed.types.ts:1-18` | `ComponentPreview { slug, title, group, states: { name, render }[] }`. `group: 'HUD'` is the example group name used in `.claude/skills/testbed-preview/SKILL.md`'s worked example — matches this module's domain. |
| `GameBoard.tsx` import site | `src/features/game/components/GameBoard.tsx:11-13,29,34,53` | `import { GameBoardHeader } from './GameBoardHeader'; import { PlayerInfoBar } from './PlayerInfoBar'; import { GameStatusBadge } from './GameStatusBadge';` — only lines 11 and 13 change; line 12 (`PlayerInfoBar`) and the three JSX usages (`:29,34,53`) stay untouched. |
| Call sites elsewhere | grep across `src e2e docs scripts .claude CLAUDE.md` | `GameBoardHeader`/`GameStatusBadge`/`PlayerInfoBar` referenced only by `GameBoard.tsx` plus `docs/README.md:43-45,129`, `src/docs/README.md:36-38,123` (stale duplicate, not canonical per CLAUDE.md — do not edit), `docs/ai/refactor.md:36`, `docs/gameplay-ideas.md:186` (future-ideas doc, mentions `GameBoardHeader.tsx` only as a hypothetical future touch point — not a code reference, leave as is), `.claude/skills/ui-design/SKILL.md:13` (cites `GameStatusBadge.tsx` only as a visual-style example filename, not an import — leave as is), and this task's own `triage.md`/sibling tasks' `triage.md` files (`game-panels-migration`, `game-map-migration`) which reference row #7 only as "out of scope for that row" — nothing to update there. No e2e or test file imports these three directly. |
| `docs/README.md` sections to update | `:33` (`src/modules/` bullet), `:43-45` (component bullets), `:129` (Zero Prop-Drilling bullet) | See File plan. |

## Decisions
- **Domain name `hud`**, matching the example domain list in component-architecture (`hud, combat, cards, lobby, map`) and the `group: 'HUD'` example already used by `.claude/skills/testbed-preview/SKILL.md`.
- **`PlayerInfoBar.tsx` is NOT migrated in this task and is not edited at all.** Its `.tsx` directly renders `PlayerInfo` (`@/features/game/panels/PlayerInfo`, row #5, pending) and `TutorialBeacon` (`./TutorialBeacon`, row #8, pending) as JSX children. A `src/modules/**` `.tsx` can never import `@/features/*` — the only exemption is `*.hook.ts`, and a hook must never return JSX (component-architecture file-responsibility table) — so there is no lint-legal way to move a component that renders two untouched legacy JSX components into `src/modules`, identical to the `GameDialogManager.tsx` precedent (`docs/ai/tasks/2026-10-03-migrate-dialog-components/plan.md` Decisions, confirmed by architect-b's final review in that same file). Splitting `PlayerInfoBar`'s own state (`isPlayerInfoOpen`, `sortedPlayers`) into a `.hook.ts` would not help: the `.tsx` still has to import and render `PlayerInfo`/`TutorialBeacon` directly. This row only had to decide this, not implement around it (triage.md's open question) — the decision is to leave `PlayerInfoBar.tsx` exactly as it is; it becomes migratable once rows #5 and #8 land. `GameBoard.tsx:12` (its import) is correspondingly left unchanged.
- **Both `GameBoardHeader` and `GameStatusBadge` get a `NameView`/connected split.** Both hooks read `useGameBoard()` (app state via context) — component-architecture: "When a component's hook reads app state..., the `.tsx` exports two components: `NameView(props)` ... `Name()`: one line." This is also required for either component to have a working testbed preview at all (see Verified context — the prior rejection of `GameStatusBadge` as a preview candidate for exactly this reason).
- **Each component keeps its own `.styles.ts`**, no sharing between the two. kiss-dry-solid: "extract when the copies must change together, or at the third copy" — two components, no literal duplicate classes between them (the countdown-timer treatment differs in markup: `GameBoardHeader` colors a `Timer` icon and a `<span>`, `GameStatusBadge` colors a `Badge` and a `Timer` icon inside it).
- **Preserve `GameStatusBadge`'s defensive `turnTimer?.formattedTime || '02:00'` / `!!turnTimer?.isExpiring` exactly**, even though `GameBoardContextType.turnTimer` is a required (non-optional) field today. This is not dead code in the same sense as the `CombatDialog` precedent's unused imports/variables — it changes behavior if `formattedTime` is ever an empty string, and dropping it would be an unreviewed behavior change outside this task's scope (triage Scope: "no change to the data/state read"). The map function keeps the `|| '02:00'` fallback; the `?.` becomes unnecessary once the parameter is typed as the required `GameBoardContextType['turnTimer']` object (TypeScript strict mode will flag an unused optional-chain on a non-nullable type only as a lint hint, not an error — if `tsc`/`eslint` complain, drop only the `?.` operator itself, keeping the `||` fallback, and note it as a no-op removal in the report).
- **No shared type for `turnTimer`'s shape beyond indexing it off `GameBoardContextType`.** `GameBoardContextType['turnTimer']` is not worth promoting to a named exported type in `game-board.types.ts` for two consumers — kiss-dry-solid, no speculative extraction. Each component's `.types.ts` does `type TurnTimer = GameBoardContextType['turnTimer'];` locally.
- **Characterization tests first**, one per component, written against the CURRENT legacy file, before any extraction (component-architecture "Migrating a legacy component", step 1), then adapted into each component's `.test.tsx` against the new implementation, then deleted together with the legacy source file.
- Rejected: moving `PlayerInfoBar`'s internal logic to a `.hook.ts` while leaving the `.tsx` in `src/features/` unmigrated and half-wired to a module hook — unnecessary indirection for a component that isn't moving this task (kiss-dry-solid: no speculative layers).
- Rejected: a `.service.ts` for either component — no Firestore or other I/O; both are pure render + context read.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/components/__tests__/GameBoardHeader.characterization.test.tsx` | new (deleted end of phase) | Captures today's `GameBoardHeader` behavior before extraction. | tester-a |
| `src/modules/hud/index.ts` | new | Module public API: exports `GameBoardHeader` and `GameStatusBadge`. | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts` | new | `GameBoardHeaderViewModel`, `GameBoardHeaderViewProps`. | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts` | new | Pure `toGameBoardHeaderViewModel`. | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts` | new | `useGameBoardHeader`: reads `useGameBoard()`, builds the view model + handlers. | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.fixtures.ts` | new | Deterministic `GameState`/turnTimer fixtures for tests + preview. | implementer-a |
| `src/modules/hud/components/GameBoardHeader/index.ts` | new | Component public API (`GameBoardHeader`, `GameBoardHeaderView`). | implementer-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx` | new | `GameBoardHeaderView` (pure) + `GameBoardHeader` (connected). | implementer-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.test.ts` | new | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.test.ts` | new | tester-a |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.test.tsx` | new | Adapted characterization cases against `GameBoardHeaderView`. | tester-b |
| `src/modules/hud/components/GameBoardHeader/GameBoardHeader.preview.tsx` | new | preview-a |
| `src/features/game/components/__tests__/GameStatusBadge.characterization.test.tsx` | new (deleted end of phase) | Captures today's `GameStatusBadge` behavior before extraction. | tester-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.types.ts` | new | `GameStatusBadgeViewModel`. | implementer-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.map.ts` | new | Pure `toGameStatusBadgeViewModel`. | implementer-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.hook.ts` | new | `useGameStatusBadge`: reads `useGameBoard()`, returns the view model. | implementer-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.fixtures.ts` | new | Deterministic fixtures for tests + preview. | implementer-a |
| `src/modules/hud/components/GameStatusBadge/index.ts` | new | Component public API (`GameStatusBadge`, `GameStatusBadgeView`). | implementer-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.styles.ts` | new | Every Tailwind class, copied from the legacy file. | implementer-b |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx` | new | `GameStatusBadgeView` (pure) + `GameStatusBadge` (connected). | implementer-b |
| `src/features/game/components/GameBoard.tsx` | edit | Swap the `GameBoardHeader`/`GameStatusBadge` imports to `@/modules/hud` (lines 11, 13 only). | implementer-b |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.map.test.ts` | new | tester-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.hook.test.ts` | new | tester-a |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.test.tsx` | new | Adapted characterization cases against `GameStatusBadgeView`. | tester-b |
| `src/modules/hud/components/GameStatusBadge/GameStatusBadge.preview.tsx` | new | preview-b |
| `src/testbed/registry.ts` | edit | Register `gameBoardHeaderPreview` and `gameStatusBadgePreview`. | preview-a (`gameBoardHeaderPreview`), preview-b (`gameStatusBadgePreview`) |
| `src/features/game/components/GameBoardHeader.tsx`, `src/features/game/components/GameStatusBadge.tsx`, both `__tests__/*.characterization.test.tsx` | deleted | Once the new versions are verified. | implementer-b |
| `docs/README.md` | edit | `:33` add a `src/modules/hud/` clause; `:43-45` update the `GameBoardHeader.tsx`/`GameStatusBadge.tsx` bullets to point at the new module and add a sentence to the `PlayerInfoBar.tsx` bullet explaining it stays legacy pending rows #5/#8 (mirroring the existing `GameDialogManager.tsx` bullet's wording at `:46`); `:129` update the Zero Prop-Drilling bullet if its wording no longer matches (the components still "consume `useGameBoard()` directly" via their own `.hook.ts`, so this may need no change — confirm before editing). | implementer-b |

If any file exceeds 150 counted lines, the owner splits it by responsibility (not arbitrarily) and reports the added file. Do not trim comments or compress code to fit.

## Contracts
```ts
// ======================================================================
// src/modules/hud/index.ts
// ======================================================================
export { GameBoardHeader } from './components/GameBoardHeader';
export { GameStatusBadge } from './components/GameStatusBadge';

// ======================================================================
// src/modules/hud/components/GameBoardHeader/GameBoardHeader.types.ts
// ======================================================================
import type { GameBoardContextType } from '@/modules/game-board';

export type TurnTimer = GameBoardContextType['turnTimer'];

export interface GameBoardHeaderViewModel {
  gameName: string;
  isPlaying: boolean;            // gameState.status === 'playing'
  victoryPointGoal: number;      // gameState.settings.victoryPointGoal
  canStartGame: boolean;         // status === 'waiting' && isHost && players.length > 1
  turnPlayerName: string | undefined; // players[currentPlayerIndex]?.name
  isMyTurn: boolean;
  turnTimer: { formattedTime: string; isExpiring: boolean };
}

export interface GameBoardHeaderViewProps extends GameBoardHeaderViewModel {
  isExiting: boolean;            // uiState.isExiting
  onExitClick: () => Promise<void>;   // passthrough of handleExitClick
  onStartGame: () => Promise<void>;   // passthrough of handleStartGame
}

// ======================================================================
// src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts
// ======================================================================
// Pure. Mirrors GameBoardHeader.tsx:10-11,19-39 (legacy) exactly.
import type { GameState } from '@/lib/types';
import type { GameBoardHeaderViewModel, TurnTimer } from './GameBoardHeader.types';

export function toGameBoardHeaderViewModel(
  gameState: GameState,
  isHost: boolean,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
): GameBoardHeaderViewModel;

// ======================================================================
// src/modules/hud/components/GameBoardHeader/GameBoardHeader.hook.ts
// ======================================================================
// Imports useGameBoard from '@/modules/game-board'. Only file in this component
// allowed to read app state.
import type { GameBoardHeaderViewProps } from './GameBoardHeader.types';

export function useGameBoardHeader(): GameBoardHeaderViewProps;
// Implementation: const { gameState, isHost, isMyTurn, uiState, turnTimer, handleExitClick,
// handleStartGame } = useGameBoard();
// return { ...toGameBoardHeaderViewModel(gameState, isHost, isMyTurn, turnTimer),
//           isExiting: uiState.isExiting, onExitClick: handleExitClick, onStartGame: handleStartGame };

// ======================================================================
// src/modules/hud/components/GameBoardHeader/GameBoardHeader.tsx
// ======================================================================
// 'use client'.
export function GameBoardHeaderView(props: GameBoardHeaderViewProps): JSX.Element;
export function GameBoardHeader(): JSX.Element; // return <GameBoardHeaderView {...useGameBoardHeader()} />;

// ---- GameBoardHeader.styles.ts: required literal classes (copy verbatim; this is not an
// exhaustive list of every className in the legacy file — copy the rest from the cited lines) ----
// Root, GameBoardHeader.tsx:14 (legacy): 'flex flex-wrap items-center justify-between gap-2'
// Left group, :15: 'flex items-center gap-2 sm:gap-4'
// Title, :19: 'text-xl font-bold sm:text-2xl truncate max-w-[200px] sm:max-w-md'
// VP goal badge, :21: 'flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold border border-white/5'
// Right group, :28: 'flex items-center gap-2'
// Turn indicator wrapper, :30: 'flex items-center gap-1.5 rounded-md bg-black/40 border border-white/10 px-2.5 py-1 text-xs font-semibold'
// Turn-timer icon, :31 (legacy) — a function of isExpiring, e.g. styles.turnTimerIcon({ isExpiring }):
//   base: 'h-3.5 w-3.5'; isExpiring adds 'text-destructive animate-pulse'; !isExpiring adds 'text-primary'
// "Turn:" label, :32: 'text-muted-foreground hidden sm:inline'
// Player name, :33: 'font-bold text-foreground'
// Countdown span, :35 (legacy) — a function of isExpiring, e.g. styles.countdown({ isExpiring }):
//   base: 'font-mono font-bold'; isExpiring: 'text-destructive'; !isExpiring: 'text-primary'
// Start Game button, :43: 'font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black'

// ======================================================================
// src/modules/hud/components/GameStatusBadge/GameStatusBadge.types.ts
// ======================================================================
export interface GameStatusBadgeViewModel {
  isWaiting: boolean;     // gameState.status === 'waiting'
  playerCount: number;    // gameState.players.length
  maxPlayers: number;     // gameState.maxPlayers
  turnLabel: string;      // isMyTurn ? 'Your Turn' : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`
  isMyTurn: boolean;
  formattedTime: string;  // turnTimer.formattedTime || '02:00'
  isExpiring: boolean;    // !!turnTimer.isExpiring
}

// ======================================================================
// src/modules/hud/components/GameStatusBadge/GameStatusBadge.map.ts
// ======================================================================
// Pure. Mirrors GameStatusBadge.tsx:10-12,16-24 (legacy) exactly, including the
// `|| '02:00'` / `!!` fallbacks (see Decisions — do not drop them).
import type { GameState } from '@/lib/types';
import type { GameStatusBadgeViewModel } from './GameStatusBadge.types';
import type { TurnTimer } from '../GameBoardHeader/GameBoardHeader.types'; // reuse the indexed type; do not redefine it

export function toGameStatusBadgeViewModel(
  gameState: GameState,
  isMyTurn: boolean,
  turnTimer: TurnTimer,
): GameStatusBadgeViewModel;
// Note: `TurnTimer` is imported from the sibling GameBoardHeader component's .types.ts (same
// module, a relative import between two component folders of the same module is allowed by
// the import-boundary rule — only *cross-module* imports must go through a public index).
// If this cross-component relative import is rejected on review as coupling the two
// components unnecessarily, the fallback is to redeclare
// `type TurnTimer = GameBoardContextType['turnTimer'];` locally in GameStatusBadge.types.ts
// from '@/modules/game-board' instead — implementer-a's call, report which was used.

// ======================================================================
// src/modules/hud/components/GameStatusBadge/GameStatusBadge.hook.ts
// ======================================================================
export function useGameStatusBadge(): GameStatusBadgeViewModel;
// Implementation: const { gameState, isMyTurn, turnTimer } = useGameBoard();
// return toGameStatusBadgeViewModel(gameState, isMyTurn, turnTimer);

// ======================================================================
// src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx
// ======================================================================
// 'use client'.
export function GameStatusBadgeView(props: GameStatusBadgeViewModel): JSX.Element;
export function GameStatusBadge(): JSX.Element; // return <GameStatusBadgeView {...useGameStatusBadge()} />;

// ---- GameStatusBadge.styles.ts: required literal classes (copy verbatim; copy the rest
// from the cited lines) ----
// Root, GameStatusBadge.tsx:15 (legacy): 'pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-black/70 p-2 sm:px-3 sm:py-2 text-center shadow-xl backdrop-blur-md border border-white/10 select-none'
// Waiting wrapper, :17: 'flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400'
// Hourglass icon, :18: 'h-4 w-4 animate-spin [animation-duration:8s]'
// Playing wrapper, :22: 'flex items-center gap-2'
// Turn text, :23: 'text-xs sm:text-sm font-bold text-foreground'
// Countdown Badge, :31-35 (legacy) — a function of isExpiring, e.g. styles.countdownBadge({ isExpiring }):
//   base: 'text-xs font-mono font-bold flex items-center gap-1 transition-colors'
//   isExpiring: 'bg-destructive/20 border-destructive text-destructive animate-pulse'
//   !isExpiring: 'bg-primary/20 border-primary/40 text-primary'
// Countdown Timer icon, :37 (legacy) — a function of isExpiring, e.g. styles.countdownIcon({ isExpiring }):
//   base: 'h-3 w-3'; isExpiring adds 'animate-spin'

// ======================================================================
// src/features/game/components/GameBoard.tsx — the only edit (two import lines)
// ======================================================================
// Replace:
//   import { GameBoardHeader } from './GameBoardHeader';
//   import { GameStatusBadge } from './GameStatusBadge';
// With:
//   import { GameBoardHeader, GameStatusBadge } from '@/modules/hud';
// Line 12 (`import { PlayerInfoBar } from './PlayerInfoBar';`) and all JSX usages
// (:29, :34, :53) stay byte-identical.
```

## Phases
### Phase 1: GameBoardHeader and GameStatusBadge
1. (tester-a) Write `GameBoardHeader.characterization.test.tsx` and `GameStatusBadge.characterization.test.tsx` against the CURRENT legacy files; run both, must pass unmodified. Cases per Test plan.
2. (implementer-a) `GameBoardHeader.types.ts`, `GameBoardHeader.map.ts`, `GameStatusBadge.types.ts`, `GameStatusBadge.map.ts`.
3. (tester-a) `GameBoardHeader.map.test.ts`, `GameStatusBadge.map.test.ts`; run both.
4. (implementer-a) `GameBoardHeader.hook.ts`, `GameBoardHeader.fixtures.ts`, `GameStatusBadge.hook.ts`, `GameStatusBadge.fixtures.ts`, both component `index.ts`, `src/modules/hud/index.ts`.
5. (tester-a) `GameBoardHeader.hook.test.ts`, `GameStatusBadge.hook.test.ts`; run both.
6. (implementer-b) `GameBoardHeader.styles.ts`, `GameBoardHeader.tsx`, `GameStatusBadge.styles.ts`, `GameStatusBadge.tsx`.
7. (tester-b) `GameBoardHeader.test.tsx`, `GameStatusBadge.test.tsx`, adapting the characterization cases to import the new `*View` components; run both against the new components.
8. (preview-a) `GameBoardHeader.preview.tsx`; register `gameBoardHeaderPreview` in `src/testbed/registry.ts`.
9. (preview-b) `GameStatusBadge.preview.tsx`; register `gameStatusBadgePreview` in `src/testbed/registry.ts`.
10. (implementer-b) Swap both imports in `GameBoard.tsx` to `@/modules/hud` (one edit, both components).
11. Run `npx jest src/modules/hud src/features/game/components`; all green.
12. ui-verify: screenshot both new preview pages' states (skill `ui-verify`, `node .claude/skills/ui-verify/scripts/snapshot.mjs`), desktop and mobile size.
13. (implementer-b) Delete `src/features/game/components/GameBoardHeader.tsx`, `GameStatusBadge.tsx`, and both characterization test files.
14. (implementer-b) Update `docs/README.md` per the File plan.
15. `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build`.
16. `grep -rn "'./GameBoardHeader'\|'./GameStatusBadge'" src` returns nothing; `grep -rn "@/modules/hud" src` shows exactly `GameBoard.tsx`.
17. architect-b final review; coordinator commits: `refactor(hud): migrate GameBoardHeader and GameStatusBadge to src/modules [phase 1/1]`.

Model escalation: none (both components are small, zero-prop, read context through a single hook call — same structural risk level as Phase 1 of the `CombatDialog` precedent, which needed no escalation).

## Test plan
- tester-a (logic, first):
  - **Characterization (`GameBoardHeader.characterization.test.tsx`, against the legacy file first, then ported)**: `status === 'waiting'` + `isHost` + 2 players shows the Start Game button; `status === 'waiting'` + `isHost` + 1 player does not; `status === 'waiting'` + not host does not; clicking Start Game calls `handleStartGame`; `status === 'playing'` shows the VP-goal badge with the correct number and the turn-timer block with the current player's name; `status === 'waiting'` shows neither; the countdown `(mm:ss)` span only renders when `isMyTurn`; the Timer icon and countdown span turn `text-destructive`/pulse only when `turnTimer.isExpiring`; clicking the exit button calls `handleExitClick`; the exit button shows a spinner and is disabled when `uiState.isExiting`, otherwise an arrow icon and is enabled.
  - `GameBoardHeader.map.test.ts`: `toGameBoardHeaderViewModel` — `canStartGame` true only when `status === 'waiting' && isHost && players.length > 1`, false for each of the three conditions failing individually; `isPlaying` matches `status === 'playing'`; `turnPlayerName` is `undefined` when `currentPlayerIndex` is out of range, otherwise the matching player's `name`; `turnTimer.formattedTime`/`isExpiring` pass through unchanged.
  - `GameBoardHeader.hook.test.ts`: mocks `useGameBoard` (e.g. `jest.mock('@/modules/game-board')`); asserts the returned `GameBoardHeaderViewProps` matches `toGameBoardHeaderViewModel(...)` plus `isExiting` from `uiState.isExiting` and `onExitClick`/`onStartGame` being referentially `handleExitClick`/`handleStartGame`.
  - **Characterization (`GameStatusBadge.characterization.test.tsx`)**: `status === 'waiting'` shows "Waiting for players (n/max)" with the correct counts, no turn text; `status === 'playing'` + `isMyTurn` shows "Your Turn" and the countdown `Badge`; `status === 'playing'` + not `isMyTurn` shows "`<name>`'s Turn" (and "Player's Turn" when the current player is missing) and no `Badge`; the `Badge` and its inner `Timer` icon get the destructive/pulse treatment only when `turnTimer.isExpiring`; `formattedTime` falls back to `'02:00'` when `turnTimer.formattedTime` is falsy.
  - `GameStatusBadge.map.test.ts`: `toGameStatusBadgeViewModel` — `isWaiting` matches `status === 'waiting'`; `turnLabel` for `isMyTurn` true/false (including the missing-player fallback to `'Player'`); `formattedTime` falls back to `'02:00'` on empty string and on `undefined`; `isExpiring` coerces falsy/truthy `turnTimer.isExpiring` to boolean.
  - `GameStatusBadge.hook.test.ts`: mocks `useGameBoard`; asserts the returned view model equals `toGameStatusBadgeViewModel(gameState, isMyTurn, turnTimer)` for the mocked context value.
- tester-b (view and e2e):
  - `GameBoardHeader.test.tsx`: ported characterization assertions, querying by role/text against `GameBoardHeaderView` + `GameBoardHeader.fixtures.ts` (waiting/can-start, waiting/cannot-start, playing/my-turn-expiring, playing/opponent-turn).
  - `GameStatusBadge.test.tsx`: ported characterization assertions against `GameStatusBadgeView` + fixtures (waiting, my-turn-not-expiring, my-turn-expiring, opponent-turn).
  - e2e: no new user-visible flow; not run as part of this task (no gameplay change). If the Firestore emulator and Java 21 happen to be available when Phase 1 checks run, optionally run `npm run test:e2e -- e2e/gameplay.spec.ts` as an extra signal and report its result; otherwise report "not run".

## Preview states
- `GameBoardHeader` (group "HUD"): Waiting — host, can start (2+ players); Waiting — host, cannot start (1 player); Waiting — not host; Playing — opponent's turn, timer not expiring; Playing — my turn, timer expiring; Exiting (spinner on exit button).
- `GameStatusBadge` (group "HUD"): Waiting (e.g. 2/4 players); Playing — my turn, timer not expiring; Playing — my turn, timer expiring; Playing — opponent's turn.

## Risks
- Visual drift during the Tailwind-class extraction into `.styles.ts`, especially the four conditional (isExpiring-driven) class functions shared in spirit between the two components but kept separate. Mitigation: literal strings quoted in Contracts, "copy verbatim" instruction for the rest, ui-verify screenshot step before deleting the legacy files.
- The `TurnTimer` type being imported across the two sibling component folders (`GameStatusBadge.map.ts` importing from `../GameBoardHeader/GameBoardHeader.types`) could be read as import-boundary-adjacent even though same-module relative imports are allowed. Mitigation: Contracts calls this out explicitly with a same-module justification and a named fallback (redeclare locally) if architect-b or implementer-a judges it adds unwanted coupling.
- Dropping the no-op `?.` on `turnTimer?.formattedTime`/`turnTimer?.isExpiring` once the parameter type is non-nullable could be mistaken for also dropping the `|| '02:00'` / `!!` fallback. Mitigation: Decisions and the map.ts contract both state explicitly that only the optional-chain operator is a no-op; the fallback behavior must stay.
- Deleting the legacy files before the new ones are fully verified. Mitigation: deletion is the last implementation step, after the full `jest`/`typecheck`/`lint` run and the ui-verify screenshot.
- `docs/README.md` vs `src/docs/README.md`: only the former is canonical (CLAUDE.md). Mitigation: called out explicitly in Verified context so implementer-b does not edit the stale copy.

## Review (architect-b)
VERDICT: APPROVED

Verified independently:
- Legacy sources match the plan's line-by-line citations exactly: `src/features/game/components/GameBoardHeader.tsx:1-50`, `GameStatusBadge.tsx:1-45`, `PlayerInfoBar.tsx:1-123`.
- Re-ran the grep across `src e2e docs scripts .claude CLAUDE.md`; every hit (`GameBoard.tsx:11-13,29,34,53`, `docs/README.md:43-45,129`, `src/docs/README.md:36-38,123` stale duplicate, `docs/ai/refactor.md:36`, `docs/gameplay-ideas.md:186`, `.claude/skills/ui-design/SKILL.md:13`, sibling tasks' `triage.md`/`plan.md` files) is accounted for in the plan's "Call sites elsewhere" row as either the one edit (`GameBoard.tsx`) or explicitly left alone with a reason. No invented paths.
- `GameBoardContextType` and `useGameBoard` are both re-exported from `src/modules/game-board/index.ts:3-8`, so the contracts' `import type { GameBoardContextType } from '@/modules/game-board'` and the hooks' `useGameBoard()` import are both legal public-index imports, not deep imports.
- `eslint.config.mjs:42-58,73,77-96` confirms `RESTRICTED_IMPORTS.deepModuleImport` (`@/modules/*/*`) and `.legacyUi` (`@/features/*`) exactly as cited, and that `deepModuleImport` also applies inside `*.hook.ts` (the second `files` block at `:88-96` includes it) — correctly not relied on for cross-module alias imports anywhere in this plan.
- `GameState.maxPlayers` exists (`src/lib/types/game.ts:33`), supporting `GameStatusBadgeViewModel.maxPlayers` even though the Verified-context `GameState` row omits it — trivial, folded in below rather than a blocker.
- Testbed preview pattern (`ComponentPreview`/`PreviewState` in `src/testbed/testbed.types.ts`, `registry.ts`'s array-of-imports shape) matches what the File plan and Contracts assume.
- The `PlayerInfoBar`-stays-legacy decision is sound and consistent with the `GameDialogManager` precedent: its `.tsx` renders two still-legacy JSX children (`PlayerInfo`, `TutorialBeacon`) and a module `.tsx` can never import `@/features/*`. No simpler option exists until rows #5/#8 land.
- The `NameView`/connected split for both components is correctly required, not optional — it's the only way either becomes previewable (consistent with the `GameStatusBadge` preview rejection recorded in `docs/ai/tasks/2026-10-03-sabotage-dialog-preview/triage.md:16`), and matches the component-architecture rule for hooks reading app state.
- Preserving `GameStatusBadge`'s `?.`/`|| '02:00'`/`!!` fallbacks exactly is correct scope discipline — the type going non-nullable in context doesn't license dropping behavior-preserving defensive code in a zero-behavior-change refactor.

Minor, non-blocking (fold in while implementing, no replan needed):
- Verified-context's `GameState` row (plan.md:23) lists `status, name, players, settings.victoryPointGoal, currentPlayerIndex` but omits `maxPlayers`, which `GameStatusBadgeViewModel.maxPlayers` depends on (`src/lib/types/game.ts:33`). Not wrong, just incomplete — implementer-a should read `maxPlayers` off `GameState` as shown in the Contracts/legacy code regardless.

Design is appropriately sized for a small, symmetric two-component migration: phases are fine-grained (types/map → tests → hook → tests → view → tests → preview → wiring → cleanup), contracts are complete enough for implementer-a/b to work in parallel without guessing, and no simpler structure is available given the established component-architecture and import-boundary precedents from prior rows.
