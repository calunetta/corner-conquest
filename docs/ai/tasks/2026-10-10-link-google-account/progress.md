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
- [x] committed: b3d607b

## Phase 2: Google icon, Link button, Login/Lobby wiring, previews, docs
- [x] plan revision approved (architect-b) — firestore.rules addition
- [x] firestore.rules + firestore.rules.test.ts (implementer-a, tester-a): loosens the `usernames/{username}` update rule so `bindUsernameToAccount`'s pre-popup write (Phase 1) is actually allowed in production
- [x] firestore.rules checks: `npm run test:rules` (Firestore emulator, Java 21)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] docs-sync (structure-and-state.md §3.1, incl. the rules change)
- [x] checks: typecheck, lint, unit tests, build
- [x] UI verified (ui-verify): Login (both breakpoints), LinkGoogleAccountButton preview (4 states), Lobby guest state (1280×720 and 390×844, no overflow, ≥44×44 mobile target)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-10 ui-designer-a/b: DONE, lobby placement + GoogleIcon + states, APPROVED
2026-10-10 architect-a: DONE, plan.md drafted, bind-before-popup ordering decision
2026-10-10 architect-b: DONE, plan APPROVED
2026-10-10 implementer-a: DONE, linkGoogleAccount + linkWithGoogle implemented
2026-10-10 tester-a: DONE, 173/173 tests passing
2026-10-10 architect-b (final-review): DONE, Phase 1 APPROVED
2026-10-10 phase 1 committed: b3d607b
