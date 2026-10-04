# Progress: Migrate the remaining 13 game dialogs into src/modules

Tier: L · Phases: 5

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: cards domain, batch 1 — CardsDialog, ProductiveCardDialog, SpecialIslandRollDialog, AbilitiesDialog
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 1cb8ac3

## Phase 2: cards domain, batch 2 — SabotageDialog, WealthyDialog, StealResourceDialog; shared/player-sprite
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 2a396f1

## Phase 3: combat domain, batch 1 — ArmySelectionDialog, AttackSelectionDialog, MonsterSelectionDialog
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 15981ce

## Phase 4: combat domain batch 2 (PositionDialog) + session domain (ConfirmExitDialog, HostLeaveDialog)
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 5: Verification and docs
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-b: docs/README.md)
- [ ] tests (full suite + e2e if available)
- [ ] previews (all 13 components, browser smoke)
- [ ] checks: typecheck, lint, unit tests, build
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-03 architect-a: DONE, wrote 5-phase plan.md (cards/combat/session domains)
2026-10-03 architect-b: CHANGES REQUESTED, @/lib/card-data|player-data import-source conflict with concurrent row #2 task
2026-10-03 architect-a: DONE, revised import sources to @/modules/game-rules
2026-10-03 architect-b: APPROVED, plan.md Status: APPROVED
2026-10-03 implementer-a/implementer-b: DONE, Phase 1 cards batch 1 built, cross-reviewed, APPROVED
2026-10-03 tester-a: DONE, 71 logic/characterization tests, 1 non-blocking gap (canAfford boundary)
2026-10-03 tester-a: DONE, added canAfford boundary case
2026-10-03 tester-b: APPROVED, 28 view tests, reviewed tester-a's tests
2026-10-03 preview-a: DONE, 4 testbed previews + registry
2026-10-03 coordinator: checks clean (typecheck/lint/test — only pre-existing sibling-task failures), ui-verify PASS all 4 previews desktop+mobile
2026-10-03 architect-b: CHANGES REQUESTED (final review), legacy files + characterization tests not deleted
2026-10-03 implementer-b: DONE, deleted 4 legacy .tsx files
2026-10-03 tester-a: DONE, deleted 4 characterization test files
2026-10-03 architect-b: APPROVED (final review, second pass)
2026-10-03 architect-b: CHANGES REQUESTED (Phase 2 final review), legacy SabotageDialog/WealthyDialog/StealResourceDialog + characterization tests + ResourceDialogs.test.tsx not deleted
2026-10-03 implementer-b: DONE, deleted 3 legacy .tsx files
2026-10-03 tester-a: DONE, confirmed ported assertions, deleted 4 legacy test files (__tests__/ now empty)
2026-10-03 architect-b: APPROVED (Phase 2 final review, second pass)
