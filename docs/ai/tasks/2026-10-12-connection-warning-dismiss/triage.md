# Triage: Manual dismiss + mobile wrap fix for the connection warning dialog

Request: Two follow-ups to the connection-lost warning dialog shipped in `docs/ai/tasks/2026-10-11-connection-warning-dialog` (commit `c4f9014`): (1) tighten the mobile countdown so "Taking over in 0:18" no longer wraps to two lines at 390px; (2) give the player a way to close the dialog themselves if they're actually back, confirmed with the user to mean a button that forces a fresh heartbeat write and closes only once it succeeds — not a no-op local hide, so it can't be used to dodge a real disconnect.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet
Phases: 1

## Why this tier
- This reverses an explicit, reviewed design decision from the prior task: the dialog currently has **zero buttons** and suppresses Escape/overlay-click entirely (`src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.tsx`, `onEscapeKeyDown={keepOpen}`; `AlertDialogContent` has no `onOpenChange`). Adding a real close affordance is a genuine interaction/visible-UI change to an already-approved spec, not a pure style tweak — needs `ui-designer-a`/`ui-designer-b` before the architects, per the tier table's "Insert ui-designer-a ui-designer-b ... when the Visible UI signal is yes."
- Touches the hook's state machine: `ConnectionWarningDialog.hook.ts` currently has no user-triggered action at all (`useConnectionWarning()` only reads `useGameBoard()` and ticks a clock). A manual "force heartbeat and close on success" action needs a new exported function from the hook (likely `onDismiss` or similar in `ConnectionWarningViewModel`), a pending/loading state while the write is in flight, and error handling if the forced write also fails (stays open, per the user's confirmed choice) — this is real hook logic, not a prop pass-through.
- Verified: `writeHeartbeat` (`src/modules/game-board/services/game-board.engine.service.ts`) and `sendHeartbeat` (`src/modules/game-board/game-board.heartbeat.hook.ts:14-21`) are the existing functions to reuse for the forced write — confirm at plan time whether `sendHeartbeat` (which already swallows and logs errors) or the lower-level `writeHeartbeat` (which the hook would need to wrap itself to add a pending/error state) is the right one to call, since the button needs to *see* failure (stay open) rather than always resolving.
- Visible UI: yes (new button, loading state while forcing, mobile layout fix). Gameplay: no — no rule or threshold changes. Data: no new Firestore field (the forced write reuses the existing `lastSeenAt` field).
- Docs: `docs/architecture/systems-and-visuals.md` §6.14's "Connection Warning" bullet currently says the dialog is "non-dismissable" — this task makes that false and must be corrected, so `docs-sync` is mandatory.
- Mobile wrap fix is a small, same-file CSS/layout change (`ConnectionWarningDialog.styles.ts`'s `countdown` cva, currently `text-4xl font-bold font-mono`) — folded into this task rather than split out, since it touches the same component and would otherwise force two swarm runs for one component in one day.

## Scope
- In: a close/dismiss button on the dialog, wired to force a heartbeat write and close only on success (stays open, possibly with a brief error/retry indication, if the write fails) — confirmed with the user via AskUserQuestion.
- In: tightening the mobile countdown layout so it doesn't wrap at 390px (e.g. a smaller mobile-breakpoint font size via `cva` compound variant, or `whitespace-nowrap` with a size step-down — architect/ui-designer's call).
- In: updating `docs/architecture/systems-and-visuals.md` §6.14's "Connection Warning" bullet to describe the new dismiss affordance, and its "non-dismissable" claim.
- In: updating `ui-design.md`'s "no close affordance" states table and acceptance criteria (prior criterion "clicking the dimmed overlay, or pressing Escape, does not close it" still holds for Escape/overlay — only the new explicit button closes it).
- Out: no change to `WARNING_THRESHOLD_MS`, `STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, or `HEARTBEAT_INTERVAL_MS`.
- Out: no change to the automatic heartbeat cadence (`useHeartbeat`) — this adds one extra, user-triggered write on top of it, not a replacement.

## Open questions
- None — the close-button semantics (force heartbeat, close only on success) were confirmed with the user via AskUserQuestion before this triage.
