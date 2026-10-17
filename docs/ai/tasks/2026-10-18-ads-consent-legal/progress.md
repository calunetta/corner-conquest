# Progress: Ads, consent and legal — Phase 0A/0B/0C (legal pages, consent, account deletion), Phase 1A (ads module)

Tier: L (sub-phases of the Phase 0 and Phase 1 L-tier tasks, themselves part of the XL epic) · Phases: 8

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Legal pages (`/privacy`, `/terms`)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-b)
- [ ] tests (tester-b)
- [ ] previews (none planned — see phase-0a-plan.md "Preview states")
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [x] docs-sync: `docs/architecture/structure-and-state.md`, `docs/architecture/systems-and-visuals.md`
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: Consent — Funding Choices loader (phase-0b-plan.md Phase 1)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-b)
- [ ] previews (none planned — see phase-0b-plan.md "Preview states")
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify) — limited: confirms no change with the env var unset; a real script load needs the user's actual Funding Choices URL (see phase-0b-plan.md "Open questions — blocking")
- [x] docs-sync: `docs/architecture/structure-and-state.md`, `docs/architecture/systems-and-visuals.md`
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: Consent — signal reader for Phase 1 ads (phase-0b-plan.md Phase 2)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a)
- [ ] tests (tester-a)
- [ ] previews (none planned — no UI consumes the reader yet, see phase-0b-plan.md "Preview states")
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify) — not applicable, no visual change in this phase
- [x] docs-sync: `docs/architecture/structure-and-state.md`
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 4: Account deletion — Firestore rules + service (phase-0c-plan.md Phase 1)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a) — includes `firestore.rules.test.ts` rewrite via `npm run test:rules`
- [ ] previews (none — no UI in this phase)
- [ ] checks: typecheck, lint, unit tests, `npm run test:rules` (emulator + Java 21 required; this
      pipeline's environment has neither — see phase-0c-plan.md's Goal/Risks — so the rule change is
      unverified here and must be run with Java 21 before deploy)
- [ ] UI verified (ui-verify) — not applicable, no visual change in this phase
- [ ] docs-sync: deferred to Phase 7
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 5: Account deletion — `DeleteAccountButton` component (phase-0c-plan.md Phase 2)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (deferred to Phase 6)
- [ ] previews (deferred to Phase 6)
- [ ] checks: typecheck, lint
- [ ] UI verified (ui-verify) — deferred to Phase 6
- [ ] docs-sync: deferred to Phase 7
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 6: Account deletion — tests, preview, wiring (phase-0c-plan.md Phase 3)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a — session index.ts wiring)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, registered in `src/testbed/registry.ts`)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify) — confirm/deleting/error states, confirm dialog does not auto-close
- [ ] docs-sync: deferred to Phase 7
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 7: Account deletion — docs (phase-0c-plan.md Phase 4)
- [x] plan approved (architect-b)
- [ ] implementation (none — docs only)
- [ ] tests (none — docs only)
- [ ] previews (none — docs only)
- [ ] checks: typecheck, lint
- [ ] UI verified (ui-verify) — not applicable, no visual change in this phase
- [ ] docs-sync: `docs/architecture/structure-and-state.md`, `docs/architecture/systems-and-visuals.md`
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 8: Ads — `AdSlot` component and flag (phase-1a-plan.md)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, registered in `src/testbed/registry.ts`)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify) — open all 4 states at `/testbed/<slug>`; first 3 render nothing, the
      4th shows the labelled dev placeholder, at desktop and mobile size
- [x] docs-sync: `docs/architecture/structure-and-state.md` §2 and `systems-and-visuals.md` §6.7
      (the ad slot is behind the flag, not mounted on any page; see phase-1a-plan.md)
- [ ] final review (architect-b)
- [ ] committed: <hash>

No ad network, no CSP, and no `src/app/page.tsx`/`next.config.ts` edit happen in this phase —
deferred to Phase 1B (roadmap.md Phase 1 scope), which needs the CMP vendor and ad network
confirmed first.

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
