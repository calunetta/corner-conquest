# UI design: Connection-lost warning dialog before bot takeover

## Spec (ui-designer-a)

### Purpose and user story
As a player whose own connection has gone quiet (tab backgrounded, network drop, laptop sleep), I want a clear, unmissable warning with a live countdown before my seat is handed to a bot, so that I know to reconnect/refocus the tab and don't lose my seat without knowing why.

This is a pure UX addition to the existing detection system (`src/modules/game-board/game-board.staleness.hook.ts`, `src/modules/game-board/game-board.heartbeat.hook.ts`). It does not change `STALE_THRESHOLD_MS` (45 000 ms), `STALENESS_CHECK_INTERVAL_MS` (20 000 ms) or `HEARTBEAT_INTERVAL_MS` (15 000 ms) — all verified in `game-board.staleness.hook.ts:6-7` and `game-board.heartbeat.hook.ts:7`. It only reads the local player's own `lastSeenAt` (already present on `Player`, written by `writeHeartbeat`) to decide when to show itself.

### Placement and layout
- The dialog is a centered, modal overlay above the map and HUD on both breakpoints — same layer as other full-screen game dialogs (`CombatDialog`, `MonsterCombatDialog`, etc., all shadcn `Dialog`/`AlertDialog` per `docs/architecture/systems-and-visuals.md` §6.10 "Standardized Dialogs").
- Desktop (1280×720): `AlertDialogContent`'s own centering (`fixed left-[50%] top-[50%] ... max-w-lg`, `src/components/ui/alert-dialog.tsx:31`) is used as-is — no custom width. The map stays visible but dimmed by the standard `AlertDialogOverlay` (`bg-black/80`).
- Mobile (390×844): same `AlertDialogContent`, which is already full-width up to `max-w-lg` with `sm:rounded-lg` (rounded corners drop at the mobile breakpoint, matching every other alert dialog in the app). No map-grid visibility requirement applies here: per the triage, this is a modal takeover of the viewport like every other combat/event dialog, not a HUD element that must preserve the map underneath. Content stacks vertically in a single column; the countdown number stays large enough to read without zooming (`text-4xl` or larger, see Copy below).
- Layering: `AlertDialog` renders its own portal at `z-50` (`alert-dialog.tsx:17,31`), above the HUD (`z-20`/`z-30`) and above any other open game dialog — if the local player somehow has another dialog open when their own connection lapses, this warning still must be seen, so it takes visual precedence. (Architect to confirm whether another dialog can legitimately be open at the same time; if so, this one should still render on top since it is the most urgent.)

### States
| State | What the player sees | Trigger |
|---|---|---|
| Hidden (default) | Nothing — dialog unmounted/closed | `now - localPlayer.lastSeenAt <= WARNING_THRESHOLD_MS`, or `lastSeenAt` is `null`, or match is not `playing`, or the dialog has not yet been triggered this session |
| Warning (open) | Non-interactive `AlertDialog`: `WifiOff` icon, title, body copy, live countdown in `mm:ss` counting down to 0, no buttons | `now - localPlayer.lastSeenAt > WARNING_THRESHOLD_MS` while `gameState.status === 'playing'` and the local player is not a bot. `WARNING_THRESHOLD_MS` is a new constant, lower than `STALE_THRESHOLD_MS` (45 000 ms) — exact value is the architect's call per `triage.md`. Sound plays once, at the instant the dialog transitions from hidden to open. |
| Recovering / auto-dismiss | Dialog closes immediately, no exit animation beyond the existing `AlertDialogContent` close transition (`data-[state=closed]:fade-out-0` etc., already built into the primitive) | The next heartbeat lands (`lastSeenAt` updates) and brings `now - lastSeenAt` back under `WARNING_THRESHOLD_MS` — this happens automatically on the client's own next successful `writeHeartbeat` tick, since the write also updates the local player's row in the live `gameState.players` snapshot this client is already subscribed to |
| Takeover reached (countdown hits 0) | Countdown stops at `0:00`; dialog stays open and unchanged (no special "converted" copy) until the local `gameState.players` snapshot confirms the seat is now a bot, then the dialog closes on its own — same recovery path, just with a different downstream state. No new copy is needed for this edge: the existing `RejoinMatchPanel` (lobby) is the player's path back in, out of scope here (per `triage.md` "Out") | Countdown reaches `0:00` without a heartbeat landing first |
| Match ends / navigates away mid-warning | Dialog unmounts with the rest of the game board | `gameState.status` leaves `'playing'`, or the local player is no longer found (existing "Not in Game" redirect in `game-board.engine.hook.ts:112-117`) |

No loading/error/disabled/hover/focus/selected states apply: the dialog is non-interactive (informational only, no buttons, no form controls), per the triage's explicit "non-interactive" requirement.

