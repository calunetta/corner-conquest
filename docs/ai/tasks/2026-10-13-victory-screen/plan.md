# Plan: Victory screen with return-to-lobby

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
All ten original acceptance criteria plus the Error-state criterion in `ui-design.md`'s Final spec, EXCEPT the Error-state one is explicitly not built — see Decisions. Restated:
- [ ] `gameState.status === GameStatus.Finished` shows the dialog; board/header/map/log are not rendered.
- [ ] Local player is `gameState.winner`: title "Victory!", subtitle starts "You reached".
- [ ] Another player is `gameState.winner`: title "Game Over", subtitle contains that winner's name.
- [ ] Winner row shows the avatar for `winner.color` and text "{Color} Commander".
- [ ] `winner.isBot === true` shows a `BOT` badge; absent otherwise.
- [ ] Exactly one button, "Return to Lobby", `LogOut` icon.
- [ ] Pressing `Tab` once from dialog open moves focus to the "Return to Lobby" button (visible focus ring).
- [ ] Clicking it disables the button, swaps to "Returning…" + spinner, and eventually exits (via existing `onExit`).
- [ ] `Escape` / outside click does not close the dialog or navigate away.
- [ ] At 390×844 the dialog fits with no horizontal scroll, button ≥44px tall.
- [ ] A departing player's exit while `status === GameStatus.Finished` no longer runs pre-game splice/renumber/`handleEndTurn` logic against the finished match.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameStatus`, `GameState.winner: Player \| null` | `src/lib/types/game.ts:6-11,60` | gate + null-check for the dialog |
| `Player.playerId/color/isBot/name/victoryPoints` | `src/lib/types/player.ts:19-41` | dialog data; `PlayerColor` enum at `player.ts:5-10` |
| `GameBoard.tsx` status guard | `src/features/game/components/GameBoard.tsx:22-23,70` | board/map/log already unmount at `Finished`; only `GameDialogManager` renders in that gap (confirmed, `GameBoard.tsx:70`) |
| `GameDialogManager` | `src/features/game/components/GameDialogManager.tsx:1-39,65-83` | renders unconditionally; already destructures `gameState`, `localPlayer`, `uiState`, `handleConfirmExit` from `useGameBoard()`; already computes inline booleans the same way (`isProductiveDialogActive` line 42, `isViewingOwnCards` line 46) and imports `ConfirmExitDialog`/`HostLeaveDialog` from `@/modules/session` (line 25) |
| `GameBoardContextType.handleConfirmExit: () => Promise<void>`, `.uiState: GameBoardUIState` | `src/modules/game-board/game-board.types.ts:110,86` | exact prop types for the new branch |
| `GameBoardUIState.isExiting` | `src/modules/game-board/game-board.types.ts:27,49` | existing pending flag, no new state needed |
| `useSessionHandlers().handleConfirmExit` | `src/modules/game-board/game-board.session.hook.ts:30-42` | dispatches `SET_EXITING true/false` and always calls `onExit()` in `finally`; catches `handlePlayerExit` errors internally — the promise never rejects |
| `useSessionHandlers().handleExitClick` | `src/modules/game-board/game-board.session.hook.ts:56-69` | opens `HostLeaveDialog` for a host — wrong UX once `Finished`, so the button must call `handleConfirmExit` directly, not this |
| `handlePlayerExit` | `src/modules/game-rules/services/player-exit.service.ts:34-148` | catches internally (`145-147`), also never rejects; has `Playing` branch (`51-62`) and falls through to pre-game splice/renumber/`handleEndTurn` logic (`64-141`) for any other status, including `Finished` — this is the gap triage flagged |
| `ConfirmExitDialog.tsx`, `.types.ts`, `.styles.ts`, `index.ts`, `.test.tsx`, `.preview.tsx`, `.preview.test.tsx` | `src/modules/session/components/ConfirmExitDialog/*` | exact sibling pattern to copy: no `.hook.ts`, props-only component, legacy parent wires state; `AlertDialog open={true}` with no `onOpenChange` is a supported Radix usage (Root props are optional) |
| `HostLeaveDialog.styles.ts` `content` token | `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.styles.ts:2` | dialog surface class, copied verbatim |
| `Login.styles.ts` `title`/`iconWrap`/`icon`/`submitButton`/`submitIcon`/`loadingIcon` | `src/modules/session/components/Login/Login.styles.ts:5-7,13-15` | gold celebratory tokens + icon-swap class pattern, copied (icon loses `animate-spin [animation-duration:20s]`: Trophy is static) |
| `PlayerInfo.styles.ts` `botBadge`, `avatarContainer`/`avatarImage` (scaled), `playerRingColors` | `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts:17-21,31-32,36` | avatar ring + bot badge tokens; `playerRingColors`/`playerBorderColors`/`playerBgGlow` are defined here, not re-exported by `src/modules/hud/index.ts` (confirmed: `index.ts:1-6` has no such export) |
| `toPlayerIdleSprite` | `src/modules/shared/player-sprite.ts:11`, exported `src/modules/shared/index.ts` | resolves `winner.color` → sprite path, used in the map function |
| `cn` | `@/lib/utils` | class merging |
| `ComponentPreview`/`PreviewState` | `src/testbed/testbed.types.ts:10-17` | preview contract |
| `src/testbed/registry.ts:32-33,78-79` | registry import/array pattern for `confirmExitDialogPreview`/`hostLeaveDialogPreview` | same pattern for the new preview |
| `player-exit.service.test.ts` mocking pattern | `src/modules/game-rules/services/player-exit.service.test.ts:1-35` | `jest.mock('@/lib/firebase', ...)`, `stubTransaction` helper — reuse for the new branch's tests |
| `docs/architecture/systems-and-visuals.md:86-92` | §6.12 "Match Dismantling Rules" | doc section to extend with the new `Finished` case |
| Capitalization convention | e.g. `MonsterSelectionDialog.styles.ts:15` (`capitalize` Tailwind class on a lowercase domain string) | reused instead of writing a JS capitalize helper (none exists in `@/lib/utils`) |

