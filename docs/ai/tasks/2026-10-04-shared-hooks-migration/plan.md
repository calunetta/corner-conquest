# Plan: Shared hooks migration

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts`, `use-is-mobile.ts`, `use-mobile.ts` no longer exist; `src/hooks/` is empty.
- [ ] Every call site (production and test) resolves through a module's public `index.ts`, not a deep path.
- [ ] No behavior change: toast dedupe/limit/timing, player session validation, game-engine subscriptions/bot-turn/death-animation timing, and the 768px mobile breakpoint are unchanged.
- [ ] `use-toast.ts` (208 lines) and `use-game-engine.ts` (153 lines incl. blanks, 124 countable) are each split so every new file is ≤150 countable lines.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass repo-wide.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `useGameEngine` | `src/hooks/use-game-engine.ts:10-153` | Firestore game-doc subscription, `setGameState`, bot-turn trigger, death-animation cleanup; only caller `src/features/game/components/GameBoard.tsx:6` |
| `usePlayer`/`PlayerProvider` | `src/hooks/use-player.tsx:14-149` | Context provider; Firestore username reservation/validation via `getDoc`/`setDoc`/`deleteDoc` directly in the `.tsx` |
| `useToast`/`toast`/`reducer` | `src/hooks/use-toast.ts:1-209` | Global toast store (listeners/dispatch/memoryState) + `useToast()` hook; 208 lines, over the 150-line cap once moved |
| `useIsMobile` | `src/hooks/use-is-mobile.ts:1-20` | 768px breakpoint hook, no Firestore/context |
| `useIsMobile` (dead re-export) | `src/hooks/use-mobile.ts:1-4` | **Not dead** — see Decisions. Re-exports `use-is-mobile.ts` |
| `handleGameAction`, `takeBotTurn` | `src/modules/game-rules/index.ts:26` (+ root reducer) | Already-migrated reducer/service `useGameEngine` calls; `handleGameAction`'s `payload` param is already typed `unknown` (`src/modules/game-rules/game-rules.reducer.ts:25`) |
| `DeathAnimation` | `src/lib/types/game.ts:45` (type from `./combat`) | Replaces the `(a: any) => ...` filter callback's type in the death-animation effect |
| `GameBoardProvider`/`useGameBoard` pattern | `src/modules/game-board/game-board.provider.tsx:1-25` | Precedent for `PlayerProvider`/`usePlayer`: flat `createContext`/`useContext` in a `.tsx`, heavy logic in a sibling `.hook.ts` |
| `game-board.hook.ts` lacking `'use client'` despite using hooks | `src/modules/game-board/game-board.hook.ts:1` | Precedent: `'use client'` is only mandatory at the `.tsx` boundary, not on every `.hook.ts` |
| `lobby.service.ts` / `bot-turn.service.ts` lacking `'use client'` | `src/modules/lobby/services/lobby.service.ts:1`, `src/modules/game-rules/services/bot-turn.service.ts:1-2` | Precedent: `.service.ts` files carry no directive |
| `RESTRICTED_IMPORTS` (firestore / legacyUi / deepModuleImport) | `eslint.config.mjs:44-58` | Firestore only in `*.service.ts`; another module only via its index; `.hook.ts` files get only `firestore` + `deepModuleImport` (`eslint.config.mjs:88-96`) — `legacyUi` is deliberately excluded there, since `.hook.ts` is the one file type allowed to import `@/features/*` |
| `max-lines` cap | `eslint.config.mjs:73` | 150 countable lines (blanks/comments excluded) once a file leaves `LEGACY_PATHS` |
| `LEGACY_PATHS` entry `'src/hooks/**'` | `eslint.config.mjs:15` | Must be removed once `src/hooks/` is empty |
| `src/modules/shared/index.ts`, `player-sprite.ts` | `src/modules/shared/index.ts:1`, `player-sprite.ts:1-13` | Existing flat "used by 2+ modules" module; `toast-store.ts`/`use-toast.ts`/`use-is-mobile.ts` join it the same way |
| `src/modules/session/index.ts` | `src/modules/session/index.ts:1-2` | Existing session-lifecycle module (`ConfirmExitDialog`, `HostLeaveDialog`); `player.provider.tsx` joins it |
| Call sites (verified by Grep, this session) | see table below | Supersedes triage's list — one import triage missed |

### Call sites (verified this session, supersedes triage.md)
| Hook | Importer | Kind | New import |
|---|---|---|---|
| `useGameEngine` | `src/features/game/components/GameBoard.tsx:6` | legacy `.tsx` | `@/modules/game-board` |
| `usePlayer`/`PlayerProvider` | `src/app/layout.tsx:5` | legacy `.tsx` | `@/modules/session` |
| `usePlayer` | `src/app/page.tsx:6` | legacy `.tsx` | `@/modules/session` |
| `usePlayer` | `src/features/game/components/GameBoard.tsx:5` | legacy `.tsx` | `@/modules/session` |
| `usePlayer` | `src/modules/lobby/components/Lobby/Lobby.hook.ts:2` | `.hook.ts` | `@/modules/session` |
| `usePlayer` | `src/modules/lobby/components/Lobby/Lobby.hook.test.ts:5,9` (`jest.mock('@/hooks/use-player')`) | `.hook.test.ts` | `@/modules/session` |
| `useToast` | `src/components/ui/toaster.tsx:11` | vendored `.tsx` | `@/modules/shared` |
| `useToast` | `src/hooks/use-game-engine.ts:6` (becomes the new engine hook) | — | `@/modules/shared` |
| `useToast` | `src/modules/game-board/game-board.hook.ts:2` | `.hook.ts` | `@/modules/shared` |
| `useToast` (type only) | `src/modules/game-board/game-board.hook.types.ts:3` | `.types.ts` | `@/modules/shared` |
| `useToast` | `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts:1` | `.hook.ts` | `@/modules/shared` |
| `useToast` | `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.test.ts:12` (`jest.mock`) | `.hook.test.ts` | `@/modules/shared` |
| `useToast` | `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.test.tsx:12` (`jest.mock`) | `.test.tsx` | `@/modules/shared` |
| `useToast` | `src/modules/lobby/components/Lobby/Lobby.hook.ts:3` | `.hook.ts` | `@/modules/shared` |
| `useToast` | `src/modules/lobby/components/Lobby/Lobby.hook.test.ts:8` (`jest.mock`) | `.hook.test.ts` | `@/modules/shared` |
| `useToast` | `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx:12` (`jest.mock`) | legacy `.test.tsx` | `@/modules/shared` |
| `useToast` | `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx:17` (`jest.mock`) | legacy `.test.tsx` | `@/modules/shared` |
| `useToast` | `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx:5` (docstring comment only) | legacy `.tsx` | update comment text to `@/modules/shared` |
| `useIsMobile` | `src/features/game/components/PlayerInfoBar.tsx:7` | legacy `.tsx` | `@/modules/shared` |
| `useIsMobile` | `src/modules/map/components/MapGrid/MapGrid.hook.ts:4` | `.hook.ts` | `@/modules/shared` |
| `useIsMobile` | `src/modules/map/components/MapGrid/MapGrid.hook.test.ts:4,15` (`jest.mock`) | `.hook.test.ts` | `@/modules/shared` |
| `useIsMobile` | `src/components/ui/sidebar.tsx:8` (`from "@/hooks/use-mobile"`) | vendored `.tsx` | `@/modules/shared` |

## Decisions
- **`src/hooks/use-mobile.ts` is not dead.** Triage's grep used a trailing `'` that only matches single-quoted imports; `src/components/ui/sidebar.tsx:8` imports it with double quotes (`from "@/hooks/use-mobile"`). Repoint `sidebar.tsx` to `@/modules/shared` in the same step that deletes `use-mobile.ts`, same as every other `useIsMobile` caller. Rejected: deleting `use-mobile.ts` without touching `sidebar.tsx` (triage's original plan) — breaks `tsc` (`sidebar.tsx` is in `**/*.tsx` and not excluded by `tsconfig.json`, even though unused by the app and ESLint-ignored).
- **`use-toast.ts` splits into `toast-store.ts` (listeners/dispatch/memoryState/reducer/`toast()`, no React) and `use-toast.ts` (the `useToast()` hook only)** in `src/modules/shared/`, because the store has no JSX/React state and is reused as-is by the hook; this is the split the ESLint 150-line cap forces, matching triage's suggestion. Rejected: one 208-line file (fails `max-lines`); splitting by action type instead of store-vs-hook (no natural seam, store logic doesn't subdivide further).
- **`use-toast.ts` and `use-is-mobile.ts` go in `src/modules/shared/`** (flat, alongside existing `player-sprite.ts`) because each is used by 2+ modules (map, cards, lobby, game-board) plus legacy call sites, with no single owning domain. Rejected: putting `useToast` in `game-board` (its heaviest consumer) — `AbilitiesDialog` (cards) and `Lobby` (lobby) would then deep-import across modules, which the `deepModuleImport` ESLint rule and the "import another module only through its index" rule both forbid for anything but the owning module's own files.
- **`use-player.tsx` splits into `player.types.ts`, `player.hook.ts` (state/effects, calls the service), `services/player-session.service.ts` (Firestore `getDoc`/`setDoc`/`deleteDoc` only), and `player.provider.tsx` (context + `usePlayer`/`PlayerProvider`, mirroring `game-board.provider.tsx`)**, placed in `src/modules/session/` (already holds `ConfirmExitDialog`/`HostLeaveDialog`, the other player/session-lifecycle components). The original `.tsx` calls Firestore directly, which the `firestore` ESLint restriction forbids for any non-`.service.ts` module file — the split is required, not optional, independent of the line-count cap (149 lines, under 150, but still mixes I/O into a `.tsx`). Rejected: keeping Firestore calls inline in `player.provider.tsx` (fails `no-restricted-imports`); a new `player`/`account` domain (adds a domain for 4 files when `session` already fits).
- **`validateSession`'s and `setUsernameCallback`'s branching (does the fetched `playerId` match, is the username taken) stays in `player.hook.ts`; the service only exposes `findUsernameOwner`/`reserveUsername`/`releaseUsername`.** Decision logic isn't I/O; service functions return plain data per the component-architecture table.
- **`use-game-engine.ts` splits into `game-board.engine.hook.ts`, `game-board.engine.types.ts`, and `services/game-board.engine.service.ts`**, placed in `src/modules/game-board/` (the module that already owns the live match's provider/reducer/hooks; `GameBoard.tsx`, the sole caller, already imports `GameBoardProvider`/`useGameBoard` from this module via the `GameBoardContext.tsx` compatibility re-export). Firestore calls (`onSnapshot`/`setDoc`/`updateDoc`) move to the new service; `handleGameAction`/`takeBotTurn` (already pure reducer / already-Firestore-internal service from `@/modules/game-rules`) stay called directly from the hook, unchanged. Rejected: a new `match`/`game-session` domain (no other component needs it; `game-board` already is the live-match domain); keeping the hook as one un-split file (fails the `firestore` ESLint restriction the same way `use-player.tsx` does).
- **`setGameState`'s `payload: any` becomes `payload: unknown`; the death-animation filter's `(a: any)` becomes `(a: DeathAnimation)`.** Both are forwarded/compared only (`handleGameAction`'s own `payload` param is already `unknown`; `DeathAnimation` is the actual array element type of `GameState.deathAnimations`). Type-only fix, forced by `@typescript-eslint/no-explicit-any` applying once the file leaves `LEGACY_PATHS`; no runtime change.
- **No `NameView`/`Name` split for `PlayerProvider` or `GameBoardProvider`-style engine hook.** Neither renders anything but `{children}` (`PlayerProvider`) or nothing at all (`useGameEngine` returns data, no JSX); the `NameView` split is for presentational components with props, not context plumbing — same precedent as `game-board.provider.tsx`.
- **No preview** for any file in this task (confirmed from triage: no new component, no visual state change).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/shared/toast-store.ts` | new | Toast listeners/dispatch/memoryState/reducer, `toast()`, `subscribeToToastState()`, `getToastState()`, `dismissToast()` — moved verbatim from `use-toast.ts:1-186` (no React) | implementer-a |
| `src/modules/shared/use-toast.ts` | new | `useToast()` hook only, moved verbatim from `use-toast.ts:188-206`, calling `toast-store.ts` | implementer-a |
| `src/modules/shared/use-is-mobile.ts` | new | `useIsMobile()`, moved verbatim from `src/hooks/use-is-mobile.ts` | implementer-a |
| `src/modules/shared/toast-store.test.ts` | new | reducer (ADD/UPDATE/DISMISS/REMOVE, `TOAST_LIMIT`), `toast()` dedupe test | tester-a |
| `src/modules/shared/use-toast.test.ts` | new | `renderHook` subscribe/unsubscribe, returns store state | tester-a |
| `src/modules/shared/use-is-mobile.test.ts` | new | `matchMedia` mock, breakpoint true/false, resize listener cleanup | tester-a |
| `src/modules/shared/index.ts` | edit | add `export { useToast, toast } from './use-toast';` and `export { useIsMobile } from './use-is-mobile';` | implementer-a |
| `src/modules/session/player.types.ts` | new | `PlayerContextType` (same shape as `use-player.tsx:5-10`) | implementer-a |
| `src/modules/session/player.hook.ts` | new | `usePlayerProvider()`: playerId/username state, localStorage, calls service, `beforeunload` effect — moved from `use-player.tsx:15-134`, Firestore calls replaced by service calls | implementer-a |
| `src/modules/session/services/player-session.service.ts` | new | `findUsernameOwner`, `reserveUsername`, `releaseUsername` (Firestore only) | implementer-a |
| `src/modules/session/player.hook.test.ts` | new | session validation match/mismatch, username taken/available, logout cleanup, `beforeunload` | tester-a |
| `src/modules/session/services/player-session.service.test.ts` | new | each service function against a mocked `@/lib/firebase` | tester-a |
| `src/modules/session/player.provider.tsx` | new | `createContext`, `usePlayer()`, `PlayerProvider` — mirrors `game-board.provider.tsx` | implementer-b |
| `src/modules/session/player.provider.test.tsx` | new | `usePlayer` throws outside provider; `PlayerProvider` renders `children` and supplies the hook's value | tester-b |
| `src/modules/session/index.ts` | edit | add `export { PlayerProvider, usePlayer } from './player.provider';` and `export type { PlayerContextType } from './player.types';` | implementer-a |
| `src/modules/game-board/game-board.engine.types.ts` | new | `UseGameEngineResult`, `SetGameState` (payload `unknown`) | implementer-a |
| `src/modules/game-board/game-board.engine.hook.ts` | new | `useGameEngine()` — moved from `use-game-engine.ts`, Firestore replaced by service calls, `useToast` from `@/modules/shared`, `(a: any)` → `(a: DeathAnimation)` | implementer-a |
| `src/modules/game-board/services/game-board.engine.service.ts` | new | `subscribeToGameState`, `saveGameState`, `clearDeathAnimations` (Firestore only) | implementer-a |
| `src/modules/game-board/game-board.engine.hook.test.ts` | new | subscription data/missing/error paths, bot-turn trigger condition, death-animation scheduling, not-in-game redirect | tester-a |
| `src/modules/game-board/services/game-board.engine.service.test.ts` | new | each service function against a mocked `@/lib/firebase` | tester-a |
| `src/modules/game-board/index.ts` | edit | add `export { useGameEngine } from './game-board.engine.hook';` | implementer-a |
| `src/modules/game-board/game-board.hook.ts` | edit | repoint `useToast` import (`:2`) to `@/modules/shared` | implementer-a |
| `src/modules/game-board/game-board.hook.types.ts` | edit | repoint `useToast` type-only import (`:3`) to `@/modules/shared` | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.ts` | edit | repoint `useToast` import (`:1`) to `@/modules/shared` | implementer-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.ts` | edit | repoint `usePlayer` (`:2`) to `@/modules/session`, `useToast` (`:3`) to `@/modules/shared` | implementer-a |
| `src/modules/map/components/MapGrid/MapGrid.hook.ts` | edit | repoint `useIsMobile` import (`:4`) to `@/modules/shared` | implementer-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.hook.test.ts` | edit | repoint `jest.mock('@/hooks/use-toast', ...)` (`:12`) to `@/modules/shared` | tester-a |
| `src/modules/lobby/components/Lobby/Lobby.hook.test.ts` | edit | repoint `jest.mock('@/hooks/use-toast', ...)` (`:8`) to `@/modules/shared`; repoint `usePlayer` import (`:5`) and `jest.mock('@/hooks/use-player')` (`:9`) to `@/modules/session` | tester-a |
| `src/modules/map/components/MapGrid/MapGrid.hook.test.ts` | edit | repoint `useIsMobile` import (`:4`) and `jest.mock('@/hooks/use-is-mobile', ...)` (`:15`) to `@/modules/shared` | tester-a |
| `src/modules/cards/components/AbilitiesDialog/AbilitiesDialog.test.tsx` | edit | repoint `jest.mock('@/hooks/use-toast', ...)` (`:12`) to `@/modules/shared` | tester-b |
| `src/features/game/components/GameBoard.tsx` | edit | repoint `usePlayer` (`:5`) to `@/modules/session`, `useGameEngine` (`:6`) to `@/modules/game-board` | implementer-b |
| `src/features/game/components/PlayerInfoBar.tsx` | edit | repoint `useIsMobile` import (`:7`) to `@/modules/shared` | implementer-b |
| `src/app/layout.tsx` | edit | repoint `PlayerProvider` import (`:5`) to `@/modules/session` | implementer-b |
| `src/app/page.tsx` | edit | repoint `usePlayer` import (`:6`) to `@/modules/session` | implementer-b |
| `src/components/ui/toaster.tsx` | edit | repoint `useToast` import (`:11`) to `@/modules/shared` | implementer-b |
| `src/components/ui/sidebar.tsx` | edit | repoint `useIsMobile` import (`:8`, currently `from "@/hooks/use-mobile"`) to `@/modules/shared` | implementer-b |
| `src/features/game/context/__tests__/GameBoardContext.characterization.test.tsx` | edit | repoint `jest.mock('@/hooks/use-toast', ...)` (`:12`) to `@/modules/shared` | tester-b |
| `src/features/game/context/__tests__/GameBoardContext.handlers.characterization.test.tsx` | edit | repoint `jest.mock('@/hooks/use-toast', ...)` (`:17`) to `@/modules/shared` | tester-b |
| `src/features/game/context/__tests__/test-utils/gameBoardTestKit.tsx` | edit | update the docstring comment's `jest.mock('@/hooks/use-toast', ...)` example (`:5`) to `@/modules/shared` | tester-b |
| `src/hooks/use-game-engine.ts` | delete | superseded by `src/modules/game-board/game-board.engine.{hook,types}.ts` + service | implementer-a |
| `src/hooks/use-player.tsx` | delete | superseded by `src/modules/session/player.{types,hook,provider}.ts(x)` + service | implementer-a |
| `src/hooks/use-toast.ts` | delete | superseded by `src/modules/shared/{toast-store,use-toast}.ts` | implementer-a |
| `src/hooks/use-is-mobile.ts` | delete | superseded by `src/modules/shared/use-is-mobile.ts` | implementer-a |
| `src/hooks/use-mobile.ts` | delete | dead re-export once `sidebar.tsx` is repointed (see Decisions) | implementer-b |
| `eslint.config.mjs` | edit | remove `'src/hooks/**'` from `LEGACY_PATHS` (`:15`) — the folder is now empty | implementer-b |
| `docs/README.md` | edit | remove `src/hooks/` from the legacy-folders note (`:29`) and the `src/hooks/` bullet (`:51`); update the "Hook Architecture" bullet (`:391`) to the new locations; append `useToast`/`useIsMobile`, `player.provider.tsx`, and `game-board.engine.hook.ts` to the `shared/`, `session/components/`, and `game-board/` clauses in the `src/modules/` paragraph | implementer-b |
| `docs/ai/refactor.md` | edit | row #10 status `pending` → `done` | implementer-b |
| `.claude/skills/ui-design/SKILL.md` | edit | line 22: `src/hooks/use-is-mobile.ts` → `@/modules/shared` | implementer-b |
| `.claude/skills/code-standards/SKILL.md` | edit | line 47: `@/hooks/use-toast` → `@/modules/shared` | implementer-b |
| `.claude/skills/component-architecture/SKILL.md` | edit | line 8: drop `src/hooks/` from the legacy-folders list (now empty) | implementer-b |
| `.claude/skills/kiss-dry-solid/SKILL.md` | edit | line 32: reword the "two entry points" example so it doesn't cite a deleted path — e.g. "a hook file that only re-exports another hook under a different name (formerly `src/hooks/use-mobile.ts` → `use-is-mobile.ts`, fixed by migrating both into `src/modules/shared`)" | implementer-b |

No `CLAUDE.md` edit: grepped for "hooks" in this session, zero matches — it never names `src/hooks/`.

## Contracts
```ts
// ---- src/modules/shared/toast-store.ts ----
import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};
export type Toast = Omit<ToasterToast, 'id'>;
export interface ToastState { toasts: ToasterToast[] }

