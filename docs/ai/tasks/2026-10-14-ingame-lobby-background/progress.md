# Progress: In-game lobby-style background + toggle

Tier: M · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Shared preference + gradient constant
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [x] committed: e9c10dc

## Phase 2: HUD toggle + legacy wiring
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] docs-sync (structure-and-state.md)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-14 architect-a: DONE, wrote plan.md (2 phases) and this progress.md
2026-10-14 ui-designer-a/b: DONE, ui-design.md approved
2026-10-14 architect-a/b: DONE, plan.md APPROVED
2026-10-14 implementer-a/b: DONE, phase 1 shared store/hook + gradient constant, cross-reviewed APPROVED
2026-10-14 tester-a/b: DONE, phase 1 logic tests, one revise round, APPROVED
2026-10-14 architect-b (final-review): DONE, phase 1 APPROVED, no findings
2026-10-14 coordinator: committed phase 1 (e9c10dc)