### Components and tokens
- Reuse `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription` from `src/components/ui/alert-dialog.tsx` (verified above). Render **no** `AlertDialogFooter`, `AlertDialogAction` or `AlertDialogCancel` — there is nothing to confirm or cancel, and no close affordance (not even Escape/overlay click), since the player cannot stop their own seat conversion by dismissing a dialog. This is the one new visual pattern this feature introduces: an `AlertDialog` with zero action buttons. Everything else reuses existing primitives untouched.
- Icon: `WifiOff` from `lucide-react` (verified present: `node_modules/lucide-react/dist/lucide-react.d.ts:20024`), matching the icon-led pattern already used in `GameStatusBadge` (`Hourglass`, `Timer`, `src/modules/hud/components/GameStatusBadge/GameStatusBadge.tsx:3`).
- Countdown number: plain text, not the shadcn `Progress` bar — a bar adds a second thing to parse during an already-stressful moment; the existing countdown pattern in `GameStatusBadge` (`countdownBadge`/`countdownIcon`, `GameStatusBadge.styles.ts:9-24`) is a *badge* meant to sit in a small HUD corner, not a full-screen alert, so it is not reused as-is, but its "expiring" color escalation (`isExpiring` → `destructive` + `animate-pulse`) is reused as the motion/color pattern here (see Interactions below).
- Tokens: `text-destructive` for the countdown and icon once inside the final 10 seconds (`isExpiring` state, mirroring `GameStatusBadge.styles.ts:11-12`); `text-amber-400` for the icon/title otherwise (mirrors the existing "waiting"/caution color in `GameStatusBadge.styles.ts:5`); `text-muted-foreground` for the body copy (`AlertDialogDescription`'s own default, `alert-dialog.tsx:98`); dialog surface is the primitive's own `bg-background` (`alert-dialog.tsx:31`) — no custom background.

### Copy
- Title: "Connection lost"
- Body: "We haven't heard from you in a while. Reconnect now or a bot will take over your seat."
- Countdown line (own text row below the body, large and bold): "Taking over in {mm:ss}" — e.g. "Taking over in 0:18", counting down to "Taking over in 0:00". Time remaining is `Math.max(0, STALE_THRESHOLD_MS - (now - localPlayer.lastSeenAt))`, formatted as minutes:seconds the same way `GameStatusBadge`'s `formattedTime` already does (verify exact formatter in `GameStatusBadge.hook.ts` at implementation time — reuse it, do not reinvent).
- No buttons, so no button copy.

### Interactions and motion
- No click, tap, Escape or overlay-click dismissal: override Radix's default close-on-overlay-click and close-on-Escape behavior (`onEscapeKeyDown`/`onPointerDownOutside` on `AlertDialogContent`, both calling `event.preventDefault()`) so the player cannot hide the warning while still at risk — the point is they may not be looking, and when they do look back it must still be there.
- The dialog's own open/close transition is the primitive's existing `fade-in-0`/`zoom-in-95` on open and `fade-out-0`/`zoom-out-95` on close (`alert-dialog.tsx:31`) — unchanged, and these already degrade under `prefers-reduced-motion` the same way every other `AlertDialog` in the app does (no per-feature motion to specify).
- Countdown escalation: once remaining time drops under 10 s (same "expiring" idea as `GameStatusBadge`'s `isExpiring`, `GameStatusBadge.styles.ts:11-12,19-20`), the countdown text and icon switch from amber to `text-destructive` and gain `animate-pulse`; wrap the pulse in `motion-reduce:animate-none` (matching the app's existing `motion-reduce:` convention, e.g. `CreateGameDialog.styles.ts:15`, `MobileActionsBar.styles.ts:52`) so a reduced-motion user gets the color change without the pulsing.
- Sound: plays once, exactly when the dialog transitions from hidden to open (not on every re-render, not repeating during the warning, not on the final takeover). Mechanism (Web Audio tone vs. asset) is the architect's decision per `triage.md`; this spec only fixes *when* and *how often* it fires. No separate "mute" control is in scope — the dialog has no buttons at all — but the sound must respect a user's OS-level silent/mute state as any `<audio>`/`AudioContext` playback naturally does; no new in-game volume setting is being added.

### Accessibility
- `AlertDialogContent` is a Radix `AlertDialog`, so it already gets `role="alertdialog"`, traps focus, and is announced by screen readers on open — verified behavior of the underlying primitive (`@radix-ui/react-alert-dialog`), not new work.
- Because there are no buttons, there is nothing to focus after open; Radix will focus the content container itself, which is acceptable for a non-interactive alert.
- The countdown's color escalation (amber → destructive) is backed by the text itself changing ("Taking over in 0:09" is readable regardless of color) and the icon, so no information is conveyed by color alone, per the visual-language rule.
- Text contrast: `text-destructive` and `text-amber-400` against the dialog's `bg-background` (deep navy, per `globals.css` dark tokens) — both already used at the same weight elsewhere in the app (`GameStatusBadge.styles.ts:5,11`), so this spec does not introduce a new contrast risk.
- The sound is supplementary to the always-visible dialog and countdown text, never the sole signal — a deaf/mute-device player still sees the full warning.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill. Make each one observable. -->
- [ ] With a live match in `playing` status, forcing the local player's `lastSeenAt` to an elapsed time past the new warning threshold (but under 45 s total) shows the `AlertDialog` with the `WifiOff` icon, "Connection lost" title, body copy, and a counting-down "Taking over in m:ss" line.
- [ ] The dialog has no visible buttons and clicking the dimmed overlay, or pressing Escape, does not close it.
- [ ] The countdown text updates at least once per second and reaches "Taking over in 0:00" without erroring.
- [ ] When remaining time drops under 10 s, the countdown text and `WifiOff` icon render in the destructive (red) token, not amber.
- [ ] Simulating a fresh heartbeat (local player's `lastSeenAt` reset to `Date.now()`) closes the dialog on the next render, with no further interaction needed.
- [ ] The dialog does not appear at all for a normally-connected player (heartbeat landing every ~15 s) during a 2-minute observation window.
- [ ] A sound is audible exactly once at the moment the dialog first opens, and does not repeat while it stays open.
- [ ] On a 390×844 viewport the dialog renders fully on-screen with all copy legible without horizontal scrolling.

## Review (ui-designer-b)
VERDICT: APPROVED

Re-verified citations myself, not just trusting the proposer: `src/components/ui/alert-dialog.tsx` (full file read — `AlertDialogContent` centering/`max-w-lg`/`z-50`/animation classes at lines 31-45 match as described, `AlertDialogDescription` default `text-sm text-muted-foreground` at line 94 confirmed), `src/modules/game-board/game-board.staleness.hook.ts` (`STALE_THRESHOLD_MS = 45_000` line 6, `STALENESS_CHECK_INTERVAL_MS = 20_000` line 7), `src/modules/game-board/game-board.heartbeat.hook.ts` (`HEARTBEAT_INTERVAL_MS = 15_000` line 6, heartbeat only sent for `!localPlayer.isBot` and `status === Playing`, line 25), `src/modules/hud/components/GameStatusBadge/GameStatusBadge.styles.ts` (`waitingWrapper` uses `text-amber-400` line 5; `countdownBadge` `isExpiring: true` uses `bg-destructive/20 border-destructive text-destructive animate-pulse` lines 11-12 — matches the spec's claimed color escalation exactly), `src/modules/game-board/game-board.engine.hook.ts` (composition point at lines 106-107 confirmed, `localPlayer` returned from the hook at line 166), `src/modules/lobby/components/RejoinMatchPanel/` exists, `lucide-react`'s `WifiOff` export confirmed at `node_modules/lucide-react/dist/lucide-react.d.ts:20024`, `motion-reduce:` convention confirmed in `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts:52`. No invented path, prop or token found.

Findings:
- One important architecture-adjacent fact the spec states correctly but should make explicit for the architect/implementer, not just imply: `findStalePeerIds` in `game-board.staleness.hook.ts:16-21` filters `player.playerId !== localPlayerId` — a client **never converts its own seat**; only a peer's client does, on its own `STALENESS_CHECK_INTERVAL_MS` (20 s) tick. So the "Takeover reached" state's behavior (countdown parked at `0:00`, dialog waits for the snapshot to confirm `isBot`) can legitimately last up to ~20 s longer than the nominal 45 s window. The spec already describes this correctly ("stays open... until confirmed, same recovery path") and does not promise instant conversion at `0:00` — this is good, non-obvious rigor, not a gap. Flagging only so the architect doesn't "fix" the lag as a bug.
- Full-screen, focus-trapping, non-dismissible `AlertDialog` blocking all game interaction underneath while the warning is up is a legitimate general concern (an actively-present player with just a slow heartbeat write gets locked out of their own turn for up to one heartbeat cycle) — but the mechanism is "a non-interactive **dialog**" per the user's own request in `triage.md` ("Show the affected player a non-interactive dialog... with a sound and a live countdown"), confirmed via `AskUserQuestion` before triage. Not something ui-designer-a invented or something this review can override. Not a finding.
- Mobile full-viewport coverage is correctly scoped out of the "map grid must stay visible" HUD rule (`ui-design` skill's layout rules target persistent HUD elements, not modal takeovers) and is consistent with existing precedent (`CombatDialog`, `MonsterCombatDialog`). Confirmed no narrower precedent contradicts this by checking the rule's own wording ("New HUD elements must not cover it") — a one-shot alertdialog is not a HUD element.
- Zero-button `AlertDialog` is correctly flagged as the one new pattern this feature introduces; every other token/primitive is tied to a verified existing use. Escape/overlay-click suppression via `onEscapeKeyDown`/`onPointerDownOutside` is a standard, non-invented Radix `AlertDialogContent` prop pattern.
- Acceptance criteria are each independently observable (forcing `lastSeenAt`, waiting for countdown ticks, resetting `lastSeenAt`, 390×844 viewport check, one-time-sound check) — all satisfy the "testable in a screenshot or test" bar.
- `WARNING_THRESHOLD_MS` value and sound mechanism (Web Audio tone vs. asset) are correctly left to `architect-a` per `triage.md`'s explicit assignment — not a gap in this spec.

No changes requested.

## Final spec
(the Spec section above stands unchanged — independent review found no defect requiring a fix.)
