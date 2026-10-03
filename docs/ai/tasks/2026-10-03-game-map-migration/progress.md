# Progress: Migrate game map/board visuals to src/modules/map

Tier: M · Phases: 3

## Phase 1: MapZoomControls + the pan/zoom hook
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: IslandTile and its tile children (+ AnimatedMonster, DeathEffect)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Phase 3: MapGrid, MapDecorations, GameBoard wiring, docs
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a)
- [ ] checks: typecheck, lint, unit tests, build
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-03 architect-a/architect-b: plan.md APPROVED after 2 revision rounds (fog-of-war localPlayer fidelity, AnimatedMonster attack-frame transform, stale hud-migration note, null/[] contract contradiction).
2026-10-03 implementer-a/implementer-b: Phase 1 implementation DONE. implementer-b's cross-review BLOCKER ("7 type errors") was stale/wrong — coordinator verified `npm run typecheck` directly: clean for map files. Real finding was a contract deviation (PanState exposed raw `setPan`+`clampPan` instead of plan's `setPanClamped`); implementer-a fixed it. Open items for Tests/final-review stages: `MapGrid.pan.hook.ts` is 156 lines vs the 150-line cap (flagged, no further split viable per implementer-a — architect-b to decide); implementer-a's own `MapGrid.pan.hook.test.ts`/`MapGrid.pan-zoom.hook.test.ts` have 2 failing tests from its own test authoring (unmocked rAF batching, and a zoom-out case starting already at the zoom floor) — these 3 test files are tester-a's per the File plan, so tester-a should author them properly per the Test plan spec (plan.md:552-554) rather than patch implementer-a's draft.
2 pre-existing `npm run typecheck` errors in `src/modules/hud/` (ActionsPanel/PlayerInfo) belong to the concurrent row #5 task running in another session — out of scope here, not touched.
2026-10-03 preview-a: MapZoomControls preview reviewed/complete, but reported BLOCKER on `npm run lint` failing (MapGrid.pan.hook.ts 156 lines). Coordinator confirmed the file is genuinely splittable (drag-gesture capture vs. pan-state/clamping are separate responsibilities) and routed a concrete split back to implementer-a instead of treating it as an architect-b trade-off, since CLAUDE.md requires lint clean with zero warnings. implementer-a extracted `MapGrid.drag-gesture.hook.ts` (122 lines; pan.hook.ts now 99 lines), public `PanState`/`usePan` contract unchanged. Coordinator verified directly: lint 0 errors, 66/66 tests passing, typecheck clean for map files. New file is a planning deviation (not in plan.md's File plan) — flagged for architect-b's final review.
2026-10-03 implementer-b: deleted orphaned `src/testbed/legacy/MapZoomControls.preview.tsx` (plan.md File plan row 81, end-of-Phase-1 cleanup it had missed). Its accompanying report repeated a stale BLOCKER (setPan/setPanClamped mismatch) from its original cross-review, predating implementer-a's fix — coordinator re-verified directly: setPanClamped is correctly implemented and used throughout, lint/typecheck/tests all clean. Treated as resolved, not a real blocker.
Phase 1 build, tests, previews, and checks (typecheck/lint/unit tests/ui-verify) all done and directly verified by the coordinator. Proceeding to architect-b final review.
