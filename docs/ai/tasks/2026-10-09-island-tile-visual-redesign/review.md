# Final review: Island tile visual redesign, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`)
- `npm run lint`: clean, no errors (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`)
- `npm test` (`npx jest src/modules/map`): `Test Suites: 27 passed, 27 total`, `Tests: 344 passed, 344 total`. Scoped to `src/modules/map/components/MapDecorations`: `Test Suites: 2 passed, 2 total`, `Tests: 20 passed, 20 total` — matches progress.md's logged 20/20.
- ui-verify: viewed `test-results/ui-verify/testbed-map-decorations-state-Desktop--desktop.png` and `testbed-map-decorations-state-Mobile--desktop.png` directly in this session. Both show clouds running continuously along all four perimeter edges with no visible gap; left/right edge clouds sit flush against the board's left/right border on both states; mobile shows a visibly sparser but still continuous set (consistent with 48 vs 56). Matches preview-b's round-3 re-check log in progress.md (DOM counts 56 desktop / 48 mobile, perimeter gaps 0% left/right, 4.5% top/bottom, no console errors).

## Plan adherence
Checked `src/modules/map/components/MapDecorations/MapDecorations.map.ts`'s diff against plan.md's three Contracts tables, field by field:

- **Gap-fillers (Contracts table 1, plan.md:48-60)**: `cloud-t0/t8/b0/b8/l0/l8/r0/r8` all present at `2%/9%/91%/98%`, `74×48`, opacity `0.8`, no `desktopOnly` key — matches verbatim.
- **Mid-edge edit (Contracts table 2, plan.md:64-85)**: `cloud-t2/t6` `top` `-4%`→`2%`, `cloud-b2/b6` `top` `104%`→`98%`, `cloud-l2/l6` `left` `-4%`→`2%`, `cloud-r2/r6` `left` `104%`→`98%`; `desktopOnly: true` removed from all 8 — confirmed in the diff, matches exactly.
- **Outer-cluster edit (Contracts table 3, plan.md:89-102)**: `cloud-l1/l3/l4/l5/l7` `left` moved to `2%`; `cloud-r1/r3/r4/r5/r7` `left` moved to `98%`; `top`/`src`/`width`/`height`/`opacity` unchanged on all 10, confirmed by diff (only `left` lines touched); no `desktopOnly` key added — matches.
- No entry outside these 18 touched lines (8 new + 8 edited + 10 edited) was changed. `toVisibleDecorations` and `CloudDef` untouched, as the plan specifies.

Acceptance criteria (plan.md:6-10), Phase 1 scope only:
- Perimeter clouds cover the outer margin densely, corner-to-edge and mid-edge gaps closed — met, per the Contracts diff and preview-b's round-3 DOM/gap measurements in progress.md.
- The other three criteria (TileResources scatter, collector-beside-node, IslandTile Base layout) are Phase 2 scope, correctly untouched this phase.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

No findings. Test additions in `MapDecorations.map.test.ts` match the plan's Test plan section exactly: `FIXED_CLOUD_LAYOUT` length 56, unique ids, `toVisibleDecorations(true/false).clouds` length 48/56, plus a gap-filler-mobile-visibility check. File plan scope respected — only the two owned files (`MapDecorations.map.ts` implementer-b, `MapDecorations.map.test.ts` tester-b) are touched.

## Docs
- `docs-sync`: not needed. This is a decorative-layout data fix (cloud sprite positions), not a documented game rule or architecture behavior change — no `docs/architecture/*.md` file describes cloud placement.

# Final review: Island tile visual redesign, phase 2

VERDICT: CHANGES REQUESTED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npm run lint`: clean, no errors (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`).
- `npm test` (`npx jest src/modules/map`): `Test Suites: 27 passed, 27 total`, `Tests: 370 passed, 370 total` — matches coordinator's logged count.
- ui-verify: viewed screenshots in `test-results/ui-verify/` directly in this session: `testbed-island-tile-state-Base-20island-20with-20resources--desktop.png`, `...--mobile.png`, `...-and-occupants--mobile.png`, `testbed-tile-resources-state-Resource-20with-20collector--desktop.png`, `testbed-tile-resources-state-Multiple-20resources--mobile.png`. All consistent with preview-b's round-3 log entry: collector badge sits beside the sheep sprite (not centered on it), Base crest shows no overlap with the 3 resource nodes at either clamp, DUAL-band preview now shows nodes at visually distinct top/bottom positions (the fixed round-2 preview bug). No console errors visible.

## Plan adherence
Diffed every Phase 2 file against plan.md's Contracts (plan.md:140-324), field by field, independent of the git-status snapshot:
- `TileResources.types.ts`: `slotStyle`'s `width?`/`height?` and `FarmingCollectorViewModel` (`size`/`side`/`offset`, same JSDoc wording) match the Contracts block verbatim.
- `TileResources.map.ts`: `SlotDef.width?/height?`, the 3-band `SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS` (`46%`/`20%`+`70%`/`20%`+`46%`+`70%`), `BASE_RESOURCE_SLOTS` (`4%`/`35%`/`65%`, `22%`/`22%`), `BADGE_SIZE_RATIO=0.55`/`BADGE_MIN_SIZE=22`, and the `badgeSize`/`badgeSide`/`badgeOffset` formula all match the Contracts code block verbatim, including the `slotStyleEntries.push` additions.
- `TileResources.styles.ts`: `collectorOverlay` trimmed to exactly `'absolute z-[35] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]'`, matching Contracts.
- `TileResources.tsx`: node-wrapper style spread reordered (`slotStyle` after the px `width`/`height`) and the collector `<div>`/`<Image>` built from `farmingCollector.size`/`side`/`offset`, matching Contracts verbatim.
- `IslandTile.styles.ts`: `baseContent` → `'absolute inset-0 flex items-center justify-center'`; `baseImageWrapper` → `'relative drop-shadow-[...]'` (fixed-px classes dropped) — both match Contracts exactly.
- `IslandTile.tsx`: crest wrapper `<div>` gains `style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}`, no other prop/child changed — matches Contracts exactly.
- Fixtures/previews (`TileResources.fixtures.ts`, `TileResources.preview.tsx`, `IslandTile.fixtures.ts`, `IslandTile.preview.tsx`): new fixtures (`resourceIslandWithTwoDistinctResources`, `baseIslandWithThreeResources`, `baseIslandWithResourcesAndOccupants`) and sprite-path fixes (`gold.gif`→`mine.png`, `wood.gif`→`tree.gif`, `collector_blue_idle.gif`→`farm_blue.gif`) match the plan's File plan rows 5/9/11. The `Multiple resources` preview state is now built through `toTileResourcesViewModel` itself (not hand-written literals), closing preview-b's round-2 finding.
- Tests (`TileResources.map.test.ts`, `TileResources.test.tsx`, `IslandTile.test.tsx`): cover every row of the plan's Test plan section (band positions, Base `width`/`height`, collector formula including floor/side cases, Base-node rendering alongside the crest) plus two extra cases tester-b's cross-review added (monster-island-with-defeated-monsters, Base collector geometry) — exceeds the plan, no gap.
- Acceptance criteria (plan.md:6-10): collector sits beside its node (screenshot + `offset`/`side` tests) — met; 3-band scatter reads as intentional composition — met (screenshot, band tests); Base layout fits without overlap at both clamp sizes — met per preview-b's round-3 measurements (0.86px-2.66px clearance) and this session's screenshots.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/architecture/systems-and-visuals.md:102` | "Active Collector Farming: ... harvest directly **on top of** the specific resource node" — this phase's whole point (and acceptance criterion 3) is that the badge now sits **beside** the node, never centered on it. The doc still describes the old, just-fixed behavior. | docs-sync | Yes |
| 2 | `docs/architecture/systems-and-visuals.md:124` | "Base castles ... are sized to ~48–56px" — the crest is now `max(18px, 44%)` of the tile's own padding box (`IslandTile.tsx`'s new inline style), not a fixed 48–56px box tied to Tailwind's `sm:` breakpoint. At mobile's `T=46` clamp it renders ~18px, well outside the documented range. | docs-sync | Yes |
| 3 | `docs/architecture/systems-and-visuals.md:100` | "Resources are distributed organically across island clearings (non-linear 2D scatter)" — the actual layout is a deterministic 3-band system (`20%/46%/70%` of `T`, alternating left/right), not a non-linear scatter. Pre-existing wording, but this phase's own Contracts make the structured-band design explicit, so it's now clearly wrong, not just loosely worded. | docs-sync | Non-blocking (cosmetic doc wording; doesn't contradict a test or a user-visible claim the way #1/#2 do) |

No code, test, or plan-adherence findings. The implementation matches plan.md's Contracts exactly, byte for byte, on every file in the Phase 2 File plan.

## Docs
- `docs-sync`: required, not yet run. CLAUDE.md principle 6 ("a change to game rules or architecture ... updates the relevant `docs/architecture/*.md` file in the same phase") applies here: this phase's own acceptance criteria changed the collector's documented position (on-top-of → beside) and the crest's documented sizing mechanism (fixed px → percent-of-`T`), both asserted in `docs/architecture/systems-and-visuals.md` §6.13. Route findings #1 and #2 to `docs-sync` before this phase's commit; #3 can be folded into the same pass since it's the same section.

Route findings #1 and #2 to `docs-sync` (mandatory agent); re-review once `systems-and-visuals.md` §6.13 is updated. Everything else (code, tests, previews, checks) is approved as-is and needs no further change.

# Final review: Island tile visual redesign, phase 2 (round 2, post docs-sync)

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`).
- `npm run lint`: clean, no errors (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`).
- `npm test` (`npx jest src/modules/map`): `Test Suites: 27 passed, 27 total`, `Tests: 370 passed, 370 total`.

## Docs re-verification
`git diff docs/architecture/systems-and-visuals.md` (§6.13) checked line by line against the shipped code:
- "Deterministic Node Placement" (line 100): bands `20%`/`46%`/`70%`, single node centred in middle band, two nodes top-left/bottom-right, three nodes top-left/middle-right/bottom-left — matches `DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`SINGLE_RESOURCE_SLOT` in `src/modules/map/components/TileResources/TileResources.map.ts:42-58` exactly (dual: `{top:20%,left:14%}`,`{top:70%,right:14%}`; triple: `{top:20%,left:12%}`,`{top:46%,right:12%}`,`{top:70%,left:12%}`).
- "Active Collector Farming" (line 102): badge beside the node, `55%` of reference size floored at `22px`, right by default / left when the node is anchored to the right edge — matches `BADGE_SIZE_RATIO = 0.55`, `BADGE_MIN_SIZE = 22` (`TileResources.map.ts:65-66`) and the `badgeSide`/`badgeOffset` computation (`TileResources.map.ts:150-153`: `badgeSide` is `'left'` only when `slot.right !== undefined && slot.left === undefined`, i.e. the node is right-anchored).
- "Rebalanced Base Tile Layout" (line 124): crest sized to `44%` of the base content box, floored at `18px` — matches `style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}` at `src/modules/map/components/IslandTile/IslandTile.tsx:48`.

Both round-1 findings (#1 stale "on-top-of" wording, #2 stale "48–56px" crest sizing) are fixed and now describe the shipped formulas, not just a restated goal. Finding #3 (non-blocking "non-linear 2D scatter" wording) was folded into the same pass and is gone — the section now states the deterministic 3-band layout.

## Findings
None.

Phase 2 fully approved: code, tests, previews, and docs all verified against plan.md's Contracts and the shipped behavior.
