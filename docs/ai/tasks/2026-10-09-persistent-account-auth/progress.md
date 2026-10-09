# Progress: Persistent account system (Google sign-in)

Tier: L · Phases: 4

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Firebase Auth emulator + Firestore rules
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint pass; `npm run test:rules` not run — no Java 21 runtime in this environment; rules logic verified by hand (see review.md)
- [x] final review (architect-b)
- [x] committed: 44ae2a0

## Phase 2: Account service + identity hook
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, `npx jest src/modules/session`
- [x] final review (architect-b) — APPROVED on re-review, see review.md
- [ ] committed: <hash>

## Phase 3: Login UI
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, `npx jest src/modules/session src/testbed`
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 4: Docs and full verification
- [ ] docs-sync (`structure-and-state.md` §3.1, `systems-and-visuals.md` §6.12)
- [ ] checks: typecheck, lint, `npm test`, `npm run test:rules`, `npm run test:e2e -- e2e/auth-and-lobby.spec.ts`, `npm run build`
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
