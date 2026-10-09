# Progress: Island tile visual redesign (resources, base layout, cloud density)

Tier: M · Phases: 2

## Phase 1: Design pass + cloud density
- [x] ui-design spec (ui-designer-a)
- [x] ui-design reviewed (ui-designer-b)
- [x] plan approved (architect-a, architect-b) — round 3, both fixes (gap-fillers + mid-edge unflag) locked
- [x] implementation (implementer-b) — on disk, matches plan.md exactly (verified)
- [x] tests (tester-b) — 56/48 literal count pins added, 21/21 passing
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: f30ad4a

## Phase 2: TileResources + IslandTile base layout rework
- [ ] plan approved (architect-a, architect-b)
- [ ] implementation (implementer-b)
- [ ] tests (tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-09 ui-designer-a: DONE, ui-design.md Spec written (cloud density fully specced for Phase 1; TileResources/IslandTile base-layout first pass specced for Phase 2). Corrected plan.md's cloud count (48 not 40 entries). Found pre-existing bug: TileResources.preview.tsx uses wrong sprite paths (gold.gif/wood.gif vs real mine.png/tree.gif) causing a 404 - flagged for Phase 2, not fixed.
2026-10-09 ui-designer-b: DONE, ui-design.md reviewed and APPROVED. Folded 3 citation corrections (line ranges, gold.gif exists vs wood.gif missing, base fixtures have zero not one resource). No design-direction changes.
2026-10-09 preview-a: DONE, confirmed existing Desktop/Mobile preview states cover the plan, no new preview needed.
2026-10-09 preview-b: CHANGES REQUESTED — 56 clouds render and no console errors, but 2 real defects found in browser: (1) the 8 gap-filler clouds use -5%/105% offsets and are clipped outside the visible board (overflow-hidden in MapGrid, overflow-x-auto in testbed) so they never paint; (2) mobile still renders only 40/56 clouds (existing mid-edge clouds are desktopOnly), contradicting the spec's "same coverage on mobile" claim. Routed back to ui-designer-a (revise).
2026-10-09 ui-designer-a (revise): DONE, moved the 8 gap-fillers from -5%/105% to 2%/98% (matches FIXED_ROCK_LAYOUT's 3%/97% corner convention); rewrote the mobile-coverage criterion instead of just loosening it.
2026-10-09 ui-designer-b: CHANGES REQUESTED — clipping fix verified correct, but the mobile-coverage rewrite had a math error (claimed 16 desktopOnly clouds/2-per-edge; actual is 8, all corner-cluster-only, no edge cloud is desktopOnly) giving a wrong "40 of 56" instead of the real "48 of 56". Routed back to ui-designer-a (revise).
2026-10-09 ui-designer-a (revise): DONE, corrected to "8 of 48, corner-clusters only" / "48 of 56"; fixed a false cloud-t2/cloud-t6 desktopOnly example.
2026-10-09 ui-designer-b: APPROVED. Also fixed one unrelated minor drift it found (TileResources scatter-slot band text said "6-38%", code is "10-38%").
2026-10-09 architect-a (revise): DONE, updated plan.md's Contracts to the 8 gap-filler 2%/98% values and "48 of 56" mobile math; self-set Status: APPROVED.
2026-10-09 architect-b: CHANGES REQUESTED, reset Status. Found a real scope gap: 16 cloud entries are desktopOnly (8 corner wisps + 8 mid-edge), not 8 — appending only the 8 new gap-fillers leaves mobile at 40/56, not 48/56, because plan.md never touches the pre-existing mid-edge entries. Also found ui-design.md had independently been revised a third time on disk (not by this session's agents) while the review was running, and that third revision already fixes this exact gap (un-flags the 8 mid-edge clouds, repositions the 4 left/right ones from -4%/104% to 2%/98%), DOM-count-verified at 56 desktop / 48 mobile. Routed back to architect-a to extend plan.md to match.
2026-10-09 ui-designer-a: DONE (revise round 2), ui-design.md corrected: gap-filler clipping was a width-vs-height-axis bug (not a blanket overflow rule), fillers repositioned to 2%/98%; also found 16 (not 8) desktopOnly cloud entries, un-flagged + repositioned the 8 mid-edge ones, honest mobile target is 48/56 clouds (not full parity).
2026-10-09 ui-designer-b: DONE (revise round 2), re-verified all claims live via Playwright, applied+reverted the fix to confirm visFrac 0.53-0.82 post-fix vs 0/0.32 pre-fix, DOM counts match (56 desktop/48 mobile). APPROVED.
2026-10-09 architect-a/architect-b (round 2): DONE, plan.md Contracts extended to cover the 8 mid-edge entry edits (desktopOnly removal + position fix) alongside the 8 gap-filler entries. Re-verified independently by a fresh architect-a pass. Net: 56 clouds desktop, 48 mobile. plan.md Status: APPROVED.
2026-10-09 implementer-b (revise): DONE, applied the corrected 2%/98% values to all 16 gap-filler + mid-edge entries, removed desktopOnly from the 8 mid-edge ones. typecheck/lint/unit tests clean.
2026-10-09 tester-b (revise): DONE, added explicit toVisibleDecorations(true/false) length 48/56 assertions. Coordinator removed a duplicate test block left by a second writer. 20 tests passing, typecheck/lint clean. npm run test:e2e/rules not run (no Java 21).
2026-10-09 preview-b (revise): CHANGES REQUESTED — counts (56/48) and no-clipping on the 16 round-2 clouds confirmed correct. But found desktop left/right perimeter gap at 24.5% (limit ~8%): 10 untouched mid-edge entries (cloud-l1/l3/l4/l5/l7, cloud-r1/r3/r4/r5/r7) still sit at -4%..-7%/104%..107% left offset, fully clipped on the wide (918px) desktop board. Mobile unaffected (narrower board, same offsets partially visible). Routed to architect-a to lock the same 2%/98% fix for these 10 entries.
2026-10-09 architect-a/architect-b (round 3/4): DONE, plan.md Contracts extended with a third table for 10 more clipped entries (cloud-l1/l3/l4/l5/l7, cloud-r1/r3/r4/r5/r7), left moved to 2%/98%, top unchanged. APPROVED.
2026-10-09 implementer-b (round 3): DONE, applied the 10-entry left-only fix. typecheck/lint clean. Unit tests re-confirmed 20/20 passing (already covered 48/56 correctly).
2026-10-09 preview-b (round 3 re-check): DONE, APPROVED — DOM counts 56/48 confirmed, desktop left/right gap now 0% (was 24.5%), top/bottom 4.5%, mobile all 0%, no console errors. Phase 1 acceptance criteria met. Minor non-blocking note: top/bottom row visible-share (22-32%) slightly below ui-design.md's claimed 29-34% — cosmetic, judgement call, not a numeric failure.
2026-10-09 coordinator: full-repo typecheck/lint/jest (src/modules/map) all clean (344/344 tests).
