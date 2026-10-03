# Progress: Migrate CombatDialog and MonsterCombatDialog to src/modules/combat

Tier: M · Phases: 3

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: CombatDialog
- [x] plan approved (architect-b)
- [x] characterization test written and passing against the legacy component (tester-a)
- [x] implementation (implementer-a: types/map/hook/fixtures/index; implementer-b: styles/view/wiring)
- [x] tests (tester-a: map/hook; tester-b: view)
- [x] preview (preview-a) registered in src/testbed/registry.ts
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) on the new preview
- [x] legacy CombatDialog.tsx and its characterization test deleted
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: MonsterCombatDialog
- [x] plan approved (architect-b)
- [ ] characterization test written and passing against the legacy component (tester-a)
- [ ] implementation (implementer-a: types/map/hook/fixtures/index; implementer-b: styles/screens/view/wiring)
- [ ] tests (tester-a: map/hook; tester-b: view)
- [ ] preview (preview-b) registered in src/testbed/registry.ts
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify) on the new preview
- [ ] legacy MonsterCombatDialog.tsx and its characterization test deleted
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: Verification and docs
- [ ] full checks: typecheck, lint, unit tests, build
- [ ] no remaining references to the deleted legacy dialog files
- [ ] browser smoke: both previews' states; game combat/monster-combat flow if reachable without Firebase credentials, otherwise e2e gameplay spec if the emulator and Java 21 are available, otherwise reported as not run
- [ ] docs/README.md updated (src/modules/combat/ layout, GameDialogManager bullet)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, wrote plan.md (Status: DRAFT) and this progress.md.
