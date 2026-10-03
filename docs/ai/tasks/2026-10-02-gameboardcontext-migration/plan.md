# Plan: GameBoardContext migration, Phase 3 (extract the provider's effects and handlers)

Status: APPROVED
Inputs: triage.md (no game-design.md or ui-design.md: pure refactor, no behavior or UI change)

## Goal and acceptance criteria
- [ ] New characterization tests (Phase 3a) pass against the CURRENT, unmodified `GameBoardContext.tsx` before any extraction starts.
- [ ] `src/features/game/context/GameBoardContext.tsx` contains only re-exports; it keeps exporting `GameBoardProvider`, `useGameBoard`, `gameBoardReducer` and the types `GameBoardUIState`, `GameBoardUIAction`, `GameBoardContextType`, `GameBoardProviderProps`.
- [ ] No consumer file changes. `git diff --stat` touches no file under `src/features/` other than `GameBoardContext.tsx`.
- [ ] `GameBoardContext.characterization.test.tsx` and `GameBoardContext.test.ts` are byte-identical to today (`git diff` empty) and pass; the new Phase 3a test file also passes unmodified after extraction.
- [ ] Every new file under `src/modules/game-board/` passes `npm run lint` with zero warnings (150-line cap, no `any`, `consistent-type-imports`, `react-hooks/exhaustive-deps`).
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass; `docs/README.md` §2 and §3.3 describe the new layout.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| Provider, context, `useGameBoard` | `src/features/game/context/GameBoardContext.tsx:34-524` (473 lines) | The code being split. Line numbers below refer to this file as it is today. |
| `gameBoardReducer`, `initialUIState`, types | `src/modules/game-board/index.ts:1-8`; `game-board.reducer.ts` (139 lines), `game-board.types.ts` (126 lines) | Already extracted (Phase 2). The hooks import from `./game-board.reducer` and `./game-board.types` (relative, inside the module). |
| `GameBoardContextType`, `GameBoardProviderProps` | `src/modules/game-board/game-board.types.ts:76-125` | The provider's public shape. Must not change. |
| State block | `GameBoardContext.tsx:58-98` | `useToast`, `useReducer`, `localGameState`, `gameStateForDisplay`, `localPlayer`, sync effect, `selectedArmy`, `RESET_TURN_UI` effect, possible-moves effect. |
| `onAction` | `:100-151` | Deps `[uiState.isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState]`. |
| `handleLocalAction` | `:153-305` | Deps `[localGameState, onAction, uiState.pendingAction, toast, isMyTurn, gameStateForDisplay, localPlayer]`. Cases: DeselectArmy, CancelAction, ShowCards, CloseCards, OpenAbilitiesShop, CloseAbilitiesShop, Attack, Position, UseCard, default `console.warn`. |
| Escape effect | `:307-326` | Deps `[uiState.selectedArmyId, uiState.pendingAction, handleLocalAction, localPlayer]`. |
| `hasActiveDialogOrPendingAction` | `:328-342` | `useMemo` on `[uiState]`; reads only `uiState.pendingAction` and `uiState.dialogs.*`. |
| Auto end-turn effect | `:344-361` | 700 ms `setTimeout` to `onAction(EndTurn)` plus toast. Deps `[isMyTurn, gameStateForDisplay, localPlayer, hasActiveDialogOrPendingAction, onAction, toast]`. |
| `handleTileClick` | `:363-434` | Deps `[gameStateForDisplay, isMyTurn, uiState.isPerformingAction, uiState.pendingAction, uiState.possibleMoves, uiState.selectedArmyId, localPlayer, selectedArmy, onAction, toast]`. |
| `handleStartGame`, `handleConfirmExit`, `handleConfirmHostLeave`, `handleExitClick` | `:436-482` | Session handlers. `handleExitClick` calls `handleConfirmExit`. |
| `useTurnTimer` | `src/features/game/hooks/useTurnTimer.ts:13`, called at `GameBoardContext.tsx:484-488` | Legacy hook; stores `onAction` in a ref. Importable from a `.hook.ts` only (eslint.config.mjs forbids `@/features/*` in other module files). |
| `useToast` | `@/hooks/use-toast` (imported `GameBoardContext.tsx:21`) | `src/hooks` is not restricted for modules. |
| ESLint module rules | `eslint.config.mjs` (`max-lines` 150 skipping blanks and comments; `no-explicit-any` error; `src/modules/**/*.hook.ts` may import `@/features/*`; `no-console` warns except `warn`/`error`) | Forces splitting and typing the payloads. `src/features/**` is in `LEGACY_PATHS`, so `GameBoardContext.tsx` itself is not linted. |
| Existing tests | `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx` (10 tests with the reducer file), `GameBoardContext.test.ts` | Import from `'../GameBoardContext'`. Mocks: `@/hooks/use-toast` (returns a NEW `jest.fn()` every render), `@/lib/actions` (`handleGameAction` echoes `{ state: gameState }`, `handlePlayerExit`), `@/lib/game-initializer`, `@/lib/actions/movement`. |
| Jest config | `jest.config.js` (jsdom, `@/` alias, no `testMatch` override, so default `*.test.ts(x)`) | A helper file not named `*.test.*` is not run as a suite. |
| `hasPlayerRemainingActions` | `src/lib/turn-progression.ts:15` | Real implementation runs in the current tests; it returns true when a dialog or pending action is active (`:21`). New tests mock it. |
| Tile / occupants types | `src/lib/types/map.ts:32-34` | `occupants: { playerId: number; armyId: number }[]` (playerId is the numeric `Player.id`), `monsters?: Monster[]`, `positionedBy?: { playerId: number; resource: ResourceType }[]`. |
| `GameAction` local actions | `src/lib/types/actions.ts:31-39` | `local_DeselectArmy` ... `local_Attack`. |

