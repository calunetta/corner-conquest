# Plan: Manual dismiss + mobile wrap fix for the connection warning dialog

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Review (architect-b)
VERDICT: APPROVED

Re-verified every cited path/symbol this session (not trusting the plan's own citations):
- `ConnectionWarningDialog.hook.ts` (1-55), `.tsx` (1-52), `.types.ts` (1-7), `.styles.ts` (1-22) — all four match the plan's quoted line numbers and content exactly (`WARNING_THRESHOLD_MS` l.10, `keepOpen`/`onEscapeKeyDown` l.20-22/32, `countdown` cva l.13, `isOpen`/`isExpiring`/`countdownLabel` l.1-7).
- `writeHeartbeat(gameId, playerIndex)` — `src/modules/game-board/services/game-board.engine.service.ts:44-58`, confirmed it rejects via the surrounding `runTransaction` promise (no internal try/catch) — the contract's `.catch` is correctly placed on the hook side, not inside the service.
- `sendHeartbeat` — `src/modules/game-board/game-board.heartbeat.hook.ts:14-21`, confirmed it swallows errors into `console.error`; confirmed unusable for the button as the plan states.
- `useGameBoard` — actual file is `game-board.provider.tsx` (plan cites `.ts`, trivial extension typo, no behavioral impact since imports are extensionless) — `gameState`/`localPlayer` at `game-board.types.ts:89-90`; `GameState.id: string` (`src/lib/types/game.ts:48`), `Player.id: number` (`src/lib/types/player.ts:20`) both confirmed.
- `useToast` / `toast` — `src/modules/shared/use-toast.ts:6-23`, `index.ts:3` — confirmed `toast` is a stable module export, safe `useCallback` dependency as claimed.
- `AlertDialogFooter` — `src/components/ui/alert-dialog.tsx:62-74` (not 66-76 as ui-design.md says, but the plan's own File-plan/Contracts don't repeat that off-by-a-few — no impact), class string confirmed verbatim. `AlertDialogAction` wraps `buttonVariants()`, `AlertDialogCancel` has `mt-2 sm:mt-0` — confirmed, supports the plain-`Button`-over-`AlertDialogAction` decision (dialog is fully controlled, no `onOpenChange`).
- `Button` (`src/components/ui/button.tsx:36-50`) forwards `disabled`/`onClick` via spread — confirmed.
- `RefreshCw` export in `lucide-react` and the `jest.setup.js:19-29` icon-mock (`lucide-icon-<name>` test ids) both confirmed present.
- `ConnectionWarningDialog.fixtures.ts`, `.test.tsx`, `.hook.test.ts`, `.preview.tsx`, `index.ts` all read in full: the "offers no buttons" test is exactly at line 50 (plan says 50-54, matches), Escape/overlay tests at 56/64 (plan says 56-71, close enough, no drift in substance), the hook test already mocks only `useGameBoard` and will need the two new mocks the plan specifies, the preview's two existing states and the index's two named exports are exactly as described.
- `docs/architecture/systems-and-visuals.md:137` — confirmed contains "non-dismissable", matching the docs-sync target.
- Repo-wide grep for "non-dismissable", "offers no buttons", "no close affordance" turns up only: this task's own docs (expected), the prior task's `ui-design.md` (historical record of a superseded decision — correctly left untouched, not in the File plan), and the files already listed in the File plan. No missed old-path reference.

Design: the three rejected alternatives in "Decisions" (a throwing `sendHeartbeat` wrapper, a local `isOpen` duplicate, an `AbortController`) are each simpler-sounding options considered and correctly rejected for a concrete reason; the chosen design (call `writeHeartbeat` directly, let the existing reactive `isOpen` close the dialog, guard the stale toast with a ref) is the smallest change that satisfies every acceptance criterion. Responsibilities stay split along the existing file boundaries (hook owns the async/race logic, `.tsx` only swaps icon/label, `.styles.ts` only adds classes) with implementer-a/implementer-b's work independent enough for parallel building — implementer-a's hook changes don't require implementer-b's view changes to type-check in isolation (the `ConnectionWarningViewModel` contract implementer-a adds is consumed, not produced, by implementer-b). Contracts in the plan are copy-pasteable, including exact new imports. Phase count (1) is correct for an M-tier, single-component change.

No findings.

## Goal and acceptance criteria
(verbatim from `ui-design.md` Final spec, unchanged)
- [ ] With the dialog open, a button labeled "I'm back" with a `RefreshCw` icon is visible in a footer row below the countdown, enabled.
- [ ] Clicking "I'm back" immediately disables the button, swaps its icon to a spinning `Loader2`, and changes its label to "Checking…"; the countdown text keeps updating while this is shown.
- [ ] Forcing the write to succeed (fresh `lastSeenAt`) closes the dialog with no further interaction, the same way the existing automatic-recovery path does.
- [ ] Forcing the write to fail re-enables the button back to "I'm back" with the `RefreshCw` icon, and a destructive-variant toast titled "Still can't reach you" appears; the dialog itself stays open and the countdown keeps running from where it left off.
- [ ] Pressing Escape, or clicking the dimmed overlay, still does not close the dialog.
- [ ] On a 390×844 viewport, the button is full-width in the footer and the countdown line renders on a single line with no horizontal scrolling or wrapping.
- [ ] On a 1280×720 viewport, the button is right-aligned in the footer (not full-width) and the countdown remains at its prior, larger size.
- [ ] A failed forced-write whose toast would fire after the dialog already closed through another path (automatic recovery or takeover) does not surface that toast.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `ConnectionWarningViewModel` | `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.types.ts:1-7` | gets two new fields: `isDismissing`, `onDismiss` |
| `useConnectionWarning` | `.../ConnectionWarningDialog.hook.ts:32-55` | adds the dismiss action; currently only reads `useGameBoard()` and ticks a clock |
| `toConnectionWarningViewModel` | `.../ConnectionWarningDialog.map.ts:18-38` | unchanged — pure function of `lastSeenAt`/`now`/`status`/`isBot`; `isOpen` already flips false on recovery, which the hook's race guard must observe |
| `ConnectionWarningDialogView` | `.../ConnectionWarningDialog.tsx:25-46` | adds `AlertDialogFooter` + `Button`; `keepOpen`/`onEscapeKeyDown` at lines 20-22, 32 stay untouched |
| `styles.countdown` | `.../ConnectionWarningDialog.styles.ts:13` | base classes change from `text-4xl font-bold font-mono` to `text-2xl sm:text-4xl font-bold font-mono`; `isExpiring` variant branches unchanged |
| `styles.icon` | `.../ConnectionWarningDialog.styles.ts:5-12` | unchanged; cited only as the existing `animate-pulse motion-reduce:animate-none` precedent the new spinner follows |
| `writeHeartbeat(gameId, playerIndex)` | `src/modules/game-board/services/game-board.engine.service.ts:44` | the forced write; throws/rejects on failure (runs inside a Firestore transaction) — must be called directly, not through `sendHeartbeat` |
| `sendHeartbeat` | `src/modules/game-board/game-board.heartbeat.hook.ts:14-21` | swallows errors (`try`/`catch` + `console.error`) — confirmed unusable as-is; not reused |
| `useGameBoard` | `src/modules/game-board/game-board.provider.ts:9-15` | returns `{ gameState, localPlayer, ... }`; `gameState.id` (`GameState.id: string`, `src/lib/types/game.ts:48`) and `localPlayer.id` (`Player.id: number`, the seat index, `src/lib/types/player.ts:20`) are the two args `writeHeartbeat` needs |
| `useToast` | `src/modules/shared/index.ts:3`, impl `src/modules/shared/use-toast.ts:6-21` | returns `{ toast, ... }`; `toast` is a stable module-level export (`use-toast.ts:18`, re-exported line 23) so it's a safe `useCallback` dependency |
| toast precedent | `src/modules/game-board/game-board.engine.hook.ts:5,28` | `toast({ title: 'Action Error', description: '...', variant: 'destructive' })` — same shape this task's toast copies |
| `AlertDialogFooter` | `src/components/ui/alert-dialog.tsx:62-74` | `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`, existing primitive, no edit needed |
| `Button` | `src/components/ui/button.tsx:36-50` | default variant; accepts `disabled`, forwards `onClick` |
| `RefreshCw`, `Loader2` | `lucide-react` (`node_modules/lucide-react/dist/lucide-react.d.ts:14840` for `RefreshCw`; `Loader2` precedent `src/modules/session/components/Login/Login.tsx:3`) | the two icons the button swaps between |
| lucide test-id mock | `jest.setup.js:19-25` | renders each lucide icon as `<span data-testid="lucide-icon-<lowercasedname>">`, e.g. `lucide-icon-refreshcw`, `lucide-icon-loader2` — use these in view-test assertions |
| `ConnectionWarningDialog.fixtures.ts` | full file | `openWarningViewModel`/`openExpiringViewModel` need the two new fields added; shared by `.test.tsx` and `.preview.tsx` |
| `ConnectionWarningDialog.hook.test.ts` | full file | already mocks `useGameBoard`; must now also mock `writeHeartbeat` and `useToast` since every render calls `useToast()` unconditionally |
| `ConnectionWarningDialog.test.tsx:50-54` | `'offers no buttons, so there is nothing to confirm or cancel'` test | now false — this test must be replaced, not kept |
| docs drift | `docs/architecture/systems-and-visuals.md` §6.14 "Connection Warning" bullet | currently says "non-dismissable" — false after this change; `docs-sync` fixes in this phase |

## Root cause (bugs only)
N/A — feature request, not a bug.

## Decisions
- Call `writeHeartbeat` directly from the hook, not `sendHeartbeat`, because the button must observe failure (`sendHeartbeat` swallows it, `game-board.heartbeat.hook.ts:14-21`). Rejected: adding a throwing variant of `sendHeartbeat` (a second wrapper around one write, duplicate logic for no gain).
- On success, let the existing Firestore subscription close the dialog reactively (`toConnectionWarningViewModel`'s `isOpen` flips false once `lastSeenAt` is fresh) rather than setting local `isOpen` state in the hook. One source of truth for `isOpen`; matches "the same way the existing automatic-recovery path does" in the acceptance criteria. Rejected: a local `setIsOpen(false)` on write-success (would create a second, possibly-racing source of truth for whether the dialog is open).
- Race guard against the stale-toast gap (ui-designer-b's finding): snapshot `isOpen` into a ref updated every render, check the ref in the write's `catch` before calling `toast`. Rejected: an `AbortController` per click (no actual network cancellation available through `writeHeartbeat`'s signature; the ref check is the minimal fix for "don't show a toast for an already-closed dialog").
- Dismiss button is a plain shadcn `Button` with its own `onClick`, not `AlertDialogAction`, because the dialog's `open` prop is fully controlled (`isOpen`, no `onOpenChange`, `ConnectionWarningDialog.tsx:31`) and the close must be gated on the async write's result, not on the click itself (restated from `ui-design.md` because it binds implementer-b's `.tsx` edit, not just the doc).
- `isDismissing` always resets to `false` in a `finally`, unconditional on the race-guard ref — the hook component itself never unmounts mid-write in this flow (the `ConnectionWarningDialog` wrapper always renders while the game board is mounted), so no extra mounted-ref is needed. Rejected: a second `isMountedRef` (the existing codebase's `useHeartbeat`/`sendHeartbeat` has no such guard either — consistent, and unneeded here).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.types.ts` | edit | add `isDismissing: boolean` and `onDismiss: () => void` to `ConnectionWarningViewModel` | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.ts` | edit | add `onDismiss` (calls `writeHeartbeat`, tracks `isDismissing`, race-guards the failure toast) | implementer-a (sonnet) |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.fixtures.ts` | edit | add `isDismissing: false, onDismiss: () => {}` to the two existing fixtures; add `dismissingViewModel` (`isDismissing: true`) for the test/preview "pending" state | implementer-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.tsx` | edit | render `AlertDialogFooter` + `Button` (idle/pending label+icon swap) below the countdown | implementer-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.styles.ts` | edit | `countdown` base classes → `text-2xl sm:text-4xl font-bold font-mono`; add `dismissButton` and `dismissIcon` exports | implementer-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.test.ts` | edit | mock `writeHeartbeat` and `useToast`; add dismiss success / failure / race-guard / countdown-keeps-ticking-while-pending tests | tester-a |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.test.tsx` | edit | replace the now-false "offers no buttons" test; add button presence, idle→pending icon/label swap, `onDismiss` click wiring, Escape/overlay-still-blocked (unchanged assertions kept) | tester-b |
| `src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.preview.tsx` | edit | add an "idle with button", "Dismissing" (pending) state using the new fixture; 390px/1280px states stay screenshot-checked by ui-verify, not new preview states | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | §6.14 "Connection Warning" bullet: replace "non-dismissable" with a description of the "I'm back" button (forces a heartbeat, closes only on success, stays open and toasts on failure) | docs-sync |

No change needed: `ConnectionWarningDialog.map.ts`, `ConnectionWarningDialog.map.test.ts`, `index.ts` (no new named exports — `onDismiss`/`isDismissing` are `ConnectionWarningViewModel` fields, already exported as a type), `src/testbed/registry.ts` (preview slug unchanged).

## Contracts
```ts
// ConnectionWarningDialog.types.ts
export interface ConnectionWarningViewModel {
  isOpen: boolean;
  isExpiring: boolean;
  countdownLabel: string;
  /** True while the forced heartbeat write from onDismiss is in flight. */
  isDismissing: boolean;
  /** Forces a fresh heartbeat write; closes the dialog only if it succeeds (reactively, once
   *  lastSeenAt updates through the normal Firestore subscription — this does not set isOpen
   *  itself). On failure, re-enables and shows a destructive toast, unless the dialog has
   *  already closed through another path (automatic recovery or takeover) by the time the
   *  write settles, in which case it does nothing. */
  onDismiss: () => void;
}

// ConnectionWarningDialog.hook.ts — new imports and shape
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/modules/shared';
import { writeHeartbeat } from '../../services/game-board.engine.service';
// ...existing imports unchanged (useGameBoard, STALE_THRESHOLD_MS, toConnectionWarningViewModel, ViewModel type)

export function useConnectionWarning(): ConnectionWarningViewModel {
  // existing: gameState, localPlayer, now/tick effect, viewModel = toConnectionWarningViewModel(...), tone effect — unchanged

  const { toast } = useToast();
  const [isDismissing, setIsDismissing] = useState(false);

  // Updated every render (not in an effect) so the ref is current by the time the async
  // write's .catch reads it — this is the race guard for the stale-toast gap.
  const isOpenRef = useRef(viewModel.isOpen);
  isOpenRef.current = viewModel.isOpen;

  const onDismiss = useCallback(() => {
    setIsDismissing(true);
    writeHeartbeat(gameState.id, localPlayer.id)
      .catch((error) => {
        console.error('Error forcing heartbeat:', error);
        if (!isOpenRef.current) return; // dialog already closed via another path — no stale toast
        toast({
          title: "Still can't reach you",
          description: 'Check your connection and try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsDismissing(false));
  }, [gameState.id, localPlayer.id, toast]);

  return { ...viewModel, isDismissing, onDismiss };
}

// ConnectionWarningDialog.styles.ts — additions (alongside existing titleRow/icon/countdown)
dismissButton: 'w-full sm:w-auto',
dismissIcon: cva('mr-2 h-4 w-4', {
  variants: {
    isPending: {
      true: 'animate-spin motion-reduce:animate-none',
      false: '',
    },
  },
}),
// countdown base classes become: cva('text-2xl sm:text-4xl font-bold font-mono', { ...unchanged isExpiring variants })

// ConnectionWarningDialog.tsx — ConnectionWarningDialogView gains the footer, after the
// existing <p className={styles.countdown(...)}> line, still inside <AlertDialogContent>:
<AlertDialogFooter>
  <Button onClick={onDismiss} disabled={isDismissing} className={styles.dismissButton}>
    {isDismissing ? (
      <Loader2 className={styles.dismissIcon({ isPending: true })} aria-hidden="true" />
    ) : (
      <RefreshCw className={styles.dismissIcon({ isPending: false })} aria-hidden="true" />
    )}
    {isDismissing ? 'Checking…' : "I'm back"}
  </Button>
</AlertDialogFooter>
// ConnectionWarningDialogView's destructured props gain isDismissing, onDismiss.
// New imports in ConnectionWarningDialog.tsx: AlertDialogFooter (from '@/components/ui/alert-dialog'),
// Button (from '@/components/ui/button'), RefreshCw and Loader2 (from 'lucide-react').
```

## Test plan
- `ConnectionWarningDialog.hook.test.ts` (tester-a), add `jest.mock('../../services/game-board.engine.service', () => ({ writeHeartbeat: jest.fn() }))` and `jest.mock('@/modules/shared', () => ({ useToast: jest.fn() }))` (mocked to return `{ toast: jest.fn() }`); update every existing `mockUseGameBoard` call site only if it breaks (it shouldn't — `useToast` is mocked independently). New cases:
  - `onDismiss` sets `isDismissing` to `true` synchronously (before the mocked promise resolves) and calls `writeHeartbeat` with `gameState.id` and `localPlayer.id`.
  - Resolving the mocked `writeHeartbeat` promise resets `isDismissing` to `false` and does not call `toast`.
  - Rejecting it resets `isDismissing` to `false` and calls `toast` with `{ title: "Still can't reach you", description: 'Check your connection and try again.', variant: 'destructive' }`.
  - Race guard: start `onDismiss` while the dialog is open, then rerender with a fresh `lastSeenAt` (or `isBot: true`) so `viewModel.isOpen` becomes `false` *before* the mocked `writeHeartbeat` promise rejects — assert `toast` is NOT called.
  - The countdown tick effect still runs (existing `countdownLabel` test) while `isDismissing` is `true` — reuse the existing tick test pattern with `onDismiss` fired first.
- `ConnectionWarningDialog.test.tsx` (tester-b):
  - Remove/replace `'offers no buttons, so there is nothing to confirm or cancel'`.
  - `getByRole('button', { name: "I'm back" })` is present and enabled when `isDismissing: false`; shows `lucide-icon-refreshcw`.
  - With `isDismissing: true`, the button is disabled, labeled "Checking…", shows `lucide-icon-loader2`.
  - Clicking the button calls the `onDismiss` prop exactly once.
  - Existing Escape/overlay-click tests (`lines 56-71`) stay, unchanged — still assert the dialog stays open.
- `ConnectionWarningDialog.preview.tsx` states (preview-a): keep existing "Warning"/"Expiring"; add "Dismissing" using the new `dismissingViewModel` fixture (`isDismissing: true`) so the spinner/disabled state is visible in the testbed without a live write.
- ui-verify (manual, after implementation): screenshot at 390×844 confirming the countdown is one line and the button is full-width; screenshot at 1280×720 confirming the button is right-aligned and the countdown is the larger size.
