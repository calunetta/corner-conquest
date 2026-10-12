# Plan: Connection-lost warning dialog before bot takeover

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] A player whose own `lastSeenAt` is older than `WARNING_THRESHOLD_MS` (new, 25 000 ms) but the match is still `playing` and they are not a bot sees a non-interactive `AlertDialog`: `WifiOff` icon, "Connection lost" title, body copy, and a live "Taking over in m:ss" countdown.
- [ ] The dialog cannot be dismissed (no buttons, Escape and overlay-click are suppressed).
- [ ] Countdown text updates at least once per second, switches to the destructive token plus pulse under 10 s remaining, and reaches "Taking over in 0:00" without erroring.
- [ ] The dialog closes itself the next render after `lastSeenAt` is refreshed (a new heartbeat lands) or the local player is no longer in a `playing`, non-bot state.
- [ ] A short tone plays exactly once per hidden→open transition; it does not repeat while the dialog stays open, and plays again if it closes and later reopens.
- [ ] No change to `STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, `HEARTBEAT_INTERVAL_MS`, or any `game-rules` reducer.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `STALE_THRESHOLD_MS = 45_000` | `src/modules/game-board/game-board.staleness.hook.ts:6` | Countdown's end point; must not be duplicated as a literal. |
| `STALENESS_CHECK_INTERVAL_MS = 20_000` | `src/modules/game-board/game-board.staleness.hook.ts:7` | Explains why the dialog can legitimately linger up to 20 s past `0:00` (peer-driven conversion, not a bug — ui-designer-b's note). |
| `findStalePeerIds` filters `player.playerId !== localPlayerId` | `src/modules/game-board/game-board.staleness.hook.ts:16-21` | A client never converts its own seat; confirms the dialog cannot assume instant conversion at `0:00`. |
| `HEARTBEAT_INTERVAL_MS = 15_000`, gating `!localPlayer.isBot` | `src/modules/game-board/game-board.heartbeat.hook.ts:6,25` | Same "not a bot" gate this feature must mirror so the dialog never shows for a seat already converted. |
| `Player.lastSeenAt: number \| null` | `src/lib/types/player.ts:30` | The only new-data input; no new `GameState`/`Player` field needed. |
| `GameBoardContextType { gameState: GameState; localPlayer: Player; ... }` | `src/modules/game-board/game-board.types.ts:86-113` | `gameState` and `localPlayer` are non-null on this context — the hook needs no extra null-guards beyond `lastSeenAt` itself. |
| `useGameBoard` (module's own, wraps legacy context) | `src/modules/game-board/game-board.provider.tsx:9-15`, re-exported `src/modules/game-board/index.ts:9` | Existing precedent for a `.hook.ts` reading this instead of the legacy `src/features/game/context/GameBoardContext` directly: `src/modules/hud/components/GameStatusBadge/GameStatusBadge.hook.ts:1,6` does exactly this. |
| `AlertDialog`, `AlertDialogContent` (`fixed ... max-w-lg ... z-50`, `onEscapeKeyDown`/`onPointerDownOutside` as standard Radix props) | `src/components/ui/alert-dialog.tsx:9,30-46` | The primitive this dialog is built from; verified centering/z-index/animation classes need no override. |
| `AlertDialogDescription` default `text-sm text-muted-foreground` | `src/components/ui/alert-dialog.tsx:88-99` | No class override needed for the body copy. |
| Controlled `AlertDialog` pattern: `open={open} onOpenChange={onClose}` | `src/modules/session/components/HostLeaveDialog/HostLeaveDialog.tsx:19` | This dialog has no `onClose`; `onOpenChange` is a no-op since nothing in the UI can close it. |
| `countdownBadge`/`countdownIcon` `isExpiring` → `text-destructive animate-pulse` vs `text-amber-400` | `src/modules/hud/components/GameStatusBadge/GameStatusBadge.styles.ts:5,9-24` | Color-escalation pattern this feature reuses (confirmed by ui-designer-b). |
| `motion-reduce:animate-none` convention | `src/modules/hud/components/ActionsPanel/MobileActionsBar.styles.ts:52` | Wrap the pulse per the app's existing reduced-motion convention. |
| `mm:ss` formatter (inline, not exported) | `src/modules/game-board/turn-timer.hook.ts:51-55` | Precedent for a minutes:seconds formatter in this codebase; not importable (lives inside a hook) and not reused verbatim — it zero-pads minutes (`"02:05"`), while this feature's own `formatCountdown` must not (`"2:05"`, matching ui-design.md's "0:18" copy example), so this feature writes its own single-purpose version rather than refactor `turn-timer.hook.ts` out of scope. |
| `GameStatusBadgeView`/`GameStatusBadge` split, `.preview.tsx`, `.fixtures.ts`, `index.ts` shape | `src/modules/hud/components/GameStatusBadge/*` | Template this component's file layout follows exactly (pure view, zero-prop connected wrapper, fixtures-driven preview). |
| `GameDialogManager` renders dialogs unconditionally or behind `isMyTurn`/`dialogs.*` state, imports modules via their index | `src/features/game/components/GameDialogManager.tsx:8-25,73-79` | Wiring point; `HostLeaveDialog` (`:73-79`) is the closest precedent — rendered unconditionally, controlled entirely by its own props/hook, no `isMyTurn` gate. |
| `previews: ComponentPreview[]` registry, one import + one array entry per component | `src/testbed/registry.ts:1-60` | Preview wiring point. |
| No `Audio(`, `.mp3`/`.wav`/`.ogg`, `playSound`, `useSound` anywhere in `src`/`public`; no `window.AudioContext` mock in `jest.setup.js` | grep run this session; `jest.setup.js` (full file read) | No existing sound mechanism to reuse; jsdom has no `AudioContext`, so a Web Audio tone is a safe no-op under test with no new global mock needed. |
| `WifiOff` export | `node_modules/lucide-react/dist/lucide-react.d.ts:20024` | Icon exists (ui-designer-b verified). |
| `lucide-react` fully mocked in tests (`data-testid="lucide-icon-<name>"`) | `jest.setup.js:19-28` | View test asserts on `lucide-icon-wifioff`, not the real SVG. |

## Decisions
- **Mechanism: Web Audio API oscillator tone**, not an audio asset, because no asset exists to source/license/ship and triage leaves this call to the architect. Rejected: `<audio>` + static file (adds a binary asset and a license question for a one-off beep; out of proportion to the feature).
- **`WARNING_THRESHOLD_MS = 25_000`** (new constant, this feature's file) because it is lower than and distinct from `STALE_THRESHOLD_MS` (45 000) per triage, and leaves a 20 s countdown window, matching the ui-design spec's own copy example ("Taking over in 0:18"). Rejected: deriving it as a fraction of `STALE_THRESHOLD_MS` (e.g. `STALE_THRESHOLD_MS * 0.55`) — a plain literal is simpler to read and to test against.
- **`toConnectionWarningViewModel` takes `warningThresholdMs`/`staleThresholdMs` as parameters, not module-level imports**, so the pure `.map.ts` has no runtime dependency on `game-board.staleness.hook.ts` (narrow interface, no risk of an accidental React-module import chain into a pure file). The hook imports `STALE_THRESHOLD_MS` from the staleness hook (hook-to-hook, same layer) and defines its own `WARNING_THRESHOLD_MS`, passing both in.
- **No new `.types.ts` field for "is this the local player's own seat going bot"**: `localPlayer.isBot` already becomes `true` the instant the seat converts (`convertSeatToBot`, `player-exit.service.ts`), so the existing field is enough to make the dialog close itself post-conversion. Rejected: a new derived flag — would duplicate what `isBot` already says.
- **One `now` tick per second via `setInterval`**, same cadence as `turn-timer.hook.ts`, because the one-second countdown-text requirement doesn't need finer granularity, and courser ticks waste no renders. Recovery (fresh `lastSeenAt`) and takeover (`isBot` flips) both land through `gameState` changes from the Firestore subscription already driving re-renders elsewhere, not through this interval, so dismissal is not delayed by up to 1 s.
- **Sound call lives in the `.hook.ts`**, not a separate file, because it is a single ~15-line side effect fired from one `useEffect`, tightly coupled to the hidden→open transition this hook already computes; a dedicated file for one small function is a pass-through layer (KISS).
- **Wiring renders `<ConnectionWarningDialog />` unconditionally in `GameDialogManager`**, outside the `isMyTurn` block, because the warning must show regardless of whose turn it is (own connection can lapse on an opponent's turn). It needs no props: its own `.hook.ts` reads `useGameBoard()` directly, so it is a true zero-prop connected component (matches `HostLeaveDialog`'s unconditional render, but unlike it this component also needs no dispatch/state plumbing from `GameDialogManager` at all).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.types.ts` | new | `ConnectionWarningViewModel` type | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.map.ts` | new | Pure `toConnectionWarningViewModel` + countdown formatting | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts` | new | `useConnectionWarning()`: reads `useGameBoard()`, ticks `now`, computes the view model, plays the tone once on open | implementer-a (sonnet) |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.fixtures.ts` | new | Deterministic view-model fixtures for tests/preview | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/index.ts` | new | Public API of the component | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.tsx` | new | `ConnectionWarningDialogView` (pure) + `ConnectionWarningDialog` (connected) | implementer-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.styles.ts` | new | Icon/countdown classes, `isExpiring` color escalation | implementer-b |
| `src/modules/game-board/index.ts` | edit | Export `ConnectionWarningDialog` | implementer-b |
| `src/features/game/components/GameDialogManager.tsx` | edit | Render `<ConnectionWarningDialog />` unconditionally (minimal legacy wiring) | implementer-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.map.test.ts` | new | `toConnectionWarningViewModel` cases | tester-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.test.ts` | new | Open/close timing, tick cadence, tone-once behavior | tester-a (sonnet) |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.test.tsx` | new | `ConnectionWarningDialogView` render/a11y/dismiss-suppression cases | tester-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.preview.tsx` | new | Testbed states: Warning, Expiring | preview-a |
| `src/testbed/registry.ts` | edit | Register the new preview | preview-a |

## Contracts
```ts
// ConnectionWarningDialog.types.ts
export interface ConnectionWarningViewModel {
  isOpen: boolean;
  isExpiring: boolean; // true once remaining time to takeover is <= 10_000 ms
  countdownLabel: string; // e.g. "Taking over in 0:18"
}

// ConnectionWarningDialog.map.ts
export function toConnectionWarningViewModel(
  lastSeenAt: number | null,
  now: number,
  status: GameStatus, // from '@/lib/types'
  isBot: boolean,
  warningThresholdMs: number,
  staleThresholdMs: number,
): ConnectionWarningViewModel;
// isOpen = status === GameStatus.Playing && !isBot && lastSeenAt !== null
//          && (now - lastSeenAt) > warningThresholdMs
// remainingMs = Math.max(0, staleThresholdMs - (lastSeenAt === null ? 0 : now - lastSeenAt))
// isExpiring = remainingMs <= 10_000
// countdownLabel = `Taking over in ${formatCountdown(remainingMs)}` where formatCountdown
//   mirrors turn-timer.hook.ts's m:ss (minutes not zero-padded, seconds padStart(2, '0'))

// ConnectionWarningDialog.hook.ts
export const WARNING_THRESHOLD_MS = 25_000; // lower than STALE_THRESHOLD_MS (45_000), imported from game-board.staleness.hook
export function playConnectionWarningTone(): void; // exported only so it's independently readable/testable; not part of the component's public API (not re-exported from index.ts)
export function useConnectionWarning(): ConnectionWarningViewModel;
// Reads { gameState, localPlayer } = useGameBoard(). Ticks `now` via setInterval(1_000).
// Recomputes the view model on every render (tick or gameState change). On the render where
// isOpen flips false -> true, calls playConnectionWarningTone() exactly once (tracked with a ref,
// not state, so the tone call itself never triggers a re-render).

// ConnectionWarningDialog.tsx
export function ConnectionWarningDialogView(props: ConnectionWarningViewModel): JSX.Element;
// Renders AlertDialog open={props.isOpen} onOpenChange={() => {}}; AlertDialogContent with
// onEscapeKeyDown={(e) => e.preventDefault()} and onPointerDownOutside={(e) => e.preventDefault()};
// no AlertDialogFooter/Action/Cancel. WifiOff icon + countdown text both use
// styles.icon({ isExpiring }) / styles.countdown({ isExpiring }).
export function ConnectionWarningDialog(): JSX.Element; // = <ConnectionWarningDialogView {...useConnectionWarning()} />

// ConnectionWarningDialog.styles.ts
export const styles: {
  titleRow: string;
  icon: (opts: { isExpiring: boolean }) => string; // cva: false -> 'text-amber-400'; true -> 'text-destructive animate-pulse motion-reduce:animate-none'
  countdown: (opts: { isExpiring: boolean }) => string; // same two variants, plus 'text-4xl font-bold font-mono'
};

// ConnectionWarningDialog.fixtures.ts
export const openWarningViewModel: ConnectionWarningViewModel; // isOpen: true, isExpiring: false, countdownLabel: 'Taking over in 0:18'
export const openExpiringViewModel: ConnectionWarningViewModel; // isOpen: true, isExpiring: true, countdownLabel: 'Taking over in 0:07'
```

## Phases
### Phase 1: connection warning dialog
1. implementer-a: `ConnectionWarningDialog.types.ts`, `ConnectionWarningDialog.map.ts`.
2. implementer-a (sonnet): `ConnectionWarningDialog.hook.ts` — open/close timing, tick cadence, once-per-transition tone call are the part most likely to misfire (false positive for a connected player, failure to re-arm after a recovery-then-relapse).
3. implementer-a: `ConnectionWarningDialog.fixtures.ts`, `index.ts`.
4. implementer-b: `ConnectionWarningDialog.tsx`, `ConnectionWarningDialog.styles.ts`.
5. implementer-b: edit `src/modules/game-board/index.ts` and `src/features/game/components/GameDialogManager.tsx` to export and render the component.
6. tester-a: `ConnectionWarningDialog.map.test.ts`.
7. tester-a (sonnet): `ConnectionWarningDialog.hook.test.ts` — must cover the same misfire/re-arm risk as step 2.
8. tester-b: `ConnectionWarningDialog.test.tsx`.
9. preview-a: `ConnectionWarningDialog.preview.tsx`, register it in `src/testbed/registry.ts`.
10. checks: `npm run typecheck`, `npm run lint`, `npm test`.
11. ui-verify: testbed preview (both states) and, if practical, the live board with a forced-stale `lastSeenAt` (390×844 and desktop).
12. docs-sync: add a bullet to `docs/architecture/systems-and-visuals.md` §6.14 documenting `ConnectionWarningDialog`, `WARNING_THRESHOLD_MS`, and that it is purely a client-local, informational addition (no new Firestore field, no change to conversion timing).
13. commit, then final review (architect-b).

Model escalation: steps 2 and 7 (`implementer-a`, `tester-a` on the hook) run on sonnet per `triage.md`'s override.

## Test plan
- tester-a — `ConnectionWarningDialog.map.ts`:
  - `status !== Playing` → `isOpen: false` regardless of elapsed time.
  - `isBot: true` → `isOpen: false` even if `lastSeenAt` is old (mirrors `useHeartbeat`'s own gate).
  - `lastSeenAt: null` → `isOpen: false` (no heartbeat yet, same rule as `findStalePeerIds`).
  - elapsed exactly at `warningThresholdMs` → `isOpen: false` (strictly greater, matching the staleness check's own boundary convention at `game-board.staleness.hook.ts:19`).
  - elapsed one ms past `warningThresholdMs` → `isOpen: true`.
  - `remainingMs` floors at 0 once elapsed exceeds `staleThresholdMs` (no negative countdown).
  - `isExpiring` flips at exactly 10 000 ms remaining (confirm the boundary is `<=` not `<`).
  - `countdownLabel` formatting: 125 000 ms → `'Taking over in 2:05'`; 0 ms → `'Taking over in 0:00'`.
- tester-a (sonnet) — `useConnectionWarning`:
  - Fake timers: player connected (`lastSeenAt` fresh) stays closed through multiple 1 s ticks.
  - `lastSeenAt` aged past `WARNING_THRESHOLD_MS` → `isOpen` becomes `true`, `playConnectionWarningTone`'s side effect fires exactly once (assert via a mocked `window.AudioContext` constructor call count), not again on subsequent ticks while still open.
  - A fresh `lastSeenAt` (simulating a landed heartbeat) on the next `gameState` update closes the dialog on that render, without waiting for the next interval tick.
  - Recovery then relapse (closes, then ages past the threshold again) re-triggers the tone exactly once more — this is the "re-arm" case the architect flagged as the main risk.
  - `localPlayer.isBot` flips `true` (post-conversion) closes the dialog even if `lastSeenAt` is still old.
  - Unmount clears the `setInterval` (no act-outside-test warning).
- tester-b — `ConnectionWarningDialogView`:
  - `isOpen: false` → `AlertDialog` renders nothing visible (query by role `alertdialog` finds none).
  - `isOpen: true` → title "Connection lost", body copy, countdown text, `WifiOff` icon (`lucide-icon-wifioff` per the global mock) all present; no button role present.
  - `isExpiring: true` → countdown/icon carry the destructive variant class (assert via the rendered class list from `styles`, not a snapshot).
  - Simulated Escape keydown and an outside pointerdown on the overlay do not remove the dialog from the DOM.
  - No e2e spec: driving this from a live match would require forcing a seat's `lastSeenAt` through Firestore timing, which the existing e2e suite has no hook for and triage does not ask for; covered by the hook/view unit tests plus a manual `ui-verify` pass per step 11.

## Preview states
- `ConnectionWarningDialog` (slug `game-board-connection-warning`, group "Game Board"): `Warning` (`openWarningViewModel`, amber), `Expiring` (`openExpiringViewModel`, destructive + pulse).

## Risks
- False positive for a normally-connected player: mitigated by reusing the same `!isBot`/`status === Playing`/`lastSeenAt !== null` gates the shipped heartbeat/staleness hooks already use, and by the dedicated tester-a (sonnet) timing tests.
- Dialog lingering up to ~20 s past `0:00` before `isBot` flips: documented behavior (ui-designer-b's finding, confirmed via `findStalePeerIds`'s own-seat exclusion), not a bug to fix here.
- Browser autoplay restrictions may silently block the tone (no user gesture preceded it): `playConnectionWarningTone` already swallows any `AudioContext`/`start()` failure into a `console.error`, matching the heartbeat hook's own "log and continue" pattern for a non-critical side channel; the dialog's visible text is never the sole signal (ui-design.md Accessibility).

## Review (architect-b)
VERDICT: APPROVED

Re-verified every cited path/symbol myself (not trusting architect-a's citations): `game-board.staleness.hook.ts:6-7,16-21` (`STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, `findStalePeerIds` own-seat exclusion), `game-board.heartbeat.hook.ts:6,25` (`HEARTBEAT_INTERVAL_MS`, `!isBot` gate), `src/lib/types/player.ts:19-50` (`lastSeenAt: number | null` at line 30), `game-board.types.ts:86-113` (`gameState`/`localPlayer` non-null on `GameBoardContextType`), `game-board.provider.tsx:9-15` and `index.ts:9` (module's own `useGameBoard`), `GameStatusBadge.hook.ts:1,6` (precedent for a `.hook.ts` reading it), `src/components/ui/alert-dialog.tsx` full file (centering/z-50/animation classes lines 30-46, `AlertDialogDescription` default `text-sm text-muted-foreground` line 94), `HostLeaveDialog.tsx:19-21` (controlled `open`/`onOpenChange` pattern), `GameStatusBadge.styles.ts:5,9-24` (amber/destructive-pulse escalation), `MobileActionsBar.styles.ts` `motion-reduce:` convention (confirmed present), `turn-timer.hook.ts:51-55` (formatter — see fix below), `GameStatusBadge/*` file-layout precedent, `GameDialogManager.tsx:73-79` (`HostLeaveDialog` unconditional-render precedent), `src/testbed/registry.ts:1-85` (preview registry shape), `jest.setup.js:19-30` (lucide-react global mock, no `AudioContext` mock), `WifiOff` export confirmed at `node_modules/lucide-react/dist/lucide-react.d.ts` (jsdoc block immediately preceding the declared const), `src/lib/types/game.ts:6,11` (`GameStatus` export). Also ran my own greps: no `Audio(`, `.mp3/.wav/.ogg`, `playSound`, `useSound` anywhere in `src`/`public` (confirms the Web Audio decision has no existing mechanism to reuse instead); no existing reference to `ConnectionWarningDialog` anywhere in the repo (clean net-new name); `src/modules/game-board/components/` does not yet exist, so this is correctly the first component folder in this module, consistent with the "Migrating a legacy component" / flat-vs-components-folder split in the component-architecture skill.

One finding, folded in directly (trivial wording fix, not a design defect): the Verified-context row for the `mm:ss` formatter overstated its similarity to `turn-timer.hook.ts:51-55` — that formatter zero-pads minutes (`"02:05"`), while this feature's own `formatCountdown` must not (`"2:05"`, matching ui-design.md's "0:18" copy example and the contract's own 125000ms → "Taking over in 2:05" test case). The contract itself was already correct and unambiguous; only the citation's framing needed tightening. Fixed in place.

No other defects. File plan, contracts, phasing and test plan are sound; approving without further changes.