export function toast(props: Toast): { id: string; dismiss: () => void; update: (props: ToasterToast) => void };
export function dismissToast(toastId?: string): void;
export function getToastState(): ToastState;
export function subscribeToToastState(listener: (state: ToastState) => void): () => void; // push on subscribe, splice out the exact reference on the returned cleanup

// ---- src/modules/shared/use-toast.ts ----
export function useToast(): ToastState & { toast: typeof toast; dismiss: typeof dismissToast };
export { toast } from './toast-store';
// Preserve the original effect's dependency array exactly: `useEffect(() => subscribeToToastState(setState), [state])`
// (NOT `[]` — re-subscribing the same `setState` reference on every state change is a no-op in practice,
// but changing the dependency array is an unreviewed behavior edit; see docs/ai/lessons-learned.md "Hooks & effects").

// ---- src/modules/shared/use-is-mobile.ts ----
export function useIsMobile(): boolean; // body unchanged from src/hooks/use-is-mobile.ts

// ---- src/modules/session/player.types.ts ----
export interface PlayerContextType {
  playerId: string | null;
  username: string | null;
  setUsername: (name: string) => Promise<boolean>;
  logout: () => void;
}

// ---- src/modules/session/services/player-session.service.ts ----
/** Returns the playerId stored for `username`, or null if no reservation exists. */
export function findUsernameOwner(username: string): Promise<string | null>;
export function reserveUsername(username: string, playerId: string): Promise<void>;
export function releaseUsername(username: string): Promise<void>;

