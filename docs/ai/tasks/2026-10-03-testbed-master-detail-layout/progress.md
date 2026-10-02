# Progress: Testbed master-detail layout

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Sidebar, shell, wiring
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b) — not in this pipeline (triage.md:6); skip
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, wrote plan.md (file plan, contracts, 25-step phase 1, test plan) and this progress.md.
- 2026-10-03 architect-b: DONE (final-review, static), APPROVED; flagged browser-only checks as outstanding plus 2 cosmetic nits (nested ternary in TestbedSidebar.map.ts, `active`→`isActive` naming).
- 2026-10-03 coordinator: fixed the 2 cosmetic nits directly (non-blocking, recorded here per swarm rules); typecheck/lint re-confirmed clean.
- 2026-10-03 coordinator: ui-verify — /testbed (empty state), /testbed/map-zoom-controls (active-row highlight, contrast OK), /testbed desktop+mobile, snapshot.mjs --all discovery unaffected (2 previews found, 0 testbed-missing). Mobile collapse-by-route confirmed (list-only at /testbed, detail-only at /testbed/<slug>).
