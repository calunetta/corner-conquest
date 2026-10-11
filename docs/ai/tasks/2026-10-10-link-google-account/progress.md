# Progress: Link Google account from guest, add Google logo to sign-in buttons

Tier: M · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Session auth — link a guest to Google, keep the username
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: Google icon, Link button, Login/Lobby wiring, previews, docs
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] docs-sync (structure-and-state.md §3.1)
- [ ] checks: typecheck, lint, unit tests, build
- [ ] UI verified (ui-verify): Login (both breakpoints), LinkGoogleAccountButton preview (4 states), Lobby guest state (1280×720 and 390×844, no overflow, ≥44×44 mobile target)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