## Decisions
- New component at `src/modules/session/components/VictoryDialog/`, because `session` already owns the other end-of-match exit dialogs (`ConfirmExitDialog`, `HostLeaveDialog`) and this screen's one action is the same "leave the match" flow. Rejected: a new `victory`/`endgame` module (no second component to justify a new domain).
- No `.hook.ts`, no `NameView`/`Name` split: `VictoryDialog` takes every value as a prop (`winner`, `isLocalWinner`, `isExiting`, `onReturnToLobby`), exactly like `ConfirmExitDialog`/`HostLeaveDialog` — it reads no app state itself. `GameDialogManager.tsx` (legacy, already holds `useGameBoard()`'s values) computes `isLocalWinner` inline, the same way it already computes `isProductiveDialogActive`/`isViewingOwnCards` (`GameDialogManager.tsx:42,46`). Rejected: a connected/pure split (component-architecture reserves this for when the component's own hook reads app state; there is no such hook here).
- Button calls `handleConfirmExit` directly, not `handleExitClick`. `handleExitClick` branches to open `HostLeaveDialog` for a host (`game-board.session.hook.ts:59-61`) — a "host departure" warning that makes no sense once the match already ended; every player, host or not, should return to the lobby the same one-click way. Rejected: reusing `handleExitClick` (would stack `HostLeaveDialog` on top of the victory screen for host players).
- Error state from the ui-design Final spec is **not implemented**. `handleConfirmExit` (`game-board.session.hook.ts:30-42`) and `handlePlayerExit` (`player-exit.service.ts:145-147`) both swallow errors internally; `handleConfirmExit`'s `finally` always resets `isExiting` and calls `onExit()`. Its returned promise never rejects, so the button can never get stuck and the failure branch is dead code — true for every existing caller of `handleConfirmExit` too (`ConfirmExitDialog`, `HostLeaveDialog`), so this is existing app-wide behavior, not a regression introduced here. Rejected: changing `handleConfirmExit`/`handlePlayerExit` to rethrow so the branch becomes reachable (bigger change touching two other dialogs' exit paths, out of proportion to this tier-M task).
- `player-exit.service.ts` gets a new `GameStatus.Finished` branch in the transaction, placed right after the existing `Playing` branch (currently returns at line 62), before the pre-game fallback: delete the doc if no real players remain, otherwise no-op. Today, `Finished` falls into the pre-game branch (`64-141`) and runs splice/renumber/`baseTiles`/map/combat reference shifts and `handleEndTurn` — all pre-game semantics with no purpose once the match is over, and would live-push an unnecessary document mutation to every other client still looking at their own victory screen. Rejected: routing `Finished` through the `Playing` (bot-conversion) branch (leaves a pointless bot seat on a dead match); leaving the fallback as-is (the bug triage flagged).
- Commander line text stays lowercase from data (`"${winner.color} Commander"`) and gets Tailwind's `capitalize` class in `.styles.ts`, matching the existing convention (`MonsterSelectionDialog.styles.ts:15`, `PositionDialog.styles.ts:15`) instead of writing a one-off JS capitalize helper.
- Trophy icon is static (`h-8 w-8 text-amber-400`, no `animate-spin`), per ui-design's instruction to swap the spinning `Compass` for a static `Trophy`.
- Initial focus relies on Radix `AlertDialogContent`'s default auto-focus of the first focusable element (the one button) — no manual `autoFocus`, matching every other dialog in the codebase (none sets it manually).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/session/components/VictoryDialog/VictoryDialog.types.ts` | new | `VictoryDialogProps` | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.map.ts` | new | `toVictoryViewModel`: winner + isLocalWinner → copy/sprite view model | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.map.test.ts` | new | tests for `toVictoryViewModel` | tester-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.fixtures.ts` | new | sample human/bot winner `Player`s | implementer-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.styles.ts` | new | class tokens (listed in Contracts) | implementer-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.tsx` | new | presentational dialog (props only, no hook) | implementer-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.test.tsx` | new | view tests | tester-b |
| `src/modules/session/components/VictoryDialog/VictoryDialog.preview.tsx` | new | 4 testbed states | preview-a |
| `src/modules/session/components/VictoryDialog/VictoryDialog.preview.test.tsx` | new | smoke test over preview states | tester-b |
| `src/modules/session/components/VictoryDialog/index.ts` | new | public API: `VictoryDialog`, `VictoryDialogProps` | implementer-a |
| `src/modules/session/index.ts` | edit | export `VictoryDialog` | implementer-a |
| `src/modules/hud/index.ts` | edit | export `playerRingColors` (needed outside `hud`, not currently exported) | implementer-a |
| `src/features/game/components/GameDialogManager.tsx` | edit | import `VictoryDialog`, add status-gated branch, compute `isLocalWinner` inline | implementer-b |
| `src/modules/game-rules/services/player-exit.service.ts` | edit | add `GameStatus.Finished` branch (delete-if-empty else no-op) | implementer-a |
| `src/modules/game-rules/services/player-exit.service.test.ts` | edit | tests for the new branch | tester-a |
| `src/testbed/registry.ts` | edit | register `victoryDialogPreview` | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | §6.12: document the `Finished` case | docs-sync |