// ---- src/modules/session/player.hook.ts ----
export function usePlayerProvider(): PlayerContextType;
// Body: same state/effects as use-player.tsx:15-134, with
//   getDoc(doc(db,'usernames',uname)) + compare playerId  -> findUsernameOwner(uname) + compare to pid, in the hook
//   setDoc(doc(db,'usernames',name), { playerId })        -> reserveUsername(name, currentPid)
//   deleteDoc(doc(db,'usernames', old/current))            -> releaseUsername(...)
// playerId/localStorage bootstrap logic (both the lazy useState initializer AND the mount effect) unchanged verbatim.

// ---- src/modules/session/player.provider.tsx ----
'use client';
export function usePlayer(): PlayerContextType; // throws 'usePlayer must be used within a PlayerProvider' outside the provider
export function PlayerProvider({ children }: { children: React.ReactNode }): JSX.Element;

// ---- src/modules/game-board/game-board.engine.types.ts ----
import type { GameAction, GameState, Player } from '@/lib/types';

export type SetGameState = (currentState: GameState, action: GameAction, payload?: unknown) => Promise<void>;
export interface UseGameEngineResult {
  gameState: GameState | null;
  setGameState: SetGameState;
  isMyTurn: boolean;
  localPlayer: Player | null;
  isHost: boolean;
  isLoading: boolean;
  globallyRevealedTiles: Set<string>;
}

