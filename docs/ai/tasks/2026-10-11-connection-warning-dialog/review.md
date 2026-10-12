# Final review: Connection-lost warning dialog before bot takeover, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit` exits with no output).
- `npx eslint src/modules/game-board/components/ConnectionWarningDialog src/modules/game-board/index.ts src/features/game/components/GameDialogManager.tsx src/testbed/registry.ts`: `0 errors, 1 warning` — the warning is `GameDialogManager.tsx` being skipped by ESLint's ignore pattern (pre-existing `LEGACY_PATHS` exemption, not a finding).
- `npx jest src/modules/game-board`: `Test Suites: 16 passed, 16 total` / `Tests: 240 passed, 240 total`.
- ui-verify: read `test-results/ui-verify/testbed-game-board-connection-warning-state-{Warning,Expiring}--desktop.png` and `--mobile.png`. Warning state: amber `WifiOff` icon + `text-amber-400` countdown "Taking over in 0:18". Expiring state: destructive-red icon + countdown "Taking over in 0:07". Desktop renders cleanly; mobile (390px) wraps the countdown to two lines, matching preview-b's logged non-blocking cosmetic nit — still fully legible, no truncation.

## Plan adherence
- Non-interactive `AlertDialog` with `WifiOff`, "Connection lost" title, body copy, live "Taking over in m:ss" countdown: met — `ConnectionWarningDialog.tsx:30-45`, screenshots confirm rendered copy.
- Cannot be dismissed (no buttons, Escape/overlay-click suppressed): met — no `AlertDialogFooter`/Action/Cancel in `ConnectionWarningDialog.tsx`; `onEscapeKeyDown={keepOpen}` at `:32` calls `preventDefault`; Radix's `AlertDialogOverlay` (`src/components/ui/alert-dialog.tsx:15-28`) has no click handler of its own, so no `onPointerDownOutside` override is needed — confirmed by reading that file, not assumed. `ConnectionWarningDialog.test.tsx:56-71` exercises both paths.
- Countdown updates ≥1/s, escalates under 10s, reaches "0:00" without erroring: met — `ConnectionWarningDialog.map.ts:30-31` floors `remainingMs` at 0 and flips `isExpiring` at `<= 10_000`; `ConnectionWarningDialog.hook.test.ts:181-195` ticks the label down once per second; `ConnectionWarningDialog.map.test.ts:77-115` covers the 0-floor and the `<=` boundary.
- Closes itself next render after a fresh heartbeat or the seat leaving playing/human state: met — `useConnectionWarning` recomputes from `gameState`/`localPlayer` on every render, no gating on the interval; `ConnectionWarningDialog.hook.test.ts:120-134,165-221` cover fresh-heartbeat, `isBot` flip, and status-leaves-playing, all closing without an extra tick.
- Tone plays exactly once per hidden→open transition, not while open, re-arms after close→reopen: met — `playConnectionWarningTone` called from a `useEffect` keyed on `viewModel.isOpen` (`ConnectionWarningDialog.hook.ts:50-52`), so React's own effect-dependency semantics (not a ref) gate the once-per-transition behavior; `ConnectionWarningDialog.hook.test.ts:100-163` cover fire-once, no-repeat-while-open, and the recovery→relapse re-arm case the architect flagged as highest risk.
- No change to `STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, `HEARTBEAT_INTERVAL_MS`, or any `game-rules` reducer: verified — `git diff` touches only the new component folder, `game-board/index.ts`, `GameDialogManager.tsx`, `testbed/registry.ts`, and the docs file; `game-board.staleness.hook.ts` and `game-board.heartbeat.hook.ts` are read-only imports (`STALE_THRESHOLD_MS` imported, not redefined, at `ConnectionWarningDialog.hook.ts:3`).

Contracts match the plan's `ConnectionWarningViewModel`, `toConnectionWarningViewModel` signature, `WARNING_THRESHOLD_MS = 25_000`, `playConnectionWarningTone`, `useConnectionWarning`, the view/connected split, and the `styles` cva shape, all confirmed by direct read against `plan.md`'s contract block. `GameDialogManager.tsx:74` renders `<ConnectionWarningDialog />` unconditionally, outside the `isMyTurn` block, as specified.

One implementation improvement over the plan's contract text, not a deviation worth requesting changes on: the plan's prose described tracking the open transition "with a ref, not state, so the tone call itself never triggers a re-render" — the actual code uses a `useEffect` keyed on `viewModel.isOpen` instead, which achieves the same "fires once per transition, no extra render" outcome through React's standard effect-dependency mechanism and is simpler to read than a manual ref. Confirmed via the hook tests that the once-per-transition and re-arm guarantees hold.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | n/a (git history) | The docs-sync bullet for this feature (`docs/architecture/systems-and-visuals.md:136`) landed inside commit `d9bfa3a` ("fix(map): size resource nodes…"), an unrelated prior commit from a different concurrent task, rather than in a commit of this task. Content is correct and already present at HEAD; nothing left to change in the file itself. | coordinator | No — bookkeeping only, not a code or doc-content defect. Flagging so this task's own commit (step 13) doesn't try to re-add already-committed content, and so the commit message history isn't read as implying map work touched connection handling. |

No other defects found.

## Docs
- `docs-sync`: ran in a prior phase step, updated `docs/architecture/systems-and-visuals.md` §6.14 (one bullet, verified present at line 136 and verified against the shipped hook/map/view). See Finding #1 for the commit-attribution note.
