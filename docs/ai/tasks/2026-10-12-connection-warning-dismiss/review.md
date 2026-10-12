# Final review: Manual dismiss + mobile wrap fix for the connection warning dialog, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean (no output, `tsc --noEmit` exit 0)
- `npx eslint src/modules/game-board/components/ConnectionWarningDialog`: clean (no output). `npm run lint` (whole repo) reports 15286 pre-existing errors, all in `.claude/worktrees/*` (other parallel task worktrees) and legacy `src/features`/`src/lib` files untouched by this task; none in the ConnectionWarningDialog folder or `docs/architecture/systems-and-visuals.md`.
- `npx jest src/modules/game-board/components/ConnectionWarningDialog`: `Test Suites: 3 passed, 3 total`, `Tests: 44 passed, 44 total`
- `npm test -- src/modules/game-board`: `Test Suites: 18 passed, 18 total`, `Tests: 274 passed, 274 total`
- ui-verify: reviewed screenshots in `test-results/ui-verify/` — `testbed-game-board-connection-warning-state-Warning--mobile.png` (390×844: countdown "Taking over in 0:18" on one line, "I'm back" button full-width with `RefreshCw` icon), `testbed-game-board-connection-warning-state-Warning--desktop.png` (1280×720: button right-aligned, natural width, countdown at the larger size), `testbed-game-board-connection-warning-state-Dismissing--mobile.png` (disabled "Checking…" button with spinner, countdown still visible). No console errors visible in the captures.

## Plan adherence
- "I'm back" button with `RefreshCw` icon, enabled, in a footer row below the countdown — met (`ConnectionWarningDialog.tsx:47-56`; screenshot).
- Click disables button, swaps to spinning `Loader2`, label "Checking…", countdown keeps updating — met (`ConnectionWarningDialog.hook.ts:68-81` sets `isDismissing` synchronously; hook test "keeps the countdown ticking while isDismissing is true" passes; screenshot shows the pending state).
- Success closes the dialog reactively, same path as automatic recovery — met: `onDismiss` never sets local `isOpen` (`ConnectionWarningDialog.hook.ts:69-80`); hook test "resolving writeHeartbeat resets isDismissing to false and does not call toast" passes.
- Failure re-enables the button and shows a destructive "Still can't reach you" toast, dialog stays open, countdown keeps running — met: hook test asserts the exact toast payload (`title`, `description`, `variant: 'destructive'`) and `isDismissing` reset.
- Escape/overlay still don't close the dialog — met: existing tests at `ConnectionWarningDialog.test.tsx` ("stays open after Escape is pressed", overlay test) unchanged and passing; `keepOpen`/`onEscapeKeyDown` untouched in the diff.
- 390×844: button full-width, countdown single line, no wrap — met, confirmed in the mobile screenshot and by `styles.countdown`'s `text-2xl sm:text-4xl` step-down (`ConnectionWarningDialog.styles.ts:13`).
- 1280×720: button right-aligned (not full-width), countdown at the larger size — met, confirmed in the desktop screenshot; `AlertDialogFooter`'s `sm:justify-end` plus `dismissButton: 'w-full sm:w-auto'` (`ConnectionWarningDialog.styles.ts:21`).
- A failed forced write whose toast would fire after the dialog already closed through another path does not surface — met: hook test "does not show the toast when the dialog already closed via another path before the write rejects" drives the exact race (rerenders with a fresh `lastSeenAt` while the write is still pending, then rejects it) and asserts `toast` is not called, backed by the `isOpenRef` guard (`ConnectionWarningDialog.hook.ts:63-66,72`).

## Findings
None.

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md` §6.14 "Connection Warning" bullet — removed "non-dismissable", documented the "I'm back" button, the forced `writeHeartbeat` call, the reactive close, the failure toast, and the stale-toast suppression. Verified the edit is scoped to the correct bullet (`docs/architecture/systems-and-visuals.md:137`, §6.14 confirmed at line 133) and no other file still says "non-dismissable" or "offers no buttons" outside this task's own `docs/ai/tasks/2026-10-12-connection-warning-dismiss/` records and the prior task's historical `ui-design.md` (correctly left untouched, superseded decision).