// ---- src/modules/game-board/services/game-board.engine.service.ts ----
import type { DeathAnimation, GameState } from '@/lib/types';

export interface GameStateSubscriptionCallbacks {
  onData: (state: GameState) => void;
  onMissing: () => void;
  onError: (error: unknown) => void;
}
/** Wraps onSnapshot(doc(db,'games',gameId), ...); returns the unsubscribe function. */
export function subscribeToGameState(gameId: string, callbacks: GameStateSubscriptionCallbacks): () => void;
export function saveGameState(gameId: string, state: GameState): Promise<void>; // wraps setDoc
export function clearDeathAnimations(gameId: string, remaining: DeathAnimation[]): Promise<void>; // wraps updateDoc({ deathAnimations: remaining })

// ---- src/modules/game-board/game-board.engine.hook.ts ----
export function useGameEngine(gameId: string, playerId: string | null): UseGameEngineResult;
// Body: same structure/memo deps/effects as use-game-engine.ts:10-153, with:
//   onSnapshot/doc/setDoc/updateDoc calls -> subscribeToGameState/saveGameState/clearDeathAnimations
//   useToast import -> '@/modules/shared'
//   setGameState's `payload: any` -> `payload: unknown` (forwarded to handleGameAction's own `payload?: unknown`, no cast needed)
//   death-animation filter `(a: any) => a.id !== anim.id` -> `(a: DeathAnimation) => a.id !== anim.id`
// If the resulting file exceeds 150 countable lines (unlikely — original was 124 countable, firestore wrapper
// lines move out), extract the death-animation cleanup effect (use-game-engine.ts:110-136) into a sibling
// `game-board.engine.death-animations.hook.ts`, mirroring the existing turn-timer.hook.ts extraction. Flag this
// to architect-b in the hand-off notes either way (confirm the actual line count).
```

## Phases
### Phase 1: Split and migrate
1. `src/modules/shared/toast-store.ts`, `use-toast.ts`, `use-is-mobile.ts`, `index.ts` edit (implementer-a, sonnet)
2. `src/modules/session/player.types.ts`, `player.hook.ts`, `services/player-session.service.ts`, `index.ts` edit (implementer-a, sonnet)
3. `src/modules/game-board/game-board.engine.types.ts`, `game-board.engine.hook.ts`, `services/game-board.engine.service.ts`, `index.ts` edit, `game-board.hook.ts` edit, `game-board.hook.types.ts` edit (implementer-a, sonnet)
4. Production call-site repoints owned by implementer-a: `AbilitiesDialog.hook.ts`, `Lobby.hook.ts`, `MapGrid.hook.ts` (implementer-a, sonnet)
5. `src/modules/session/player.provider.tsx` (implementer-b, sonnet)
6. Legacy/vendored wiring: `GameBoard.tsx`, `PlayerInfoBar.tsx`, `layout.tsx`, `page.tsx`, `toaster.tsx`, `sidebar.tsx` (implementer-b, sonnet)
7. Delete `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts`, `use-is-mobile.ts` (implementer-a, after step 4); delete `src/hooks/use-mobile.ts` (implementer-b, after step 6's `sidebar.tsx` edit)
8. `eslint.config.mjs`, `docs/README.md`, `docs/ai/refactor.md`, the 4 `.claude/skills/*.md` edits (implementer-b)
9. Logic tests: `toast-store.test.ts`, `use-toast.test.ts`, `use-is-mobile.test.ts`, `player.hook.test.ts`, `player-session.service.test.ts`, `game-board.engine.hook.test.ts`, `game-board.engine.service.test.ts`, plus the mock-path edits in `AbilitiesDialog.hook.test.ts`, `Lobby.hook.test.ts`, `MapGrid.hook.test.ts` (tester-a)
10. View tests: `player.provider.test.tsx`, plus the mock-path edits in `AbilitiesDialog.test.tsx`, `GameBoardContext.characterization.test.tsx`, `GameBoardContext.handlers.characterization.test.tsx`, `gameBoardTestKit.tsx` comment (tester-b)

Model escalation: all implementer-a and implementer-b steps (sonnet, per triage override — cross-module call sites). Tester steps stay on the pipeline's default model.

## Test plan
- tester-a (logic, first):
  - `toast-store.test.ts`: `ADD_TOAST` respects `TOAST_LIMIT` (3); `toast()` returns a no-op `{id:'',dismiss,update}` for an exact title/description/variant duplicate of an open toast; `DISMISS_TOAST` with no `toastId` dismisses all; `REMOVE_TOAST` with no `toastId` clears all.
  - `use-toast.test.ts`: `renderHook(() => useToast())`, call `toast(...)` outside the hook, assert the hook's state updates; unmount and assert the listener is removed (no further state updates after a post-unmount `toast()` call).
  - `use-is-mobile.test.ts`: mock `window.matchMedia`/`window.innerWidth`; assert `true` below 768px, `false` at/above; assert the `change` listener added on mount is removed on unmount.
  - `player.hook.test.ts`: mock `player-session.service`; `validateSession` match → `username` set; mismatch → `username` cleared and `localStorage` username removed; `setUsername` success (not taken) → reserves, persists, returns `true`; `setUsername` taken by another `playerId` → returns `false`, no reservation call; `setUsername` renaming → old username released; `logout` with a set username → releases and clears state; `beforeunload` with a stored username calls `logout`.
  - `player-session.service.test.ts`: mock `@/lib/firebase`; `findUsernameOwner` returns the stored `playerId` or `null` when the doc doesn't exist; `reserveUsername`/`releaseUsername` call `setDoc`/`deleteDoc` with the right doc ref.
  - `game-board.engine.service.test.ts`: mock `@/lib/firebase`; `subscribeToGameState` calls `onData` with the decoded doc, `onMissing` when `exists()` is false, `onError` on the snapshot error callback; `saveGameState` calls `setDoc`; `clearDeathAnimations` calls `updateDoc` with `{ deathAnimations: remaining }`.
  - `game-board.engine.hook.test.ts`: mock the service and `@/modules/shared`'s `useToast`/`@/modules/game-rules`; subscription data path sets `gameState`/`isLoading`; missing-doc path toasts and routes to `/`; not-in-game (`!isLoading && !localPlayer`) toasts and routes to `/` after the timeout; host + bot's turn + `status==='playing'` triggers `takeBotTurn` after 1000ms, non-host does not; host with a `deathAnimations` entry schedules `clearDeathAnimations` after the remaining time and only once per animation id.
- tester-b (view and e2e):
  - `player.provider.test.tsx`: `usePlayer()` called outside `PlayerProvider` throws the exact message; `PlayerProvider` renders `children` and a consumer reading `usePlayer()` sees the hook's value.
  - Repoint-only test files (`AbilitiesDialog.test.tsx`, both `GameBoardContext*.characterization.test.tsx`, `gameBoardTestKit.tsx`): no new cases, just confirm the suite still passes after the `jest.mock` path edit.
  - No e2e changes: no user-visible behavior moved.

## Preview states
None — no new or visually-changed component (triage confirmed: two hooks have no JSX, the toast store renders nothing itself, `PlayerProvider` has no visual change).

## Risks
- `game-board.engine.hook.ts` could land over 150 countable lines after the split if the death-animation effect doesn't shrink as expected — mitigation: the Contracts block's explicit fallback (extract to a sibling hook file) and the instruction to report the actual count to architect-b.
- `sidebar.tsx` is currently unused by the app (no importer found this session) — repointing it is still required because `tsc` type-checks the whole `**/*.tsx` glob regardless of usage; confirm with `grep -rn "components/ui/sidebar" src` excluding the file itself before and after the edit.
- Three `jest.mock('@/hooks/use-player')`/`jest.mock('@/hooks/use-toast')` calls move to module-path mocks in the same phase as the production import edit — if a test file's mock path and its corresponding hook's import path ever disagree, that test silently stops mocking and hits the real implementation; tester-a/b must grep their own edited test file for the old path string after editing, not just run the suite once.
- `src/modules/session/index.ts`'s `export { PlayerProvider, usePlayer } from './player.provider'` (File plan row, owner implementer-a, step 2) names a file implementer-b creates in step 5. Implementer-a's own commit will not typecheck in isolation until implementer-b's `player.provider.tsx` lands — same as any other case where two builders touch one phase. Do the `index.ts` export edit after both `player.hook.ts` and `player.provider.tsx` exist (end of step 5, not step 2), or run typecheck only once both implementers report done, not after implementer-a's step alone.

## Review (architect-b)
VERDICT: APPROVED

Re-ran the old-path grep (`grep -rn "hooks/use-game-engine\|hooks/use-player\|hooks/use-toast\|hooks/use-is-mobile\|hooks/use-mobile" .`, excluding `node_modules`) over the whole repo including `.claude/`, other tasks' `plan.md`/`review.md` files and `docs/`. Every production/test hit under `src/` is in the Call sites table and the File plan as fix; the historical task files (`docs/ai/tasks/2026-10-0{2,3}-*/plan.md`, `review.md`) are closed records of already-shipped phases, correctly left untouched. No invented path or symbol found; spot-checked `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts` line-by-line against every Verified-context and Contracts claim (signatures, line ranges, `any` locations) — all accurate. Confirmed `eslint.config.mjs`'s `LEGACY_PATHS`, `max-lines`, and `RESTRICTED_IMPORTS` rules, `game-board.provider.tsx`, `shared/index.ts`, `session/index.ts`, `lobby.service.ts`/`bot-turn.service.ts` (no `'use client'`), and `docs/README.md:29,51,391` citations.

Findings (folded in, no re-submission needed):
- `eslint.config.mjs` line citations were off: `LEGACY_PATHS`'s `'src/hooks/**'` is at line 15 (plan said 14), `max-lines` is at line 73 (plan said 68). Fixed in the Verified-context table and the File plan's `eslint.config.mjs` row.
- "`.hook.ts` files get the same three restrictions" was wrong: the `.hook.ts` file block (`eslint.config.mjs:88-96`) applies only `firestore` + `deepModuleImport`, not `legacyUi` — correctly so, since `.hook.ts` is the one file type CLAUDE.md allows to import `@/features/*`. Corrected the Verified-context row to state two restrictions and explain the exclusion; doesn't change any File plan or Contracts decision, since no `.hook.ts` file in this task imports `@/features/*`.
- Added a Risks note: `src/modules/session/index.ts`'s export of `PlayerProvider`/`usePlayer` from `./player.provider` (owned by implementer-a, step 2) names a file implementer-b creates in step 5. Not a design flaw — do the index export edit after both files exist, or run typecheck only once both implementers report, not after implementer-a's step alone.

Design: the three splits (toast store vs. hook; player types/hook/service/provider; engine hook/types/service) each have a concrete, checked reason (the 150-line cap, the `firestore` import restriction) rather than being speculative layering, and each follows an existing in-repo precedent (`game-board.provider.tsx`, `lobby.service.ts`). Domain placement (`shared/`, `session/`, `game-board/`) matches "used by 2+ modules with no single owner" / "already owns this concept" reasoning, not a new catch-all. Contracts give both implementers exact signatures and exact old-code-to-new-code mappings (including the two `any`→typed fixes), enough to build in parallel without clarifying questions. Test plan is logic-first per the `testing` skill. No preview correctly, since nothing renders differently.
