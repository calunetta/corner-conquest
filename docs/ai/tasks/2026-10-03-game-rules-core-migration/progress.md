# Progress: Migrate game rules core logic into src/modules/game-rules

Tier: L · Phases: 4

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: data layer (card-data, player-data)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b) — no new tests needed, pure constant move; confirmed by architect-b final review
- [x] previews (preview-a, preview-b) — not applicable, no UI change
- [x] checks: typecheck, lint, unit tests — pass (701/703 repo-wide; 2 failures in unrelated concurrent game-header-migration task's files)
- [x] UI verified (ui-verify) — not applicable, no UI change
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: game-initializer split (monster-catalog, player-factory, map-generation, game-setup)
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: game-logic + turn-progression
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 4: bot-logic split + docs
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, plan drafted (4 phases: data layer, game-initializer split, game-logic+turn-progression, bot-logic split+docs)