## Contracts
```ts
// VictoryDialog.types.ts
import type { Player } from '@/lib/types';

export interface VictoryDialogProps {
  winner: Player;
  isLocalWinner: boolean;
  /** Mirrors GameBoardUIState.isExiting; true while handleConfirmExit's promise is pending. */
  isExiting: boolean;
  onReturnToLobby: () => void;
}

// VictoryDialog.map.ts
import type { Player, PlayerColor } from '@/lib/types';

export interface VictoryViewModel {
  title: 'Victory!' | 'Game Over';
  subtitle: string;
  /** e.g. "blue Commander" — rendered with the `capitalize` Tailwind class, not title-cased here. */
  commanderLine: string;
  spriteSrc: string;
  color: PlayerColor;
  isBot: boolean;
}

/** Pure: no React, no I/O. `toPlayerIdleSprite` (from `@/modules/shared`) is a pure table lookup. */
export function toVictoryViewModel(winner: Player, isLocalWinner: boolean): VictoryViewModel;
// title: isLocalWinner ? 'Victory!' : 'Game Over'
// subtitle: isLocalWinner
//   ? `You reached ${winner.victoryPoints} Victory Points and conquered the archipelago.`
//   : `${winner.name} reached ${winner.victoryPoints} Victory Points and conquered the archipelago.`
// commanderLine: `${winner.color} Commander`
// spriteSrc: toPlayerIdleSprite(winner.color)
// color: winner.color
// isBot: winner.isBot

// VictoryDialog.styles.ts — exact classes, no deviation
export const styles = {
  content: 'bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden',
  iconWrap: 'mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/30 shadow-inner',
  icon: 'h-8 w-8 text-amber-400',
  title: 'text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent text-center',
  subtitle: 'text-xs sm:text-sm text-muted-foreground text-center',
  winnerRow: 'flex items-center gap-3 justify-center py-2',
  avatarContainer: 'relative h-16 w-16 shrink-0 rounded-xl bg-black/50 p-0.5 border border-white/15 overflow-hidden flex items-center justify-center ring-2',
  avatarImage: 'object-contain',
  winnerInfo: 'flex flex-col gap-0.5 items-start',
  winnerNameRow: 'flex items-center gap-1.5',
  winnerName: 'text-lg font-extrabold text-foreground tracking-tight',
  commanderLine: 'text-xs text-muted-foreground capitalize',
  botBadge: 'text-[9px] px-1 py-0 h-4 bg-white/10 text-muted-foreground font-semibold',
  footer: 'pt-2',
  returnButton: 'w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] py-5',
  buttonIcon: 'mr-2 h-4 w-4',
  loadingIcon: 'mr-2 h-4 w-4 animate-spin',
} as const;

// VictoryDialog.tsx — component shape (no .hook.ts)
// export function VictoryDialog({ winner, isLocalWinner, isExiting, onReturnToLobby }: VictoryDialogProps): JSX.Element
// - <AlertDialog open={true}> (no onOpenChange — Escape/outside click are no-ops, matching ui-design)
// - Trophy icon (static), AlertDialogTitle = vm.title, AlertDialogDescription = vm.subtitle
// - winner row: next/image unoptimized, src=vm.spriteSrc, alt={`${vm.color} player`}, wrapped in
//   cn(styles.avatarContainer, playerRingColors[vm.color]) — playerRingColors imported from '@/modules/hud'
// - winner.name text + Badge "BOT" (variant="secondary") when vm.isBot, + commanderLine text
// - exactly one Button: disabled={isExiting}, onClick={onReturnToLobby}
//   - isExiting ? (<Loader2 className={cn(styles.loadingIcon)} />, 'Returning…')
//              : (<LogOut className={styles.buttonIcon} />, 'Return to Lobby')

// VictoryDialog.fixtures.ts
export const humanWinner: Player; // isBot: false, color: 'blue', victoryPoints: 20, name: 'Blue Commander' or similar
export const botWinner: Player;   // isBot: true, color: 'red'

// src/modules/hud/index.ts — add one line
export { playerRingColors } from './components/PlayerInfo/PlayerInfo.styles';

// GameDialogManager.tsx — add to the destructure from useGameBoard(): nothing new (gameState,
// localPlayer, uiState, handleConfirmExit already destructured). Add import:
import { ConfirmExitDialog, HostLeaveDialog, VictoryDialog } from '@/modules/session';
import { GameAction, GameStatus, ResourceType } from '@/lib/types'; // add GameStatus
// Add branch (placement: anywhere in the returned fragment, e.g. right after the opening <>):
{gameState.status === GameStatus.Finished && gameState.winner && (
  <VictoryDialog
    winner={gameState.winner}
    isLocalWinner={gameState.winner.playerId === localPlayer.playerId}
    isExiting={uiState.isExiting}
    onReturnToLobby={handleConfirmExit}
  />
)}

// player-exit.service.ts — inside the existing runTransaction callback, immediately after the
// `if (currentState.status === GameStatus.Playing) { ... return; }` block (ends at line 62) and
// before `const isHost = playerIndex === 0;` (currently line 64):
if (currentState.status === GameStatus.Finished) {
  if (remainingRealPlayers.length === 0) {
    transaction.delete(gameDocRef);
  }
  return;
}
```

