# Triage: SabotageDialog preview is stuck open

Request: Fix the SabotageDialog testbed preview — every state renders a modal `AlertDialog` that can never be dismissed, blocking the whole testbed page (including sidebar navigation).
Type: bug
Tier: S
Pipeline: tester-a implementer-a
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Root cause is known and isolated to one file: `src/testbed/legacy/SabotageDialog.preview.tsx:39-49`. `StaticSabotageDialog` renders the real `SabotageDialog` (`src/features/game/dialogs/SabotageDialog.tsx:23`, hardcoded `open={true}` on Radix `AlertDialog`) with `onSabotage`/`onClose` both wired to a true no-op (`ignoreClick`, line 5-7). `AlertDialog` is modal: it renders a full-screen overlay with a focus trap. With no real close handler, the overlay never goes away and blocks every click on the page underneath it — this is why it reads as "navigating to a different page, opening the dialog, and not allowing it to be closed."
- `MapZoomControls.preview.tsx`'s static states use the same `ignoreClick` pattern safely because that component isn't a modal — no overlay, nothing traps focus — so a no-op click just does nothing instead of locking the page.
- One file, one layer (view), obvious fix: give each state local open/close state (useState), matching the `Interactive` pattern already established in `MapZoomControls.preview.tsx`, so `onClose` (and ideally `onSabotage`) actually dismiss the dialog instead of being inert.

## Scope
- In: `src/testbed/legacy/SabotageDialog.preview.tsx` — wrap each state so the dialog can be closed and reopened (e.g. local `open` state + a "Reopen" trigger, or closing resets to a dismissed placeholder). A reproduction test proving the current code gets stuck, then the fix.
- Out: `SabotageDialog.tsx` itself (legacy, frozen, not modal-aware — no bug there, the component correctly expects to be used as a controlled dialog by a real page). `registry.ts` (no change needed). The in-flight testbed-master-detail-layout task.

## Open questions
- none
