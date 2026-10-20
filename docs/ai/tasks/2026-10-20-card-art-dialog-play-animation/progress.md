# Progress: Card art in CardsDialog, card-play animation, card icons in the game log

Tier: L · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: CardFace + CardsDialog tile layout (also commits the card-art prerequisites: card-art.ts, card-art.test.ts, cards index export, public/sprites/cards, scripts/art)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 6f2d373

## Phase 2: CardPlayOverlay + local trigger on Use (reduced-motion fallback)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: a2fc4ff

## Phase 3: `cardName` on card-use log entries + GameLog card icon + docs-sync
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs-sync (docs/architecture/special-cards.md)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-20 architect-a: DONE, plan.md (3 phases) and progress.md drafted
2026-10-20 architect-b: DONE, plan reviewed, APPROVED (2 wording/contract fixes folded in)
- 2026-10-20 phase 1: build/tests/previews approved; typecheck, lint, jest 303 suites / 4109 tests pass; preview-b screenshots in test-results/ui-verify; final review APPROVED. e2e: none planned for this phase.
- 2026-10-20 phase 2: build/tests/previews approved; preview-b measured overlay gone by 1196/1040/1163 ms, click-through OK; typecheck, lint, jest 306 suites / 4140 tests pass; final review APPROVED. GameDialogManager wiring has no unit test (legacy file, accepted).
- 2026-10-20 phase 3: build/tests/previews approved; preview-b found 16px icons muddy + text misaligned, implementer-b fixed (20px icon, fixed icon slot), re-verified; docs-sync updated special-cards.md §6.6 and a pointer in systems-and-visuals.md §6.10; typecheck, lint, jest 306 suites / 4185 tests pass; final review APPROVED. e2e not run: no Java 21 (plan lists none).