## Phases
### Phase 1: Victory dialog + finished-exit fix
1. implementer-a: `VictoryDialog.types.ts`, `VictoryDialog.map.ts`, `VictoryDialog.fixtures.ts`, `VictoryDialog/index.ts`, `src/modules/session/index.ts` edit, `src/modules/hud/index.ts` edit.
2. implementer-a: `player-exit.service.ts` edit (the `Finished` branch above).
3. implementer-b (needs sonnet: touches the legacy `GameDialogManager.tsx` and the full dialog view against ui-design's token list): `VictoryDialog.styles.ts`, `VictoryDialog.tsx`, `GameDialogManager.tsx` edit.
4. tester-a: `VictoryDialog.map.test.ts`; `player-exit.service.test.ts` additions.
5. tester-b: `VictoryDialog.test.tsx`, `VictoryDialog.preview.test.tsx`.
6. preview-a: `VictoryDialog.preview.tsx`, `src/testbed/registry.ts` edit.
7. preview-b: `ui-verify` browser check of all 4 preview states at 1280×720 and 390×844 (screenshot evidence for the acceptance criteria above, including that `Tab` from page load lands on "Return to Lobby" with a visible ring, and that each state's "Close preview"/"Reopen dialog" wrapper actually works, per testbed-preview's mandatory rule).
8. docs-sync: `docs/architecture/systems-and-visuals.md` §6.12 — add the `Finished` case.
9. Run `npm run typecheck`, `npm run lint`, `npm test` on every touched file (not scoped).
10. Commit: `feat(session): add victory screen with return-to-lobby [phase 1/1]`.

Model escalation: step 3 (implementer-b) — sonnet, per triage tier M with a new player-facing component against a detailed token spec plus legacy-file wiring.

## Test plan
- tester-a (logic, first):
  - `toVictoryViewModel`: local winner → title `'Victory!'`, subtitle starts `'You reached'` and contains `victoryPoints`; other winner → title `'Game Over'`, subtitle contains `winner.name`; `commanderLine` is `"${color} Commander"`; `spriteSrc` equals `toPlayerIdleSprite(color)` for at least two colors; `isBot` passes through both `true` and `false`.
  - `player-exit.service.ts`, reusing the `stubTransaction` helper (`player-exit.service.test.ts:1-35`): `status: GameStatus.Finished`, `remainingRealPlayers.length === 0` → `transaction.delete` called, `transaction.set` not called; `status: GameStatus.Finished` with other real players remaining → neither `delete` nor `set` called (no-op), and the player's own entry is untouched (`currentState.players` unchanged — assert via the fake transaction never receiving a `set`).
- tester-b (view and preview):
  - Local winner: renders `'Victory!'` and text starting `'You reached'`.
  - Other winner: renders `'Game Over'` and the winner's name.
  - `isBot: true` renders the `BOT` badge; `isBot: false` does not.
  - Exactly one button, name `'Return to Lobby'`.
  - The "Return to Lobby" button is the dialog's initial focus target (Radix `AlertDialogContent`'s default auto-focus, per the Decisions note) — assert it has focus right after render (`toHaveFocus()`), covering the ui-design Tab-focus acceptance criterion without simulating a real `Tab` keypress.
  - Clicking the button calls `onReturnToLobby` once.
  - `isExiting: true`: button is disabled, label is `'Returning…'`, `onReturnToLobby` is not called by a second click while disabled.
  - Pressing `Escape` leaves the title still in the document (dialog does not close).
  - `VictoryDialog.preview.test.tsx`: renders each of the 4 states and asserts each one's distinguishing text is present (mirrors `ConfirmExitDialog.preview.test.tsx`'s pattern).

