# Triage: Fix flaky mobile e2e cleanup timeout

Request: not requested yet — logged by architect-b while final-reviewing the Firestore emulator task. Not executed in that session.
Type: bug
Tier: S
Pipeline: tester-a implementer-a
Overrides: none
Phases: 1

## Why this tier
One flaky spec, root cause already found, fix is localized to two files.

## Evidence
`e2e/map-viewport.spec.ts:78-121` (mobile viewport test): ends without waiting for the lobby to reappear after clicking "Confirm & Leave" (the desktop test at line 75 does wait). `test.afterEach` then runs `safeCleanupGame` (`e2e/e2e-cleanup.ts:13`), which calls `exitBtn.click()` with no timeout while the board is mid-unmount, and the click hangs until the 30s per-test timeout fires, failing the test on an otherwise-passing run.

## Scope
- In: add the same "wait for Game Lobby" assertion the desktop test has, at the end of the mobile test; give `safeCleanupGame`'s `.click()` calls a short explicit `{ timeout }` so a hung click fails fast and visibly instead of eating the whole test budget.
- Out: any other e2e spec; the emulator and build setup (unrelated, already verified working).
