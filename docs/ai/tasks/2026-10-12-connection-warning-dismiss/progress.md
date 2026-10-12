# Progress: Manual dismiss + mobile wrap fix for the connection warning dialog

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: manual dismiss + mobile wrap fix
- [x] ui-design (ui-designer-a, ui-designer-b)
- [x] plan approved (architect-a, architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs sync (docs-sync)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-12 ui-designer-a: DONE, ui-design.md Spec — AlertDialogFooter + plain Button ("I'm back"), idle/pending/success/failure states, destructive toast on failure, mobile countdown text-2xl sm:text-4xl fix. Self-authored a review section again (same pattern as the prior task) — flagged and superseded.
2026-10-12 ui-designer-b: DONE, independent review. VERDICT APPROVED with two citation/wording fixes (motion-reduce precedent, aria-hidden claim) folded into the Final spec, no design change. Flagged a real race for architect-a: a forced heartbeat write can fail after the dialog already closed via the normal recovery/takeover path — the failure toast must not surface for an already-closed dialog. Required guard, not optional polish.
2026-10-12 architect-a: DONE, plan.md drafted (Status: DRAFT). onDismiss/isDismissing added to useConnectionWarning; calls writeHeartbeat directly (not sendHeartbeat, which swallows errors); success closes reactively via the existing Firestore subscription, not local state; stale-toast race guarded by a ref snapshotting isOpen checked in the write's .catch. AlertDialogFooter + plain Button (not AlertDialogAction). Countdown becomes text-2xl sm:text-4xl.
2026-10-12 architect-b: APPROVED (round 1). Re-verified every cited file/line directly, confirmed the race-guard design actually satisfies ui-design.md's flagged gap, grepped for other "non-dismissable"/"offers no buttons" references needing updates (none missed). plan.md Status: APPROVED.
2026-10-12 implementer-a + implementer-b: DONE. implementer-a: types/hook/fixtures, plus a type-only fix to ConnectionWarningDialog.map.ts (plan said "no change needed" but the map's return-type annotation made the new isDismissing/onDismiss fields unsatisfiable — narrowed to Omit<...>, no logic change). implementer-b: view/styles (AlertDialogFooter + Button, idle/pending icon-and-label swap, text-2xl sm:text-4xl mobile fix). Cross-review: implementer-b independently flagged the same map.ts gap implementer-a had already fixed — converged, no further action. Both APPROVED the other's files outright.
2026-10-12 tester-a: DONE, ConnectionWarningDialog.hook.test.ts — 6 new onDismiss/race-guard cases (sync isDismissing, writeHeartbeat args, success/failure+toast, stale-toast race suppressed, countdown keeps ticking while pending). 28/28 passing; typecheck clean on this file (2 pre-existing errors left for tester-b's file, as expected).
2026-10-12 tester-b: DONE, ConnectionWarningDialog.test.tsx — fixed the two typecheck gaps, replaced the false "offers no buttons" test, added button-presence/click/pending-state/pending-blocks-click cases. 44/44 passing across the whole component folder, typecheck/lint clean. VERDICT APPROVED on tester-a's hook tests, two non-blocking nits (one missing isDismissing-reset assertion on the race path, prefer waitFor over double Promise.resolve flush) — not worth a revise round.
2026-10-12 preview-a: DONE, added a third "Dismissing" state (dismissingViewModel) to ConnectionWarningDialog.preview.tsx; registry already had the slug. preview-b: DONE, VERDICT APPROVED — all three states verified at desktop/mobile, mobile wrap fix confirmed (countdown stays on one line now), Escape/overlay suppression still holds, no console errors. Success-close and failure-toast paths not browser-verifiable (need a live write); covered by unit tests only.
2026-10-12 coordinator: checks — typecheck clean; game-board module 274/274 passing.
2026-10-12 docs-sync: DONE, rewrote systems-and-visuals.md §6.14's "Connection Warning" bullet — removed "non-dismissable", documented the "I'm back" button, the forced writeHeartbeat call, the reactive close, and the stale-toast suppression. No other file needed a change.