## Preview states
- `VictoryDialog`: "You won" (`humanWinner`, `isLocalWinner: true`, `isExiting: false`), "Opponent won" (`humanWinner`, `isLocalWinner: false`), "Bot winner" (`botWinner`, `isLocalWinner: false`), "Returning" (`humanWinner`, `isLocalWinner: true`, `isExiting: true`) — all fixtures from `VictoryDialog.fixtures.ts`.
- `VictoryDialogProps` has no `onClose`/`onOpenChange` (by design — Decisions). Per skill `testbed-preview`'s mandatory rule for a dialog phase with no internal close control, every state's wrapper must still give the viewer a way out: hold `isOpen` in `useState` in `VictoryDialog.preview.tsx` and conditionally render `<VictoryDialog>` only while `isOpen`, plus an always-present `fixed top-4 right-4 z-[60] pointer-events-auto` "Close preview" button that sets `isOpen` to `false`, and a "Reopen dialog" button when closed — same shape as `CombatDialog.preview.tsx`'s rolling-phase wrapper, except the toggle lives in the preview only (no `onClose` prop to forward, since `VictoryDialog` takes none).

## Risks
- `GameDialogManager.tsx` renders unconditionally regardless of status (verified, ui-design review), so if any reducer ever leaves `combatState`/`monsterCombatState` non-null at the same moment it sets `Finished`, `CombatDialog`/`MonsterCombatDialog` could render alongside `VictoryDialog`. All four reducers that set `Finished` were verified by ui-designer-b to clear/not-depend on those states in the same assignment; no fix planned here — pre-existing behavior, out of this task's scope.
- `src/modules/hud/index.ts` newly exports `playerRingColors`; confirm no naming collision with an existing export from that module (checked: `index.ts:1-6` has no such name).

