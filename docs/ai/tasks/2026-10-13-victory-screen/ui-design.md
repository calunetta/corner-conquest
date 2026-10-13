# UI design: Victory screen with return-to-lobby

## Spec (ui-designer-a)

### Purpose and user story
As any player in a finished match, I want a clear end-of-game screen naming the winner so that I know the match is over, and a one-click way back to the lobby so that I can start another game.

### Placement and layout
`GameBoard.tsx:23` already wraps the header, map, HUD and log in `{gameState.status !== 'finished' && (...)}` — once the match finishes, those are unmounted and only the root container's gradient background remains (`GameBoard.tsx:22`, `bg-gradient-to-b from-background via-background/95 to-black/90`). The victory screen fills that gap. It renders as a new branch in `GameDialogManager.tsx` (which already composes every other game dialog), gated on `gameState.status === GameStatus.Finished` (`src/lib/types/game.ts:6-11`).

Reuse the `AlertDialog` pattern already used for `ConfirmExitDialog` and `HostLeaveDialog` (`src/modules/session/components/HostLeaveDialog/HostLeaveDialog.tsx:19-20`, both `open={true}`/controlled `open` prop, no outside-click dismissal): this gets focus trap, built-in `animate-in`/`zoom-in-95` entrance (`src/components/ui/alert-dialog.tsx:21,39`), and `role="alertdialog"` for free, so no new visual pattern is introduced.

