# Progress: Migrate GameBoardHeader and GameStatusBadge to src/modules/hud

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: GameBoardHeader and GameStatusBadge
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 793abd6 (plus 057be00, which incidentally bundled in this task's files before the proper commit — see log)

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-03 implementer-a: DONE, logic files (types/map/hook/fixtures/index) for GameBoardHeader + GameStatusBadge.
2026-10-03 implementer-b: DONE, view files (tsx/styles), GameBoard.tsx wiring, also wrote test/preview files.
2026-10-03 implementer-b x implementer-a cross-review: APPROVED (no violations).
2026-10-03 implementer-a x implementer-b cross-review: CHANGES REQUESTED (inline icon classes in GameBoardHeader.tsx) -> fixed by implementer-b, re-checked: typecheck/lint/test pass.
2026-10-04 Note: all task files were swept into an unrelated commit 057be00 ("test(map): ...") by a concurrent session's subagent via broad `git add`; user decided to leave history as-is rather than split it out.
2026-10-04 tester-a: DONE, strengthened map/hook tests (36/36 passing, full suite 1398 passing).
2026-10-04 tester-b: DONE/APPROVED, strengthened view tests, removed CSS-class assertions (full suite 1420 passing). e2e not run: no Java 21 available (not required, no gameplay change).
2026-10-04 preview-a: DONE, added missing "Waiting - not host" state; 7 GameBoardHeader states, 4 GameStatusBadge states registered.
2026-10-04 preview-b: DONE/APPROVED, desktop+mobile screenshots confirm pixel-identical output to legacy.
2026-10-04 implementer-b: DONE, deleted legacy GameBoardHeader.tsx/GameStatusBadge.tsx, updated docs/README.md; typecheck/lint/test/build all pass.
