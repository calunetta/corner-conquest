# Progress: Replace a leaving player with a bot; restrict reconnect to their own match

Tier: L · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: bot takeover on exit (in-progress matches only)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: heartbeat and staleness detection
- [ ] implementation (implementer-a)
- [ ] tests (tester-a)
- [ ] checks: typecheck, lint, unit tests
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: reconnect-and-reclaim
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-10 architect-a: DONE, plan.md revised — resolved Open Questions, reconciled identity model with persistent-account-auth's shipped Firebase-Auth-uid playerId, added heartbeat/staleness-check mechanism as its own Phase 2, split handlePlayerExit's scope to playing-status only, added deferred-reclaim-at-turn-boundary design. Status set to PLANNED.
2026-10-10 architect-b: CHANGES REQUESTED — writeHeartbeat's dotted-array-index updateDoc path is invalid Firestore syntax; lobby-restriction risk needed verifying against actual routing; CreateGameDialog needed gating against vacantMatch; anon-to-Google limitation needed explicit surfacing.
2026-10-10 architect-a: DONE, plan.md revised — writeHeartbeat now a runTransaction whole-array read-modify-write; confirmed no /game/[id] route exists (src/app/page.tsx uses root useState, not a URL param), Risk replaced with that fact; added CreateGameDialog gating to File plan and Phase 3 steps 4/6; added a "Known limitations" section surfacing the no-backend and no-anon-to-Google-linking limitations. Resubmitted for second architect-b pass.