## Review (architect-b)
VERDICT: APPROVED

Verified in this session (Glob/Grep/Read against the actual repo, not the plan's prose): `GameStatus`/`Player` fields (`src/lib/types/game.ts:6-11,47-69`, `src/lib/types/player.ts:5-50`); `GameBoard.tsx:22-23` status guard and its render of `<GameDialogManager />`; `GameDialogManager.tsx:29-39,42,46` destructure and inline-boolean pattern, its `@/modules/session` import at line 25; `game-board.types.ts:27,49,85-86,109-110` (`isExiting`, `uiState`, `handleConfirmExit`); `game-board.session.hook.ts:30-42,56-69` (`handleConfirmExit` never rejects — `try`/`catch`/`finally` with no rethrow — and `handleExitClick`'s host branch); `player-exit.service.ts:34-148`, confirming the `Playing` branch ends at line 62 and `const isHost` is line 64, so the new `Finished` branch's insertion point is exactly where the plan says; all four reducers' `winner`/`status` same-assignment lines (`combat-player-resolve.reducer.ts:112-113`, `combat-monster-resolve.reducer.ts:107-108`, `island-discovery.reducer.ts:27-28`, `player-turn.reducer.ts:100-101`); every quoted class string in `ConfirmExitDialog.styles.ts`/`HostLeaveDialog.styles.ts`/`Login.styles.ts`/`PlayerInfo.styles.ts`; `playerRingColors` (`PlayerInfo.styles.ts:17-21`) absent from `hud/index.ts`'s current exports (no collision); `toPlayerIdleSprite` (`shared/player-sprite.ts:11`, re-exported `shared/index.ts:1`); `registry.ts:32-33,78-79` import/array pattern; `player-exit.service.test.ts:1-35` mocking/`stubTransaction` pattern; `systems-and-visuals.md:86-91` §6.12 "Match Dismantling Rules" (ends right before §6.13 at line 94); `@radix-ui/react-dialog`'s `.d.ts` confirms `onOpenChange?(open: boolean): void` is optional, so `open={true}` with no `onOpenChange` is valid Radix usage as claimed. No invented path or symbol found; the design (reuse `session`'s dialog pattern, no `.hook.ts`/`NameView` split, button calls `handleConfirmExit` directly, new `Finished` branch in `player-exit.service.ts`, Error state cut) is the simplest correct option and matches `kiss-dry-solid`/`component-architecture`.

Findings, folded in directly (additive, no design change — see the diff above this section):
- `GameBoard.tsx:116` doesn't exist (file is 113 lines; `<GameDialogManager />` is at line 70). Fixed the citation in Verified context.
- The restated acceptance criteria (Goal section) silently dropped ui-design's Tab-focus criterion ("Pressing Tab once from dialog open moves focus to the button, visible ring") while the prose claimed "all ten original ... criteria" were kept — only the Error-state drop was called out. Restored the bullet, and added a `toHaveFocus()` assertion to tester-b's test plan so it's actually covered (a real `Tab` keypress isn't needed to verify this; RTL has no reliable `Tab` simulation without `user-event`, which isn't installed per `CLAUDE.md`).
- `VictoryDialogProps` has no `onClose`/`onOpenChange` by design (Decisions: "Escape/outside click are no-ops"), which means `VictoryDialog.preview.tsx` would otherwise ship a dialog state with zero way out of it — exactly the bug `docs/ai/lessons-learned.md` (lines 124-125) and skill `testbed-preview`'s mandatory rule both already name. The plan's Preview states section didn't mention the required wrapper. Added it (mount/unmount the component from preview-local `useState`, not a forwarded `onClose`, since the component takes none — same shape as `CombatDialog.preview.tsx`), and told preview-b to verify the close/reopen toggle and the Tab-focus ring in the browser, not just screenshot the open state.

No other gaps: File plan owners don't overlap, implementer-a/b's phase-1 split has no shared-file collision, contracts are typed and copy-exact, test plan covers logic before view per `testing`, the `player-exit.service.ts` fix is scoped to the exact gap triage/ui-design flagged and doesn't touch the `Playing` branch, and the docs-sync target section exists and is the right one to extend.

## Review (architect-b) — final review

VERDICT: APPROVED

Scope: `src/modules/session/components/VictoryDialog/*`, `src/features/game/components/GameDialogManager.tsx`, `src/modules/game-rules/services/player-exit.service.ts`/`.test.ts`, `src/modules/session/index.ts`, `src/modules/hud/index.ts`, `src/testbed/registry.ts`, `docs/architecture/systems-and-visuals.md`/`game-mechanics.md`/`structure-and-state.md`.

Checks run this session:
- `npm run typecheck` → clean (`tsc --noEmit`, no output).
- `npx jest src/modules/session/components/VictoryDialog/ src/modules/game-rules/services/player-exit.service.test.ts` → `Test Suites: 10 passed, 10 total`, `Tests: 298 passed, 298 total`.
- Did not run repo-wide `npm test`/`npm run lint` per task instructions (unrelated pre-existing failures elsewhere in the working tree).

Both defects fixed correctly, verified by reading the current files:
1. `VictoryDialog.tsx:25,29-36,71` — `useRef<HTMLButtonElement>`, `onOpenAutoFocus` calls `event.preventDefault()` then `returnButtonRef.current?.focus()`, ref passed to `Button`. `src/components/ui/button.tsx:43` confirms `Button` is `React.forwardRef<HTMLButtonElement, ButtonProps>`, so the ref reaches the real DOM button — Liskov-correct forwarding. `VictoryDialog.test.tsx:77-81` asserts `toHaveFocus()` via `waitFor`, matching plan's test-plan item; passes.
2. `VictoryDialog.styles.ts:16` — `returnButton` now has `h-11` alongside the original `py-5` (44px against `Button`'s default `h-10`/40px), matching the contract's token list plus the fix.

Diff vs. plan contracts: `VictoryDialog.types.ts`, `.map.ts`, `.fixtures.ts`, `.styles.ts` (all other tokens byte-for-byte), `.tsx` component shape (`AlertDialog open={true}`, no `onOpenChange`, Trophy static icon, winner row with `playerRingColors[vm.color]` ring, Badge "BOT" gated on `vm.isBot`, exactly one Button with the exact disabled/label swap) all match the contracts block verbatim. `GameDialogManager.tsx` diff matches the contract's branch exactly (`gameState.status === GameStatus.Finished && gameState.winner`, `isLocalWinner` computed inline, `onReturnToLobby={handleConfirmExit}`). `player-exit.service.ts` diff matches the contract's `Finished` branch exactly, inserted at the documented point (right after the `Playing` block's `return` at line 62, before `const isHost = playerIndex === 0` at line 64) — confirmed by reading the diff hunk directly.

Tests: `VictoryDialog.map.test.ts` (17 tests incl. a no-mutation check), `.test.tsx` (11 tests incl. Escape-no-op, disabled-ignores-click, single-button-name), `.preview.test.tsx` (5 tests incl. close/reopen) all present and cover the plan's test-plan items. `player-exit.service.test.ts`'s new `describe('finished …')` block covers all four plan-specified cases (delete when 0 real players remain across two scenarios, no-op with real players remaining, and that `game.players` is untouched — using a pre-call snapshot per the `testing` skill's rule against same-reference comparison).

`index.ts`/`hud/index.ts`/`session/index.ts`/`registry.ts` edits are exactly the one-line additions the contract specifies; `registry.ts` also carries an unrelated `resourceCollectionFeedbackDemoPreview` import/entry from other in-flight work, correctly left untouched (out of this task's scope, not evaluated further).

Docs: `systems-and-visuals.md` §6.12 gets the new "Leaving a Finished Match" bullet, worded correctly against `player-exit.service.ts`'s new branch, and "Writes: Both paths" → "Every path" is a correct generalization now that there are three. `structure-and-state.md` §2 adds `VictoryDialog (§5.1)` to the `session/components/` list, correct cross-reference. `game-mechanics.md` gets a new "**Victory screen.**" paragraph in §5.1 whose claims were checked against code: `GameBoard.tsx:22` (`gameState.status !== 'finished'` gate around header/board/map/log, confirmed by reading the file) and the `GameDialogManager.tsx`/`player-exit.service.ts` diffs above. That file's diff also contains substantial unrelated rewrites (§5.0, §5.2, §5.3, §6.1) present in the working tree before this task's session started (per the conversation's initial `gitStatus` snapshot) — not evaluated as part of this task's scope; only the victory-screen-specific paragraph and its cross-reference were checked.

No findings. File plan's `docs-sync` row only lists `systems-and-visuals.md`, but `docs-sync`'s actual edits (per `progress.md`'s Log) additionally touched one paragraph each in `game-mechanics.md` and `structure-and-state.md` to keep the architecture docs true per CLAUDE.md principle 6 — a reasonable, correctly-scoped deviation, not a defect.
