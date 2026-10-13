# Progress: Home Islands lobby/login background

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Home Islands background rebuild + persistent mount
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 4018b4a

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-14 preview-a: DONE, rewrote LobbyBackground.preview.tsx (Default state), wrapped the fixed root in a relative/overflow-hidden testbed stage.
- 2026-10-14 preview-b: DONE (round 1), real-browser check of /testbed/lobby-background and the live / route (Login + Login→Lobby transition) at desktop and mobile; confirmed single persistent mount (no remount on navigation, 0 DOM removals observed), monster clip holds, found mobile islands fully hidden behind the Login card.
- 2026-10-14 implementer-b: DONE, fixed mobile defect — islands now `hidden md:block`.
- 2026-10-14 preview-b: DONE (round 2, re-verify), confirmed mobile fix: islands hidden below md with no layout glitch, desktop unaffected. VERDICT: APPROVED.
- 2026-10-14 docs-sync: DONE, updated docs/architecture/structure-and-state.md and systems-and-visuals.md.
- 2026-10-14 architect-b: DONE (final review, 2nd attempt after a transient rate-limit failure on the 1st). VERDICT: APPROVED.
