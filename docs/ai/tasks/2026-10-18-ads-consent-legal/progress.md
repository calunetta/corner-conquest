# Progress: Ads, consent and legal — Phase 0A/0B (legal pages, consent)

Tier: L (sub-phases of the Phase 0 L-tier task, itself part of the XL epic) · Phases: 3

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

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
