# Progress: Fix boat corner collision on contested Base tiles

Tier: M · Phases: 1

## Phase 1: Fix corner collision
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: a742c3c
- [x] follow-up: added a real testbed state exercising the fixed map function (requested after initial commit), committed: 87e4eca

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-04 architect-a: DONE, root cause — getCornerPosition ignored entryIndex for base tiles
2026-10-04 architect-b: DONE (2 rounds), plan APPROVED after docs-attribution fix
2026-10-04 tester-a: DONE, repro test + comment cleanup
2026-10-04 implementer-a: DONE, fix + docs/README.md split applied
2026-10-04 preview-a: DONE, confirmed existing testbed states render correctly
2026-10-04 architect-b (final-review): DONE, APPROVED, committed a742c3c
2026-10-04 coordinator: added "Contested base (real map function)" testbed state exercising the actual fixed logic, committed 87e4eca