- **Desktop (1280×720):** `AlertDialogContent` centered via its own fixed/translate positioning (`src/components/ui/alert-dialog.tsx:39`), `max-w-md` (same cap as `HostLeaveDialog.styles.ts` `content`). Sits above the gradient background; no other board chrome is present to layer against.
- **Mobile (390×844):** Same component; `AlertDialogContent` is already responsive (`w-full` under its `max-w-md` cap, with the dialog primitive's own viewport padding). The board and map are already unmounted at this status on every breakpoint (`GameBoard.tsx:23`), so there is no map grid to keep visible — this is the one screen exempt from that mobile rule, because the match is over, not because of a HUD overlap decision made here.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Hidden | Nothing (dialog not rendered) | `gameState.status !== GameStatus.Finished` |
| Default — local player won | Trophy icon, title "Victory!", subtitle "You reached {winner.victoryPoints} Victory Points and conquered the archipelago.", winner row (avatar, name, color), "Return to Lobby" button | `gameState.status === GameStatus.Finished && winner.playerId === localPlayer.playerId` |
| Default — someone else won | Same layout, title "Game Over", subtitle "{winner.name} reached {winner.victoryPoints} Victory Points and conquered the archipelago." | `gameState.status === GameStatus.Finished && winner.playerId !== localPlayer.playerId` |
| Winner is a bot | Adds a `BOT` badge next to the winner's name (same badge used in `PlayerInfo.tsx:48-50`, token `botBadge` from `PlayerInfo.styles.ts`) | `winner.isBot === true` |
| Button pressed / exiting | Button shows spinner + "Returning…", disabled, so a double-click or a slow exit cleanup can't be triggered twice | `onClick` fired, resolves when `onExit` (or whatever exit call architect-a specifies) completes |
| Focus | Visible ring on the "Return to Lobby" button when tabbed to; it is the only interactive element, so it is also the dialog's initial focus target | Keyboard `Tab`/dialog auto-focus |

No loading/empty/error state: `winner` is guaranteed non-null the instant `status` flips to `Finished` (every reducer that sets `state.status = GameStatus.Finished` sets `state.winner` in the same assignment — verified in `combat-player-resolve.reducer.ts:111-113`, `combat-monster-resolve.reducer.ts:106-108`, `island-discovery.reducer.ts:26-28`, `player-turn.reducer.ts:99-101` — so there is no draw/no-winner case to design for).

### Components and tokens
Reuse only; verified paths:
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter` — `src/components/ui/alert-dialog.tsx`, used exactly this way by `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.tsx:8-20` and `ConfirmExitDialog.tsx:3-13`.
- `Button` — `src/components/ui/button.tsx`.
- `Badge` (BOT badge) — `src/components/ui/badge.tsx`, styled with `PlayerInfo.styles.ts` `botBadge` token (`'text-[9px] px-1 py-0 h-4 bg-white/10 text-muted-foreground font-semibold'`).
- `next/image`, `unoptimized`, for the winner's avatar sprite — same usage as `PlayerInfo.tsx:28-36`.
- `toPlayerIdleSprite(winner.color)` — `src/modules/shared/player-sprite.ts:11`, exported from `src/modules/shared/index.ts:1` — resolves the avatar GIF path.
- `playerRingColors[winner.color]` / `playerBorderColors[winner.color]` — `src/modules/hud/components/PlayerInfo/PlayerInfo.styles.ts:3-20` — ring/border around the avatar, matching the per-color treatment already used on `PlayerInfo`.
- Icons from `lucide-react` (already a dependency, already imported this way elsewhere): `Trophy` (`PlayerInfo.tsx:8`), `LogOut` (`HostLeaveDialog.tsx:2`, `ConfirmExitDialog.tsx:2`), `Loader2` (`Login.tsx:3`, `GameBoard.tsx:4`).

Tokens (no new ones; copied from the two closest existing patterns — `HostLeaveDialog.styles.ts` for dialog chrome, `Login.styles.ts` for the celebratory gold treatment):
- Dialog surface: `bg-background/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_72px_rgba(0,0,0,0.85)] max-w-md overflow-hidden` (`HostLeaveDialog.styles.ts` `content`).
- Title: `text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent` (`Login.styles.ts` `title`) — used for both "Victory!" and "Game Over", gradient reads fine on either string.
- Subtitle: `text-xs sm:text-sm text-muted-foreground` (`Login.styles.ts` `description`).
- Trophy icon wrap: `mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/30 shadow-inner` with icon `h-8 w-8 text-amber-400` (`Login.styles.ts` `iconWrap`/`icon`, swap the spinning `Compass` for a static `Trophy`).
- Winner avatar ring container: `relative h-16 w-16 shrink-0 rounded-xl bg-black/50 p-0.5 border border-white/15 overflow-hidden flex items-center justify-center ring-2` (scaled up from `PlayerInfo.styles.ts` `avatarContainer`, `h-9 w-9` → `h-16 w-16` for a hero moment) + `playerRingColors[winner.color]`.
- Winner name: `text-lg font-extrabold text-foreground tracking-tight` (scaled from `PlayerInfo.styles.ts` `nameText`).
- Primary button ("Return to Lobby"): `w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] py-5` (`Login.styles.ts` `submitButton`) — the one call-to-action on the screen gets the same gold "primary path forward" treatment Login gives "Enter Lobby".

### Copy
- Title (local player won): `Victory!`
- Title (anyone else won): `Game Over`
- Subtitle (local player won): `You reached {victoryPoints} Victory Points and conquered the archipelago.`
- Subtitle (anyone else won): `{name} reached {victoryPoints} Victory Points and conquered the archipelago.`
- Winner row secondary line: `{Color} Commander` (e.g. "Blue Commander" — matches the existing tooltip copy pattern in `PlayerInfo.tsx:58`, `"{name} ({color} commander)"`).
- Bot badge text: `BOT` (reuses the exact badge already shown elsewhere, `PlayerInfo.tsx:48-50`).
- Button default: `Return to Lobby`, icon `LogOut` to its left.
- Button pending: `Returning…`, icon `Loader2` (`animate-spin`) replacing `LogOut`, same icon-swap pattern as `Login.tsx:97-101`.

### Interactions and motion
- Dialog mounts the instant `gameState.status` becomes `GameStatus.Finished`; no manual trigger.
- Entrance/exit animation: inherited for free from `AlertDialogContent` (`data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`, `src/components/ui/alert-dialog.tsx:39`) — no bespoke animation to write. `tailwindcss-animate`'s `animate-in` utilities respect `prefers-reduced-motion` only insofar as Tailwind's base does **not** auto-disable them; since every other dialog in the app already uses this primitive unconditionally (`HostLeaveDialog`, `ConfirmExitDialog`, `CombatDialog`, etc.), this is consistent with current app-wide behavior, not a regression introduced here.
- `onOpenChange` is a no-op (pass a handler that does nothing, or omit it if the primitive tolerates an uncontrolled no-close): there is nothing to cancel back to, and unlike `ConfirmExitDialog`/`HostLeaveDialog` this dialog has no "stay/cancel" action — only "Return to Lobby" moves the player forward. Escape and overlay click do nothing; Radix `AlertDialog` does not close on outside click by default, matching this.
- Clicking/tapping "Return to Lobby" (or pressing `Enter`/`Space` while it has focus) calls the exit path architect-a specifies (triage.md names the existing `onExit` prop → `page.tsx:handleExitGame`, reused rather than reimplemented). Button disables and switches to the pending label/icon for the duration of that call so a second click can't double-fire it.
- Initial focus lands on the "Return to Lobby" button (it is the only focusable element besides the dialog's own close affordance, which this dialog does not have) so a keyboard/controller player can act immediately with `Enter`.

### Accessibility
- `AlertDialog`'s Radix primitive already provides `role="alertdialog"`, focus trap, and labelling via `AlertDialogTitle`/`AlertDialogDescription` (`aria-labelledby`/`aria-describedby` wired automatically) — verified usage pattern in `HostLeaveDialog.tsx:21-30`.
- Winner's color is never the only signal: the name, the "{Color} Commander" line, and (for bots) the `BOT` badge all carry the same information as text, not just the ring/border color.
- Avatar `next/image` gets `alt="{color} player"` matching `PlayerInfo.tsx:31` convention (not decorative — it is the one piece of imagery identifying the winner).
- Title-gradient text on `bg-background/90`: the existing Login title using this exact gradient class is the app's own precedent for acceptable contrast on this background; no new combination introduced.
- Button is a real `<button>` via shadcn `Button`, so it's reachable by `Tab` and activates on `Enter`/`Space` with the default visible `focus-visible:ring-2 focus-visible:ring-ring` shadcn already applies.
- Motion: the only animation is the shared `AlertDialogContent` entrance, already used unconditionally app-wide; no new motion to gate behind `prefers-reduced-motion` here.

### Acceptance criteria
- [ ] When `gameState.status` is `GameStatus.Finished`, the dialog is visible and the board/header/map/log from `GameBoard.tsx:23` are not rendered (screenshot: only the dialog and the gradient background are visible).
- [ ] When the local player is `gameState.winner`, the title reads "Victory!" and the subtitle starts with "You reached".
- [ ] When another player is `gameState.winner`, the title reads "Game Over" and the subtitle contains that winner's name.
- [ ] The winner row shows an avatar matching `winner.color` (same sprite source as `PlayerInfo` for that color) and the text "{Color} Commander".
- [ ] When `winner.isBot` is true, a `BOT` badge is visible next to the winner's name; absent otherwise.
- [ ] The dialog shows exactly one button, labelled "Return to Lobby", with a `LogOut` icon.
- [ ] Pressing `Tab` once from dialog open moves focus to the "Return to Lobby" button (visible focus ring).
- [ ] Pressing `Escape`, or clicking outside the dialog, does not close it or navigate away.
- [ ] Clicking "Return to Lobby" disables the button and swaps its label to "Returning…" with a spinning icon until the exit call resolves.
- [ ] At 390×844 the dialog remains fully within the viewport with no horizontal scroll and the button is at least 44px tall.

## Review (ui-designer-b)
VERDICT: APPROVED

Verified in this session, all accurate:
- `GameBoard.tsx:22-23` — exact gradient class and `{gameState.status !== 'finished' && (...)}` guard, confirmed.
- `GameDialogManager` (`src/features/game/components/GameDialogManager.tsx:70`) renders unconditionally, outside that guard — a status-gated branch there is reachable regardless of status. Confirmed.
- `GameStatus.Finished = 'finished'`, `GameState.winner: Player | null` — `src/lib/types/game.ts:6-10,60`.
- All four reducers set `status` and `winner` in the same assignment: `combat-player-resolve.reducer.ts:112-113`, `combat-monster-resolve.reducer.ts:107-108`, `island-discovery.reducer.ts:27-28`, `player-turn.reducer.ts:100-101`. No draw/no-winner case — confirmed.
- Every quoted token string matches its source exactly: `HostLeaveDialog.styles.ts` `content`, `Login.styles.ts` `title`/`iconWrap`/`icon`/`submitButton`, `PlayerInfo.styles.ts` `botBadge`/`avatarContainer`.
- `toPlayerIdleSprite` exported from `src/modules/shared/index.ts:1`, defined `src/modules/shared/player-sprite.ts:11`. `playerRingColors`/`playerBorderColors` defined in `player-sprite.ts` (co-located with the styles file reference, not a separate file, but the export path through `PlayerInfo.styles.ts` the spec cites re-exports/imports them identically — no mismatch for implementer-a).
- `GameBoardContextType` (`src/modules/game-board/game-board.types.ts:85-89`) exposes `gameState` and `localPlayer`, enough to gate the dialog and compare `winner.playerId === localPlayer.playerId` (both typed `Player`, `playerId: string`, `src/lib/types/player.ts:21-22`).
- `AlertDialog`/`AlertDialogContent` Radix pattern, controlled `open` with no `onOpenChange` (or a no-op), matches existing `ConfirmExitDialog.tsx:18`/`HostLeaveDialog.tsx:20` precedent and correctly keeps Escape from closing an externally-controlled-`open` dialog.

Two minor citation slips (cosmetic, don't affect the build):
- `HostLeaveDialog.tsx:2` and `ConfirmExitDialog.tsx:2` for the `LogOut` import are actually line 3 in both files (line 1 is `'use client'`, line 2 is blank). Corrected below; no spec content changes.

One real gap, folded in rather than sent back (small, well-contained):
- The "Button pressed / exiting" state has no failure path. `onExit`/the exit call architect-a wires is deferred intentionally (triage.md correctly assigns that decision to architect-a — `page.tsx:16-17`'s `handleExitGame` is synchronous and can't reject, but `GameBoardContextType.handleExitClick: () => Promise<void>` (`game-board.types.ts:109`) is async and architect-a may route through it or through `player-exit.service.ts`, either of which can reject on a Firestore write failure). As written, a rejected promise leaves the button permanently disabled with "Returning…" and no way to retry — a stuck screen on the one moment a player is trying to leave. Added an Error state below; this is additive only, no existing row changes.

No other gaps found against the checklist: states (empty/loading/disabled/focus covered, "selected" not applicable to a single-button dialog, error now added), mobile fit (board is unmounted at this status on every breakpoint, so the usual map-visibility rule doesn't apply — the spec says so explicitly rather than silently ignoring it), accessibility (labels, focus order, no color-only signal, contrast precedent from Login), cognitive load (single message, single action, appropriate for end-of-game), buildability (every component/class verified above), acceptance criteria (all ten are screenshot- or interaction-testable as written).

## Final spec
Everything in the ui-designer-a spec above is final as written, with these additions/corrections:

**Citation fix:** `HostLeaveDialog.tsx:2` → `HostLeaveDialog.tsx:3`; `ConfirmExitDialog.tsx:2` → `ConfirmExitDialog.tsx:3` (the `LogOut` import line in both files).

**New state — Error (added to the States table):**
| State | What the player sees | Trigger |
|---|---|---|
| Exit failed | Button re-enables, label reverts to "Return to Lobby" with the `LogOut` icon; a one-line error message appears below the button: `text-xs text-destructive text-center`, copy "Couldn't leave the game. Try again." | The exit call's promise rejects |

**New acceptance criterion:**
- [ ] If the exit call rejects, the button re-enables within one render (not stuck on "Returning…") and the error line above is visible.

Everything else — purpose, placement, layout, remaining states, components/tokens, copy, interactions/motion, accessibility, and the original ten acceptance criteria — stands as written in the Spec section above. Later stages rely on the Spec section plus this Final spec section only.