Verified by architect-b: `Monster = { name: MonsterName; level: number; sprite: { idle; attack; death } }` (`src/lib/types/monsters.ts`); `MonsterName` is `'Lancer' | 'Bear' | 'Ogre' | 'Minotaur'`. Lobby status literal is `'waiting'` (`GameStatus.Waiting`, `src/lib/types/game.ts:6-10`). `PendingAction` (`src/lib/types/dialogs.ts`) is a union of `teleport`, `scout` (with `count`, `scoutedTiles`) and `extra-move` only: `sabotage`, `wealthy` and `steal-resource` are NOT members, which is why the original used `as any`.

## Decisions
- Split into small hooks, one responsibility each, because a single `.hook.ts` would be about 400 lines and lint caps files at 150. Each hook receives only what it reads (narrow params) and keeps the ORIGINAL dependency array, adding only values that were formerly closed-over locals and are now params (state setters like `setLocalGameState`, `dispatch`). Stable setters added to deps cannot change behavior.
- `useGameBoardProvider(props)` in `game-board.hook.ts` composes the sub-hooks in the SAME call order as today (hook order matters for React). The provider `.tsx` is then `const value = useGameBoardProvider(props); return <Context.Provider value={value}>...`.
- `hasActiveDialogOrPendingAction` becomes a pure function in `game-board.map.ts` (called in the hook each render; the value is a boolean, so the effect deps behave identically to the old `useMemo`). Rejected: keeping `useMemo([uiState])` (a pointless indirection once the function is pure).
- Context object, `createContext`, `useGameBoard` move to `game-board.provider.tsx` (the module's view-level file). Rejected: leaving the context in the legacy file (the legacy file must become pure re-exports so the module owns everything).
- No `NameView` split: the provider has no UI. Not applicable.
- Payloads stay `any` where the public types already say `any` (`onAction`, `onLocalAction`, `setGameState`), because tightening them changes public types (out of scope). Inside the new hook files do not write `any`: use `unknown`/narrow types where the code reads fields, otherwise reference the public type via `GameBoardContextType['onAction']` and `Parameters<...>`. Where the original body reads `payload.army` / `payload.cardName` (`:182`, `:195`, `:231`, `:248`), declare small local payload interfaces (see Contracts) and cast once at the top of each case (`payload as AttackPayload`). `cancelPayload: any` (`:162`) becomes `{ cardName?: CardName; scoutedTiles?: string[] }`. The `as any` pending-action cast (`:283`) becomes a cast of the WHOLE object: `{ type: cardName.toLowerCase().replace(/ /g, '-'), cardName, ...(scout extras) } as PendingAction`. architect-b ran `tsc` on both variants: `as NonNullable<PendingAction>['type']` on the `type` field only FAILS (TS2322, the spread yields optional `count`), the whole-object `as PendingAction` passes. Add a comment: Sabotage, Wealthy and Steal Resource are runtime pending types that the `PendingAction` union does not list (pre-existing gap, out of scope). `catch (error: any)` (`:295`) becomes `catch (error)` with `const message = error instanceof Error ? error.message : String(error)`; every error thrown in the try block is an `Error`, and the `handleGameAction` mock does not throw, so behavior is unchanged.
- Do not rename or reorder behavior: early returns, `break` inside `try` (Teleport), the `stateToUpdate` (pre-handler state) passed to `setGameState` in the real-time branch (`:142`), the odd `localGameState` re-check at `:194`, all stay exactly as written. This is a move, not a cleanup.
- Identity rule: `useLocalActions` must depend on the individual callbacks, not on a fresh object. `useCardActions` returns `{ handleCancelAction, handleUseCard }`; `useLocalActions` takes them as two separate args. A fresh `cardActions` object in the `handleLocalAction` deps would change its identity every render, re-register the Escape listener and rebuild `contextValue` every render (behavior change). `contextValue` also contains `dispatch`; it comes from a hook return now, so exhaustive-deps requires it in the deps: 15 entries, the original 14 plus the stable `dispatch`.
- Name rule: non-hook callbacks must not start with `use` (rules-of-hooks lint). Use `handleUseCard`, not `useCard`.
- Rejected: moving state into a store or `useReducer` for localGameState (behavior change). Rejected: a `.service.ts` (no I/O of its own; `handlePlayerExit` is a legacy `@/lib/actions` call, already outside Firestore import rules).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | new | Shared test builders (`buildPlayer`, `buildGameState`), `mockToast`, `renderProvider`, and `ContextSpy` capturing the latest `useGameBoard()` value. Moved into `test-utils/` during the Phase 3b gate review because Jest's `testMatch` picked up the original path as a test file. | tester-a |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | new | Phase 3a safety-net tests for the uncovered branches (list in Test plan). | tester-a |
| `src/modules/game-board/game-board.hook.types.ts` | new | Param and payload types shared by the hooks (Contracts). | implementer-a |
| `src/modules/game-board/game-board.map.ts` | new | Pure `hasActiveDialogOrPendingAction(uiState)`. | implementer-a |
| `src/modules/game-board/game-board.state.hook.ts` | new | `useGameBoardState`: reducer, local game state, derived values, three state effects (`:58-98`). | implementer-a |
| `src/modules/game-board/game-board.actions.hook.ts` | new | `useGameBoardActions`: `onAction` (`:100-151`). | implementer-a |
| `src/modules/game-board/game-board.card-actions.hook.ts` | new | `useCardActions`: `handleCancelAction` (`:161-180`) and `handleUseCard` (`:246-299`). | implementer-a |
| `src/modules/game-board/game-board.local-actions.hook.ts` | new | `useLocalActions`: `handleLocalAction` switch incl. Attack and Position (`:153-245`, `:300-305`), delegating Cancel and UseCard to `useCardActions` results; plus the Escape effect (`:307-326`). | implementer-a |
| `src/modules/game-board/game-board.tile-click.hook.ts` | new | `useTileClick`: `handleTileClick` (`:363-434`). | implementer-a |
| `src/modules/game-board/game-board.session.hook.ts` | new | `useSessionHandlers`: start game, exit click, confirm exit, confirm host leave (`:436-482`). | implementer-a |
| `src/modules/game-board/game-board.hook.ts` | new | `useGameBoardProvider(props)`: composes all hooks in order, runs the auto end-turn effect (`:344-361`), calls `useTurnTimer`, builds `contextValue` (`:484-521`). | implementer-a |
| `src/modules/game-board/game-board.provider.tsx` | new | `'use client'`; `GameBoardContext`, `GameBoardProvider`, `useGameBoard`. | implementer-b |
| `src/modules/game-board/index.ts` | edit | Add `GameBoardProvider`, `useGameBoard` exports (done in step 10, after the provider file exists). | implementer-b |
| `src/features/game/context/GameBoardContext.tsx` | edit | Replace the 473 lines with re-exports only (Contracts). | implementer-b |
| `src/modules/game-board/game-board.map.test.ts` | new | Tests for `hasActiveDialogOrPendingAction`. | tester-a |
| `docs/README.md` | edit | §2 and §3.3 describe the final layout. | implementer-b |

If any hook file exceeds 150 counted lines, implementer-a splits it by responsibility (for example moving the Attack and Position branches into `game-board.combat-actions.hook.ts`) and reports the added file. Do not trim comments or compress code to fit.

## Contracts
```ts
// ---- src/modules/game-board/game-board.hook.types.ts (new) ----
import type { Dispatch, SetStateAction } from 'react';
import type { Army, CardName, GameAction, GameState, Player } from '@/lib/types';
import type { useToast } from '@/hooks/use-toast';
import type { GameBoardContextType, GameBoardUIAction, GameBoardUIState } from './game-board.types';

export type ToastFn = ReturnType<typeof useToast>['toast'];
export type OnAction = GameBoardContextType['onAction'];
export type SetLocalGameState = Dispatch<SetStateAction<GameState | null>>;
export type UIDispatch = Dispatch<GameBoardUIAction>;

/** Payloads read by handleLocalAction; shapes taken from the existing destructuring. */
export interface AttackPayload { army?: Army }
export interface PositionPayload { army: Army }
export interface UseCardPayload { cardName: CardName }
export interface CancelPayload { cardName?: CardName }
export interface ShowCardsPayload { playerId: number }

// ---- game-board.map.ts ----
export function hasActiveDialogOrPendingAction(uiState: GameBoardUIState): boolean;

// ---- game-board.state.hook.ts ----
export interface GameBoardStateArgs {
  serverGameState: GameState;
  localPlayerFromServer: Player;
  playerId: string | null;
  isMyTurn: boolean;
}
export interface GameBoardState {
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  localGameState: GameState | null;
  setLocalGameState: SetLocalGameState;
  gameStateForDisplay: GameState;
  localPlayer: Player;
  selectedArmy: Army | null;
}
export function useGameBoardState(args: GameBoardStateArgs): GameBoardState;

// ---- game-board.actions.hook.ts ----
export interface GameBoardActionsArgs {
  isPerformingAction: boolean;           // uiState.isPerformingAction
  isMyTurn: boolean;
  localGameState: GameState | null;
  serverGameState: GameState;
  setLocalGameState: SetLocalGameState;
  setGameState: GameBoardProviderProps['setGameState'];
}
export function useGameBoardActions(args: GameBoardActionsArgs): OnAction;

// ---- game-board.card-actions.hook.ts ----
export interface CardActionsArgs {
  localGameState: GameState | null;
  setLocalGameState: SetLocalGameState;
  localPlayer: Player;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  onAction: OnAction;
  toast: ToastFn;
}
export interface CardActions {
  handleCancelAction: (payload?: CancelPayload) => void;
  handleUseCard: (payload: UseCardPayload) => void;
}
export function useCardActions(args: CardActionsArgs): CardActions;

// ---- game-board.local-actions.hook.ts ----
export interface LocalActionsArgs {
  localGameState: GameState | null;
  gameStateForDisplay: GameState;
  localPlayer: Player;
  isMyTurn: boolean;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  onAction: OnAction;
  toast: ToastFn;
  handleCancelAction: CardActions['handleCancelAction'];   // separate args, see Identity rule
  handleUseCard: CardActions['handleUseCard'];
}
export function useLocalActions(args: LocalActionsArgs): GameBoardContextType['onLocalAction'];
// Also registers the window 'keydown' Escape effect, deps [uiState.selectedArmyId, uiState.pendingAction, handleLocalAction, localPlayer].

// ---- game-board.tile-click.hook.ts ----
export interface TileClickArgs {
  gameStateForDisplay: GameState;
  isMyTurn: boolean;
  uiState: GameBoardUIState;
  dispatch: UIDispatch;
  localPlayer: Player;
  selectedArmy: Army | null;
  onAction: OnAction;
  toast: ToastFn;
}
export function useTileClick(args: TileClickArgs): GameBoardContextType['handleTileClick'];

// ---- game-board.session.hook.ts ----
export interface SessionHandlersArgs {
  gameId: string;
  serverGameState: GameState;
  localPlayerFromServer: Player;
  localPlayerName: string | undefined;   // localPlayer?.name, was the dep `localPlayer?.name`
  isHost: boolean;
  dispatch: UIDispatch;
  setGameState: GameBoardProviderProps['setGameState'];
  onExit: () => void;
  toast: ToastFn;
}
export type SessionHandlers = Pick<GameBoardContextType,
  'handleStartGame' | 'handleExitClick' | 'handleConfirmExit' | 'handleConfirmHostLeave'>;
export function useSessionHandlers(args: SessionHandlersArgs): SessionHandlers;

// ---- game-board.hook.ts ----
export function useGameBoardProvider(props: Omit<GameBoardProviderProps, 'children'>): GameBoardContextType;
// Call order (must match today's hook order): useToast, useGameBoardState, useGameBoardActions,
// useCardActions, useLocalActions (incl. Escape effect), auto end-turn useEffect, useTileClick,
// useSessionHandlers, useTurnTimer, useMemo(contextValue).
// contextValue deps = the 14 entries of GameBoardContext.tsx:507-520 PLUS `dispatch` (15; stable, required by exhaustive-deps).
// `handleStartGame` gets `localPlayerName: localPlayer.name` (the DERIVED localPlayer, not localPlayerFromServer, as at :439).

// ---- game-board.provider.tsx ----
export function GameBoardProvider(props: GameBoardProviderProps): JSX.Element;
export function useGameBoard(): GameBoardContextType;  // same error text: 'useGameBoard must be used within a GameBoardProvider'

// ---- src/modules/game-board/index.ts additions ----
export { GameBoardProvider, useGameBoard } from './game-board.provider';

// ---- src/features/game/context/GameBoardContext.tsx (final content, whole file) ----
'use client';
export {
  GameBoardProvider,
  useGameBoard,
  gameBoardReducer,
} from '@/modules/game-board';
export type {
  GameBoardContextType,
  GameBoardProviderProps,
  GameBoardUIAction,
  GameBoardUIState,
} from '@/modules/game-board';
```

Reminders for implementer-a: the sync effect (`:69-75`) and the other two effects stay in `useGameBoardState`, in their original order; keep `localGameState` as `React.useState` equivalent (`useState<GameState | null>(null)`); `useToast()` is called once in `useGameBoardProvider` and `toast` passed down (a single call, same as today).

## Phases
Phase 3 is split into three sub-phases. Per CLAUDE.md, stop after each and wait for the user to type `continue`.

### Phase 3a: Characterization tests for the uncovered surface (tester-a, sonnet)
1. Read `GameBoardContext.characterization.test.tsx` and `src/lib/types/monsters.ts`. Do NOT edit the existing test files.
2. Create `__tests__/test-utils/gameBoardTestKit.tsx` with: `buildPlayer`, `buildGameState` (copy the shape from the existing test; add optional `map` tile overrides via a `withTile(state, x, y, patch)` helper), module-level `export const mockToast = jest.fn()`, `renderProvider(gameState, overrides)` (same props as the existing helper), and `ContextSpy` (a child component that does `latest.current = useGameBoard()` each render; export `getContext()`). The jest mocks themselves must be declared in each test file (jest hoists `jest.mock` per file); the kit documents the required mock block in a header comment. Use `jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))`; `mockToast` is allowed by the `mock` prefix rule and gives a STABLE toast, unlike the existing file's per-render `jest.fn()`.
3. Create `GameBoardContext.handlers.characterization.test.tsx` with the cases in the Test plan. Also mock `@/lib/turn-progression` (`hasPlayerRemainingActions` returns true by default) so the 700 ms auto-end effect cannot fire in unrelated tests; the auto-end test overrides it.
4. Run `npx jest src/features/game/context` against the unmodified provider: all pass. If a test fails because the code behaves differently from the plan's expectation, fix the TEST to match observed behavior and note the surprise in the report (these tests describe behavior as it is). If the behavior looks like a bug, note it, do not fix it.
5. Run `npm run typecheck` and `git status`: only the two new test files exist; no source file changed.

Model escalation: sonnet (triage override tester-a=sonnet).

### Phase 3b: Extraction (implementer-a, implementer-b; sonnet)
Order matters. Legacy file stays untouched until step 11, so the app and tests keep working throughout.
1. (impl-a) `game-board.hook.types.ts`.
2. (impl-a) `game-board.map.ts`; (tester-a) `game-board.map.test.ts`, run it.
3. (impl-a) `game-board.state.hook.ts`: copy `:58-98` verbatim, wrapping in `useGameBoardState`. Return the `GameBoardState` object.
4. (impl-a) `game-board.actions.hook.ts`: copy `:100-151`; deps `[isPerformingAction, isMyTurn, localGameState, serverGameState, setGameState, setLocalGameState]`.
5. (impl-a) `game-board.card-actions.hook.ts`: `handleCancelAction` from `:161-180` (the `payload?.cardName` fallback chain verbatim), `handleUseCard` from `:246-299`. Each `useCallback` lists exactly the values it reads. The old `handleLocalAction` `break` statements become `return` (Teleport branch: `return` after toast, nothing after it ran in the old code either, since `break` jumped to the end of the switch).
6. (impl-a) `game-board.local-actions.hook.ts`: `handleLocalAction` keeps the first-line guard `if (!localGameState || !isMyTurn) return;` and the `default: console.warn('Unhandled local action:', action)`. Cases `local_CancelAction` and `local_UseCard` call `handleCancelAction(payload)` / `handleUseCard(payload)` (separate args). Because those two now delegate, the guard still runs first. Deps: `[localGameState, onAction, toast, isMyTurn, gameStateForDisplay, localPlayer, dispatch, handleCancelAction, handleUseCard]` (`uiState.pendingAction` is read only inside `handleCancelAction`, whose own deps carry it, so identity changes in the same situations as today); trim any that are unused so exhaustive-deps passes with zero warnings (`uiState.pendingAction` and `onAction` may be unused after delegation; remove only if lint says so). Add the Escape effect, whose body calls `handleLocalAction(GameAction.local_DeselectArmy)` / `local_CancelAction` exactly as today.
7. (impl-a) `game-board.tile-click.hook.ts`: copy `:363-434` verbatim, deps list from Verified context plus `dispatch`.
8. (impl-a) `game-board.session.hook.ts`: copy `:436-482`; `handleStartGame` deps `[serverGameState, isHost, localPlayerName, setGameState, toast]`; `handleConfirmExit`/`handleConfirmHostLeave` deps `[gameId, localPlayerFromServer, onExit, dispatch]`; `handleExitClick` deps `[serverGameState, localPlayerFromServer, isHost, handleConfirmExit, dispatch]`. `startGame` and `handlePlayerExit` imports stay `@/lib/game-initializer` and `@/lib/actions` (the tests mock those paths).
9. (impl-a) `game-board.hook.ts` per the call-order contract.
10. (impl-b) `game-board.provider.tsx`, then the `index.ts` additions (so typecheck never sees an export of a missing file).
11. (impl-b) Replace `GameBoardContext.tsx` with the final content in Contracts. Remove now-unused imports (they all go).
12. Run `npx jest src/features/game/context src/modules/game-board`: all green, existing two files untouched.

Review gate: architect-b reviews every hook against the original `:58-521` line by line (dependency arrays, hook call order, `break` to `return` conversions, any dropped line) BEFORE step 11 is merged. If architect-b finds a diff, fix and re-review; only then flip the legacy file.

Model escalation: all of 3b on sonnet.

### Phase 3c: Verification and docs
1. `npm run typecheck`, `npm run lint` (zero warnings), `npm test`, `npm run build`.
2. `git diff --stat -- src/features` shows only `GameBoardContext.tsx`; `git diff -- src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx src/features/game/context/__tests__/GameBoardContext.test.ts` is empty.
3. Grep each ~10 consumer's import: `grep -rn "context/GameBoardContext" src` resolves; no consumer edited.
4. Browser smoke (skill ui-verify, `node .claude/skills/ui-verify/scripts/snapshot.mjs`): load a game page if feasible without Firebase credentials; otherwise state "unverified in browser" and rely on `npm run test:e2e -- e2e/gameplay.spec.ts` if Java 21 and the emulator are available. Report which was run.
5. (impl-b) Update `docs/README.md` §2 and §3.3: the provider lives in `src/modules/game-board/` (hooks list), the legacy file is a re-export kept until all consumers migrate.
6. architect-b final review; coordinator commits per phase: `test(game-board): characterize handlers [phase 3a]`, `refactor(game-board): extract provider hooks [phase 3b]`, `docs(game-board): update architecture notes [phase 3c]`.

## Test plan
All new cases live in `GameBoardContext.handlers.characterization.test.tsx`, drive the provider through `ContextSpy` + `act`, and import from `'../GameBoardContext'`.

- tester-a (logic, first, Phase 3a):
  - local_Attack: (1) one enemy army on the tile: `handleGameAction` called with `InitiateCombat` and `{ attackingArmyId, target: { type: 'player', defenderId, defendingArmyId } }`, and `setGameState` called (real-time action) with the pre-handler state; no attack dialog. (2) two enemy armies: `uiState.dialogs.attackSelection` set with `attackingArmyId`, `defendingPlayer`, both armies; no `handleGameAction` call. (3) one monster: `InitiateCombat` with `target: { type: 'monster', monsterName }`, `handleGameAction` called, `setGameState` NOT called (monster branch at `:119-123`). (4) two monsters: `dialogs.monsterSelection` set. (5) `payload.army` undefined: nothing happens. (6) tile with only own occupants: nothing happens.
  - local_Position: (1) tile with 1 resource and no `positionedBy`: `dialogs.position` = `{ x, y, resources, armyId }`. (2) all resources already in `positionedBy`: `mockToast` called with `title: 'No available spots'`, `variant: 'destructive'`, no dialog.
  - local_UseCard: (1) card not in `specialCards`: toast `Action Error` with message `You do not have the Teleport card.` style text (use the card under test). (2) `actionsThisTurn` includes `GameAction.UseCard`: toast `You can only use one card per turn.`. (3) Teleport: `pendingAction` = `{ type: 'teleport', cardName: 'Teleport' }`, toast `Teleport Activated`, `handleGameAction` NOT called. (4) Scout: `handleGameAction` called with `UseCard` `{ cardName: 'Scout' }`; `pendingAction` = `{ type: 'scout', cardName: 'Scout', count: 3, scoutedTiles: [] }`; selected army cleared. (5) Sabotage, Wealthy, Steal Resource (one `it.each`): pending type `sabotage` / `wealthy` / `steal-resource` and the matching dialog `isOpen: true`. (6) a card not in the multi-step list (for example Reinforce): `handleGameAction` called, no pending action, no dialog. (7) handler returns no `state`: no pending action.
  - local_CancelAction: with a pending Scout action carrying `scoutedTiles`, `handleGameAction` called with `CancelAction` and `{ cardName: 'Scout', scoutedTiles }`, pending cleared; with `reinforceActive` and no pending action the fallback card is Reinforce.
  - local_ShowCards / CloseCards / OpenAbilitiesShop / CloseAbilitiesShop: the matching `uiState` fields. Unknown action: `console.warn` spy called with `'Unhandled local action:'`. Guard: with `isMyTurn` false, any local action is a no-op.
  - Escape key: with an army selected, `fireEvent.keyDown(window, { key: 'Escape' })` deselects; with no selection but a pending action, the cancel path runs (`handleGameAction` `CancelAction`); with neither, nothing is called; a non-Escape key does nothing; after unmount the listener is removed (no call).
  - handleStartGame: host, `startGame` called with `(serverGameState, localPlayer.name)` and `setGameState` called with `(startedGame, GameAction.EndTurn, {})`, toast `Game Started!`; non-host: nothing called.
  - handleExitClick: host opens `dialogs.hostLeave`; non-host while `status === 'playing'` opens `dialogs.confirmExit`; non-host in lobby status (`'waiting'`; verify the real literal in `GameState.status` before use) calls `handlePlayerExit(gameId, playerId)` and `onExit`.
  - handleConfirmExit: closes the confirm dialog, `handlePlayerExit` called, `onExit` called, `isExiting` back to false afterwards; when `handlePlayerExit` rejects, `console.error` is called and `onExit` is still called (`mockRejectedValueOnce`).
  - handleConfirmHostLeave: closes the host dialog, `handlePlayerExit` and `onExit` called; rejection still calls `onExit`.
  - onAction: EndTurn calls `setGameState(localState, EndTurn, payload)` once and not `handleGameAction`; with `isMyTurn` false and no local state, EndTurn does nothing; a non-real-time action (for example `Move`) updates local state and does NOT call `setGameState`.
  - Auto end-turn (fake timers): with `hasPlayerRemainingActions` mocked false, advancing 700 ms calls `setGameState(..., EndTurn, undefined)` and toast `Turn Completed`; if a dialog opens within the window, the timer is cleared.
  - Context identity (guards the dependency arrays): with stable `setGameState`, `onExit` and `mockToast`, a `rerender` with identical props leaves `onAction`, `onLocalAction`, `handleTileClick`, `handleStartGame`, `handleExitClick` and the whole context value reference-equal. It must pass before AND after extraction; it would have caught a fresh `cardActions` object.
  - Turn timer wiring: with fake timers, advancing 120 s on my turn calls `setGameState` with `EndTurn` (proves `useTurnTimer` still receives the live `onAction`).
  - Also in `game-board.map.test.ts` (Phase 3b step 2): `hasActiveDialogOrPendingAction` is false for `initialUIState`; true for each of: pendingAction set, armySelection, attackSelection, monsterSelection, position, `specialIslandRoll.isOpen`, `stealResource.isOpen`, `sabotage.isOpen`, `wealthy.isOpen`, `abilitiesShopOpen`, `cardsPlayerId: 0` (zero counts as open); false for `specialIslandRoll: { isOpen: false }`; false for `confirmExit` and `hostLeave` (they are intentionally not in the original list).
- tester-b (view and e2e): no view changes. Run, do not write: `npm run test:e2e -- e2e/gameplay.spec.ts` if the emulator and Java 21 are available (Phase 3c); otherwise report it as not run.

## Preview states
- None. No component, no visible UI. Testbed unaffected.

## Risks
- Hook order or dependency drift breaks gameplay silently. Mitigation: verbatim moves, call-order contract, deps listed per hook above, Phase 3a tests, and the architect-b line-by-line review gate before step 11.
- `useToast` returns a new `toast` every render in the existing test mock, so effects keyed on `toast` re-run every render there. Real app: stable. The new test kit uses a stable `mockToast`; the old test file stays as is.
- `break` to `return` conversion in `handleUseCard`: the old `break` skipped nothing after the switch (`handleLocalAction` ends right after), so `return` is equivalent. The `catch` block still toasts. Covered by the Teleport test.
- Auto-end effect (700 ms) firing in tests, calling `setGameState` unexpectedly. Mitigation: mock `hasPlayerRemainingActions`.
- A hook file above 150 lines. Mitigation: the split rule in the File plan.
- Casting payloads without `any` may not typecheck for `PendingAction` type string (`:283`). Mitigation: BLOCKER report with evidence, not an `any`.
- Import cycle: `@/modules/game-board` index now pulls in `@/features/game/hooks/useTurnTimer`; that file imports only `@/lib/types`, so there is no cycle with `GameBoardContext.tsx`. Verify with `npm run build`.
- Drift: `docs/README.md` may describe the context differently from the code; implementer-b reports any mismatch rather than silently rewriting.

## Review (architect-b)
VERDICT: APPROVED (after the fixes folded into this plan)

Verified against the current files: all cited line ranges in GameBoardContext.tsx (58-98, 100-151, 153-305, 307-326, 328-342, 344-361, 363-434, 436-482, 484-521), `index.ts`, `useTurnTimer.ts` (declared at :14, cited :13; harmless), `game-board.types.ts` (`GameBoardContextType` starts :86, `GameBoardProviderProps` :115; cited :76-125, harmless), eslint module rules (`.hook.ts` may import `@/features/*`; `.tsx` and plain `.ts` may not), `hasPlayerRemainingActions` (`src/lib/turn-progression.ts:15`, dialog short-circuit :21). All paths exist; no invented symbols.

Findings, all resolved in the text above:
1. BLOCKING (fixed): the `as NonNullable<PendingAction>['type']` cast does not typecheck (TS2322, tested with tsc). Replaced by a whole-object `as PendingAction`, also tested. The original `as any` hid that `sabotage`, `wealthy`, `steal-resource` are not in the `PendingAction` union.
2. BLOCKING (fixed): a `cardActions` object in the `handleLocalAction` deps would change identity every render. Now two separate callback args; an identity test is required in Phase 3a.
3. BLOCKING (fixed): `catch (error: any)` at :295 was missed and would fail the no-`any` lint. Narrowed with `instanceof Error`.
4. Fixed: contextValue deps are the 14 originals (order preserved) plus `dispatch` (15), otherwise exhaustive-deps warns.
5. Fixed: `index.ts` ownership moved to implementer-b and ordered after the provider file (it exported a missing file at step 9).
6. Fixed: `handleStartGame` uses the derived `localPlayer.name`, not `localPlayerFromServer`.
7. Non-blocking: `CancelPayload` in Contracts has only `cardName`; the local `cancelPayload` inside `handleCancelAction` is `{ cardName?: CardName; scoutedTiles?: string[] }` (Decisions). Implementer keeps the latter.
8. Non-blocking: a `jest.mock` factory referencing `mockToast` imported from the kit works lazily (body runs at render). If SWC hoisting objects, tester-a defines `mockToast` in the test file and passes it to the kit.

Boundaries: implementer-a owns logic (`.hook.ts`, `.map.ts`, types); implementer-b owns the view-level provider, `index.ts`, the legacy re-export and docs. Phase 3a covers every handler branch before extraction (plus the identity test); the legacy file stays untouched until step 11. `useTurnTimer` import from `game-board.hook.ts` is lint-legal; it holds `onAction` in a ref, so timer behavior is insensitive to identity.
