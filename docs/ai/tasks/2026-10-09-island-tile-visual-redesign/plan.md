# Plan: Island tile visual redesign (resources, base layout, cloud density)

Status: APPROVED (Phase 1, pending architect-b round-4 re-review) — File plan/Contracts/Decisions now additionally cover the 10 outer-edge-cluster entries (`cloud-l1/l3/l4/l5/l7`, `cloud-r1/r3/r4/r5/r7`) preview-b found still off-box on the wide desktop board. Phase 2 (TileResources/IslandTile) stays a first-pass design direction per `ui-design.md`; its exact file-plan values are architect-a's job once Phase 1 ships.
Inputs: triage.md, ui-design.md (Final spec, APPROVED)

## Goal and acceptance criteria
- [ ] Perimeter clouds visibly and densely cover the outer ocean margin all the way around the board, not just thin clusters at the four corners and sparse edge points.
- [ ] `TileResources` sprite placement reads as a coherent, intentional island composition at normal play zoom (85% desktop default), not a scattered/odd arrangement — exact target defined by ui-designer-a/b after reviewing the current live render.
- [ ] The active-collector sprite on a resource node sits at the side of that specific node (not overlapping/centered on it) at a size that doesn't look undersized next to the resource sprite it's farming.
- [ ] `IslandTile`'s Base layout (castle + tree forest + base resource nodes + idle collectors + anchored boat) fits without overlap and reads clearly at both desktop and mobile tile sizes.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `FIXED_CLOUD_LAYOUT` | `src/modules/map/components/MapDecorations/MapDecorations.map.ts:32-96` | Confirmed 48 entries (not 40): 4 corner clusters × 5 = 20, plus 4 edges × 7 = 28. Re-read in this session: top edge's rightmost corner-cluster cloud (`cloud-tl-4`, `left: '4%'`) sits ~12 points of `left` away from the first edge cloud (`cloud-t1`, `left: '16%'`), confirming ui-design.md's measured gap. Static array; the Phase 1 fix is 8 new entries, listed below. |
| `CloudDef` type | `MapDecorations.types.ts:10-19` | `{ id, src, left, top, width, height, opacity?, desktopOnly? }` — the 8 new entries must match this shape exactly; no new fields. |
| `toVisibleDecorations` | `MapDecorations.map.ts:98-103` | Filters `desktopOnly` entries for mobile. All 8 new entries ship with `desktopOnly: false` (or omitted) per ui-design.md, so they appear on both breakpoints — this function needs no code change. |
| `MapDecorations.map.test.ts:1-55` | same folder | Existing tests assert `toVisibleDecorations(false)` returns the full `FIXED_CLOUD_LAYOUT` array and `toVisibleDecorations(true)` excludes `desktopOnly` entries. These stay structurally valid after the fix (still dynamic, not hardcoded counts) but the *value* of `toVisibleDecorations(true).clouds.length` changes from today's 40 to 48 once 8 mid-edge entries are un-flagged — tester-b adds an explicit assertion for the new number rather than relying on the existing dynamic checks to catch a regression. |
| `grep -n "desktopOnly: true" MapDecorations.map.ts` | re-run this session | Confirms 16 `cloud-*` entries carry `desktopOnly: true` today (lines 35,36,42,43,49,50,56,57 = 8 corner wisps; lines 63,67,72,76,81,85,90,94 = 8 mid-edge). 48 original entries − 16 `desktopOnly` = 32 always-visible originals. Mobile today: 32 + 0 gap-fillers (not yet un-clipped) = matches ui-design.md's measured "exactly 40" DOM count pre-fix. After the fix: 32 always-visible + 8 newly-unflagged mid-edge + 8 gap-fillers (never `desktopOnly`) = 48 on mobile; 48 original + 8 gap-fillers = 56 on desktop (`isMobile` false never filters). |
| `MapDecorations.preview.tsx:6-20` | same folder | Already has "Desktop" and "Mobile" states rendering `<MapDecorations isMobile={false / true} />` — this is what `ui-verify` screenshots; no new preview file or state needed for Phase 1. |
| `TileResources.map.ts` / `.styles.ts` | `src/modules/map/components/TileResources/` | Phase 2 scope only (not touched this phase) — current organic-scatter implementation and active-collector placement (`docs/README.md` §6.12 "Active Collector Farming"). |
| `IslandTile.tsx` | `src/modules/map/components/IslandTile/` | Phase 2 scope only (not touched this phase) — composes castle + `TileForest` + `TileResources` + `TileOccupants` + `TileBoats` for Base tiles. |

## Decisions
- Cloud density fix (ui-design.md §A, APPROVED): add exactly 8 "gap-filler" cloud entries to `FIXED_CLOUD_LAYOUT` — one at each of the 8 corner-to-edge transitions (2 per edge × 4 edges) — reusing the existing `cloud_medium.png` sprite and the existing 0.78–0.9 opacity range. No new layout system, no change to `toVisibleDecorations` or `CloudDef`. This is the smallest change that closes the measured ~12-point gap: adding entries to a static array the component already iterates, vs. rewriting the cloud layout as a generative/grid algorithm (rejected — ui-design.md explicitly ruled this out per triage's recommendation, and it would touch `toVisibleDecorations`'s mobile-filtering contract for no measurable benefit).
- All 8 new entries get `desktopOnly: false` (omitted, same as the type's optional default) and sit fully inside the `0%`–`100%` box (`2%`/`98%` on the perpendicular axis, matching `FIXED_ROCK_LAYOUT`'s `3%`/`97%` corner-rock convention), so they paint under `MapGrid`'s `overflow-hidden` root and the testbed's `overflow-x-auto` canvas, both of which clip anything at or beyond `0%`/`100%` (revise pass: the original `-5%`/`105%` values were off-grid and never painted — fixed by preview-b).
- **Mid-edge mobile-parity fix (round 2, ui-design.md §A's second table).** 16 of the original 48 cloud entries carry `desktopOnly: true`, not 8: 8 corner-cluster "wisps" (`cloud-tl-2/-3`, `cloud-tr-2/-3`, `cloud-bl-2/-3`, `cloud-br-2/-3`) plus 8 mid-edge clouds, one pair per edge (`cloud-t2/t6`, `cloud-b2/b6`, `cloud-l2/l6`, `cloud-r2/r6`), verified by `grep -n "desktopOnly: true" MapDecorations.map.ts` this session. Losing the 8 mid-edge clouds on mobile opens a real ~22-point gap on every edge, not a harmless density drop. Fix: un-flag all 8 mid-edge entries (`desktopOnly: true` → removed) so they show on mobile too; leave the 8 corner wisps `desktopOnly: true` (corner-only decorative bonus — each corner keeps 3 non-`desktopOnly` clouds regardless, so removing the wisps on mobile creates no edge gap). The 4 left/right mid-edge entries (`cloud-l2`, `cloud-l6`, `cloud-r2`, `cloud-r6`) additionally need their `left` moved from the off-box `-4%`/`104%` to the in-box `2%`/`98%` — same width-axis clipping bug as the original gap-fillers, confirmed by ui-design.md's screenshot crops showing only a 1-2px sliver at the old value. The 4 top/bottom mid-edge entries (`cloud-t2`, `cloud-t6`, `cloud-b2`, `cloud-b6`) only strictly need the flag removed (their height-axis offset was already 29-34% visible), but ui-design.md's table also moves their `top` to `2%`/`98%` for pattern consistency across all 8 — applied here rather than treated as optional, since a uniform fix is simpler to verify than two different conventions for the same bug.
- **Net coverage, corrected**: desktop shows all 56 entries (48 original + 8 gap-fillers; `isMobile=false` never filters). Mobile shows 48 of 56: 32 always-visible originals (48 − 16 `desktopOnly`) + 8 newly-unflagged mid-edge + 8 gap-fillers (never `desktopOnly`). The remaining 8-entry desktop/mobile gap is confined to the corner wisps, which don't affect edge coverage. (Superseded: an earlier pass of this plan claimed "8 of 48 are `desktopOnly`, mobile 48 of 56" with the wrong mechanism — only the corner-cluster count was right; it missed the 8 mid-edge entries and their required edit, which round-2 review caught.)
- **Round-3 left/right outer-cluster fix.** preview-b's round-3 pass found 10 more clipped entries, all on the width axis of the wide (918px-class) desktop board: `cloud-l1` (`left: '-6%'`), `cloud-l3` (`'-7%'`), `cloud-l4` (`'-4%'`), `cloud-l5` (`'-7%'`), `cloud-l7` (`'-6%'`) on the Left Perimeter Edge group, and `cloud-r1` (`'106%'`), `cloud-r3` (`'107%'`), `cloud-r4` (`'104%'`), `cloud-r5` (`'107%'`), `cloud-r7` (`'106%'`) on the Right Perimeter Edge group — verified directly against `MapDecorations.map.ts` on disk this session (exact lines in Contracts below). None of these 10 carry `desktopOnly` (confirmed against the file's 16 `desktopOnly: true` hits, none of which are `l1/l3/l4/l5/l7/r1/r3/r4/r5/r7`) — they already rendered on both breakpoints, just outside the `0%`–`100%` box on this board's width, same root-cause bug as the original gap-fillers and the round-2 mid-edge fix. Fix: move `left` to `'2%'` (left group) / `'98%'` (right group) — the identical in-box convention already approved and shipped for `cloud-l2/l6/r2/r6` in round 2 and for the 8 gap-fillers in round 1. `top` is untouched on all 10 (not reported as clipped, and each entry's `top` is already a normal in-box value: `16%/38%/50%/62%/84%`). No new design decision: this reuses the same mechanism ui-designer-b already approved, applied to the 10 entries round 2 missed because round 2 only covered the one mid-edge pair per side, not the whole Left/Right Perimeter Edge cluster.
- Phase 2 (TileResources/IslandTile) exact values stay un-locked in this plan per the task's phase split (triage.md "Phases") — architect-a locks them once Phase 1 ships, per Phase 2's step list below, unchanged from the original draft.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/MapDecorations/MapDecorations.map.ts` | edit | Append 8 new entries, edit 8 existing mid-edge entries in place (desktopOnly + position), AND edit 10 existing left/right outer-cluster entries' `left` in place — exact values in Contracts below. | implementer-b |
| `src/modules/map/components/MapDecorations/MapDecorations.map.test.ts` | edit | Add tests: `FIXED_CLOUD_LAYOUT.length === 56`; all `id`s unique; `toVisibleDecorations(true).clouds.length === 48`; `toVisibleDecorations(false).clouds.length === 56`. | tester-b |

Phase 2 file plan (unchanged from draft, locked by architect-a once Phase 1 ships):
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileResources/TileResources.map.ts` / `.styles.ts` | edit | Apply the approved resource-sprite layout and collector-beside-node positioning/sizing (ui-design.md §B). | implementer-b |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | edit | Fix wrong sprite paths (`gold.gif` → `/sprites/mine.png`/`mine_active.png`, `wood.gif` → `/sprites/tree.gif`) per ui-design.md's flagged bug. | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.tsx` / `.styles.ts` | edit | Apply the approved Base-tile composition fix (edge-midpoint resource slots, non-corner). | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.fixtures.ts` | edit | Add a 2-3-resource Base fixture (today's Base fixtures have `resources: []`). | implementer-a |

## Contracts
### Phase 1 (locked)
No type changes — the 8 new entries are plain `CloudDef` object literals appended to the existing `FIXED_CLOUD_LAYOUT` array in `MapDecorations.map.ts`. Insert them as a new `// Corner-to-Edge Gap Fillers` comment block after line 95 (the last Right Perimeter Edge Cloud), before the closing `];`:
```ts
// Corner-to-Edge Gap Fillers
{ id: 'cloud-t0', src: '/sprites/cloud_medium.png', left: '9%', top: '2%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-t8', src: '/sprites/cloud_medium.png', left: '91%', top: '2%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-b0', src: '/sprites/cloud_medium.png', left: '9%', top: '98%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-b8', src: '/sprites/cloud_medium.png', left: '91%', top: '98%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-l0', src: '/sprites/cloud_medium.png', left: '2%', top: '9%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-l8', src: '/sprites/cloud_medium.png', left: '2%', top: '91%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-r0', src: '/sprites/cloud_medium.png', left: '98%', top: '9%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-r8', src: '/sprites/cloud_medium.png', left: '98%', top: '91%', width: 74, height: 48, opacity: 0.8 },
```
Values are ui-design.md §A's revised table (revise pass, corrected `-5%`/`105%` → `2%`/`98%` after preview-b found the old values clipped by `overflow-hidden`/`overflow-x-auto` and never painted), transcribed verbatim (ids, sprite, left/top, width/height, opacity all match; sprite size is 74×48, not 74×74). `desktopOnly` is omitted (defaults to falsy via `?:`), matching the other non-`desktopOnly` entries' style in this file (e.g. `cloud-tl-1` has no `desktopOnly` key at all — follow that convention, don't write `desktopOnly: false` explicitly).

**Important — the code currently on disk does not match this table.** `MapDecorations.map.ts:97-105` already has a "Corner-to-Edge Gap Fillers" block (git status shows this file modified), but its 8 entries still use the old, broken off-box values (`top: '-5%'`/`'105%'` for `cloud-t0/t8/b0/b8`, `left: '-5%'`/`'105%'` for `cloud-l0/l8/r0/r8`). implementer-b's job is to edit those 8 existing lines to the `2%`/`98%` values in the table above, not to append a second block.

**Second edit — 8 existing mid-edge entries, in place (round 2).** Edit these 8 lines of `FIXED_CLOUD_LAYOUT` (verified against `MapDecorations.map.ts` on disk at the line numbers shown; other fields — `src`, `width`, `height`, `opacity` — are unchanged):

| id | current line | field | from | to |
|---|---|---|---|---|
| `cloud-t2` | `MapDecorations.map.ts:63` | `top` | `'-4%'` | `'2%'` |
| `cloud-t2` | same line | `desktopOnly` | `true` | removed (key deleted) |
| `cloud-t6` | `MapDecorations.map.ts:67` | `top` | `'-4%'` | `'2%'` |
| `cloud-t6` | same line | `desktopOnly` | `true` | removed |
| `cloud-b2` | `MapDecorations.map.ts:72` | `top` | `'104%'` | `'98%'` |
| `cloud-b2` | same line | `desktopOnly` | `true` | removed |
| `cloud-b6` | `MapDecorations.map.ts:76` | `top` | `'104%'` | `'98%'` |
| `cloud-b6` | same line | `desktopOnly` | `true` | removed |
| `cloud-l2` | `MapDecorations.map.ts:81` | `left` | `'-4%'` | `'2%'` |
| `cloud-l2` | same line | `desktopOnly` | `true` | removed |
| `cloud-l6` | `MapDecorations.map.ts:85` | `left` | `'-4%'` | `'2%'` |
| `cloud-l6` | same line | `desktopOnly` | `true` | removed |
| `cloud-r2` | `MapDecorations.map.ts:90` | `left` | `'104%'` | `'98%'` |
| `cloud-r2` | same line | `desktopOnly` | `true` | removed |
| `cloud-r6` | `MapDecorations.map.ts:94` | `left` | `'104%'` | `'98%'` |
| `cloud-r6` | same line | `desktopOnly` | `true` | removed |

After this edit, e.g. `cloud-t2` reads `{ id: 'cloud-t2', src: '/sprites/cloud_small.png', left: '27%', top: '2%', width: 60, height: 40, opacity: 0.78 }` — no `desktopOnly` key at all, matching the omitted-key convention. `cloud-l2` reads `{ id: 'cloud-l2', src: '/sprites/cloud_small.png', left: '2%', top: '27%', width: 60, height: 40, opacity: 0.78 }`. `left`/`top` values not listed above (`cloud-t2`'s `left: '27%'`, `cloud-l2`'s `top: '27%'`, etc.) are unchanged from today's file. No `CloudDef` field changes — `desktopOnly` already exists as an optional field; this only flips its value and nudges `left`/`top` on these 8 entries.

**Third edit — 10 existing left/right outer-cluster entries, `left` only (round 3).** Edit these 10 lines of `FIXED_CLOUD_LAYOUT` (verified against `MapDecorations.map.ts` on disk at the line numbers shown; `src`, `top`, `width`, `height`, `opacity` are unchanged, and none of these 10 has a `desktopOnly` key to begin with):

| id | current line | field | from | to |
|---|---|---|---|---|
| `cloud-l1` | `MapDecorations.map.ts:80` | `left` | `'-6%'` | `'2%'` |
| `cloud-l3` | `MapDecorations.map.ts:82` | `left` | `'-7%'` | `'2%'` |
| `cloud-l4` | `MapDecorations.map.ts:83` | `left` | `'-4%'` | `'2%'` |
| `cloud-l5` | `MapDecorations.map.ts:84` | `left` | `'-7%'` | `'2%'` |
| `cloud-l7` | `MapDecorations.map.ts:86` | `left` | `'-6%'` | `'2%'` |
| `cloud-r1` | `MapDecorations.map.ts:89` | `left` | `'106%'` | `'98%'` |
| `cloud-r3` | `MapDecorations.map.ts:91` | `left` | `'107%'` | `'98%'` |
| `cloud-r4` | `MapDecorations.map.ts:92` | `left` | `'104%'` | `'98%'` |
| `cloud-r5` | `MapDecorations.map.ts:93` | `left` | `'107%'` | `'98%'` |
| `cloud-r7` | `MapDecorations.map.ts:95` | `left` | `'106%'` | `'98%'` |

`top` stays exactly as on disk for all 10: `cloud-l1`/`cloud-r1` keep `top: '16%'`, `cloud-l3`/`cloud-r3` keep `'38%'`, `cloud-l4`/`cloud-r4` keep `'50%'`, `cloud-l5`/`cloud-r5` keep `'62%'`, `cloud-l7`/`cloud-r7` keep `'84%'`. E.g. after this edit `cloud-l1` reads `{ id: 'cloud-l1', src: '/sprites/cloud_medium.png', left: '2%', top: '16%', width: 76, height: 50, opacity: 0.82 }`; `cloud-r1` reads `{ id: 'cloud-r1', src: '/sprites/cloud_medium.png', left: '98%', top: '16%', width: 76, height: 50, opacity: 0.82 }`. No `CloudDef` field changes and no `desktopOnly` key added — these entries already have none.

### Phase 2 (not locked this phase)
None pre-defined yet — ui-design.md §B gives fix direction (collector-beside-node anchoring, 3-band scatter, edge-midpoint Base slots) but not final percentages; if the collector-beside-node change needs new positioning data (e.g. "which side" per resource), that becomes a small addition to `TileResources`' view-model type, to be specified when architect-a locks Phase 2.

## Phases
### Phase 1: Design pass + cloud density (lower risk, independent of the other two)
1. ~~`preview-a`/browser screenshot~~ — done (ui-designer-a's session captured `testbed-map-decorations-state-Desktop--desktop.png`).
2. ~~`ui-designer-a` propose~~ — done, ui-design.md §A.
3. ~~`ui-designer-b` review~~ — done, APPROVED.
4. `architect-a`/`architect-b`: lock the 8 exact entries into this plan's Contracts (done above); architect-b reviews this plan.
5. `implementer-b`: fix the 8 gap-filler entries already in `FIXED_CLOUD_LAYOUT` to the `2%`/`98%` values per Contracts (don't append a duplicate block — they're already on disk, just at the wrong, off-box values); edit the 8 existing mid-edge entries (`cloud-t2/t6/b2/b6/l2/l6/r2/r6`) in place per the second Contracts table (desktopOnly removed on all 8; `left`/`top` moved to `2%`/`98%` on all 8); AND edit the 10 existing left/right outer-cluster entries (`cloud-l1/l3/l4/l5/l7`, `cloud-r1/r3/r4/r5/r7`) in place per the third Contracts table (`left` only moved to `2%`/`98%`; `top` untouched; no `desktopOnly` key on these). No other code change.
6. `tester-b`: add to `MapDecorations.map.test.ts`: `FIXED_CLOUD_LAYOUT.length === 56`; all `id`s unique; `toVisibleDecorations(true).clouds.length === 48`; `toVisibleDecorations(false).clouds.length === 56`.
7. `preview-a`: re-check `/testbed/map-decorations` "Desktop" and "Mobile" states already in `MapDecorations.preview.tsx` — no new preview file needed.
8. `preview-b`/`ui-verify`: screenshot both states, confirm no gap wider than ~8% of the board's side anywhere on the perimeter including mobile's 4 mid-edge gaps, confirm no new console errors, and confirm a DOM count of `[data-testid="decorative-cloud"]` is exactly 56 on `?state=Desktop` and exactly 48 on `?state=Mobile`.
9. Commit.
10. Stop and ask the user to type `continue` before Phase 2 (per project workflow — this phase's cloud change should be checked live before the larger resource/base layout work starts).

### Phase 2: TileResources + IslandTile base layout rework
1. `architect-a`/`architect-b`: turn the approved resource/base-layout portion of the design spec into exact file-plan values and contracts.
2. `implementer-b`: apply changes.
3. `tester-b`: update/extend view tests for the changed layout.
4. `preview-a`/`preview-b`: screenshot and verify against the approved spec at desktop and mobile widths.
5. Commit.

Model escalation: ui-designer-a/b likely benefit from sonnet given the cross-component layout judgment calls; implementer-b can stay on haiku for the mechanical value changes once the spec is locked.

## Test plan
### Phase 1
- tester-b, `MapDecorations.map.test.ts`: `expect(FIXED_CLOUD_LAYOUT).toHaveLength(56)`; `expect(new Set(FIXED_CLOUD_LAYOUT.map((c) => c.id)).size).toBe(FIXED_CLOUD_LAYOUT.length)` for uniqueness; `expect(toVisibleDecorations(true).clouds).toHaveLength(48)` (was 40 before the mid-edge un-flag); `expect(toVisibleDecorations(false).clouds).toHaveLength(56)`. Existing 4 tests in this file stay structurally valid (they derive counts dynamically) but their *values* change once the mid-edge entries are un-flagged — the new explicit-48/56 assertions are what actually pins the corrected number down.
- `preview-b`/`ui-verify`, DOM-count check (ui-design.md's acceptance criteria): `document.querySelectorAll('[data-testid="decorative-cloud"]')` (or `getAllByTestId('decorative-cloud')` in `MapDecorations.test.tsx`-style query) returns exactly 56 elements at `/testbed/map-decorations?state=Desktop` and exactly 48 at `?state=Mobile`.

### Phase 2 (cases depend on architect-a's locked spec, not written yet)
- `TileResources` view tests updated for the new scatter/collector positions; `IslandTile` view tests updated for the new base composition.

## Preview states
### Phase 1
- `MapDecorations.preview.tsx`'s existing "Desktop" and "Mobile" states — no new file, just re-screenshot per `ui-verify`.

### Phase 2 (not yet locked)
- `TileResources`, `IslandTile` previews updated to show the new layout states once architect-a locks Phase 2's exact values.

## Risks
- Phase 2's design direction (ui-design.md §B) is first-pass, not final percentages — architect-a locking it may surface a conflict with `TileBoats`/`TileOccupants`' existing corner-anchor boxes not visible until real tile renders are checked; budget for a bounce back to ui-designer-b if so.
- Cloud density increase (8 more `<Image>` instances, 56 total) could hurt render cost; `MapDecorations.tsx` already renders all of `FIXED_CLOUD_LAYOUT` unconditionally, so this is a modest incremental cost on an existing pattern — check it isn't noticeably worse in the `ui-verify` browser check anyway.

## Review (architect-b)
VERDICT: APPROVED

Verified in this session:
- `FIXED_CLOUD_LAYOUT` (`src/modules/map/components/MapDecorations/MapDecorations.map.ts:32-96`): 48 entries confirmed (4×5 corner + 4×7 edge). `cloud-tl-4` is `left: '4%'` (line 37), `cloud-t1` is `left: '16%'` (line 62) — the ~12-point gap is real.
- `CloudDef` (`MapDecorations.types.ts:10-19`): the 8 literals in Contracts match the shape exactly (`id, src, left, top, width, height, opacity`, no `desktopOnly` key — matches the omitted-key convention other non-`desktopOnly` entries use, e.g. `cloud-t1`).
- `toVisibleDecorations` (`MapDecorations.map.ts:98-103`) needs no edit: filters only on `desktopOnly`, and none of the 8 new entries set it.
- New ids (`cloud-t0/t8/b0/b8/l0/l8/r0/r8`) don't collide with any existing id in the file.
- `MapDecorations.map.test.ts` (read in full): existing 4 tests compare against `FIXED_CLOUD_LAYOUT.length`/content dynamically, not a hardcoded 48 — they keep passing unedited, confirming plan's claim.
- `MapDecorations.test.tsx:16-148` (not in the file plan, correctly): every assertion there also reads `FIXED_CLOUD_LAYOUT.length` dynamically rather than a literal count, so it isn't broken by the append and didn't need a File plan entry. Grepped the repo for `FIXED_CLOUD_LAYOUT`/`MapDecorations.map` — the only other hits are docs (unrelated tasks' plans, the functionality audit) and this task's own files; no missed code path.
- `MapDecorations.preview.tsx:6-20`: "Desktop"/"Mobile" states already exist, confirming no new preview file is needed.
- File plan paths all resolve: `MapDecorations.map.ts`, `MapDecorations.map.test.ts` both exist at the stated paths; Phase 2's listed paths (`TileResources.map.ts/.styles.ts/.preview.tsx`, `IslandTile.tsx/.styles.ts/.fixtures.ts`) also exist, consistent with ui-design.md's citations.
- Design: smallest correct fix — appends to an existing static array the component already iterates, no new layout system, no touch to the mobile-filtering contract. Matches triage's explicit rejection of a generative/grid rewrite.

No findings. Phase 2 is correctly left unlocked pending this approval, per triage's phase split.

**Revise pass (prior session)**: ui-design.md §A was revised after preview-b found the original gap-filler values (`-5%`/`105%`) clipped by `MapGrid`'s `overflow-hidden` and the testbed's `overflow-x-auto`, never painting. Updated this plan's Decisions and Contracts to the corrected values (`2%`/`98%`, matching `FIXED_ROCK_LAYOUT`'s `3%`/`97%` convention, re-verified at `MapDecorations.map.ts:6-9`) and fixed the mobile-coverage math from the stale "40 of 56" to "48 of 56" (claimed 8 of the original 48 clouds are `desktopOnly`, all corner-cluster-only). Sprite size corrected to 74×48 (not 74×74) to match the table. Status returned to APPROVED.

## Review (architect-b), round 2
VERDICT: CHANGES REQUESTED

The round-1 "48 of 56" arithmetic above is itself wrong, and ui-design.md has since been revised a third time to fix the real bug — this plan was not updated to match.

1. **Independently re-verified the desktopOnly count — it's 16, not 8.** Ran `grep -n "desktopOnly: true" MapDecorations.map.ts` and `grep -n "cloud-.*desktopOnly: true"` myself (this session) against the file on disk: 16 `cloud-*` entries carry `desktopOnly: true`, not 8 — the 8 corner-cluster wisps this plan already lists (`cloud-tl-2`/`-3`, `cloud-tr-2`/`-3`, `cloud-bl-2`/`-3`, `cloud-br-2`/`-3`, lines 35-36/42-43/49-50/56-57) **plus 8 mid-edge clouds this plan's Decisions and the Review round-1 both missed**: `cloud-t2`/`t6` (lines 63/67), `cloud-b2`/`b6` (lines 72/76), `cloud-l2`/`l6` (lines 81/85), `cloud-r2`/`r6` (lines 90/94). So appending only the 8 new gap-fillers (as this plan's current File plan/Contracts specify) leaves mobile at 48 − 16 + 8 = 40 of 56, not 48 of 56 as this plan's Decisions claims.
2. **ui-design.md's current §A (re-read this session, lines 48-95) has since been revised a third time and now fixes this for real**, not by correcting the arithmetic but by changing the fix: un-flag the 8 mid-edge entries' `desktopOnly` (flip to `false`) and move 4 of them (`cloud-l2`/`l6`/`r2`/`r6`) inside the box (`left: '-4%'`/`'104%'` → `'2%'`/`'98%'`), with `cloud-t2`/`t6`/`b2`/`b6`'s matching `top` move to `2%`/`98%` specified in ui-design.md's table for pattern consistency (ui-design.md calls this part "optional polish, not required" but the table nonetheless specifies it — apply it, since "optional polish" undercuts the stated goal of a uniform fix). This is the real mechanism that gets mobile to 48 of 56 (32 always-visible originals + 8 newly-unflagged mid-edge + 8 gap-fillers), per ui-design.md lines 80 and 95.
3. **This plan's File plan and Contracts don't cover that edit at all.** The File plan's only `MapDecorations.map.ts` row says "Append the 8 gap-filler entries" — nothing about editing the 8 existing mid-edge entries. The Contracts section locks only the 8 new-entry literals. Required fix: add a Contracts table (or extend the existing one) with the exact before/after `desktopOnly`/`left`/`top` values for `cloud-t2`, `cloud-t6`, `cloud-b2`, `cloud-b6`, `cloud-l2`, `cloud-l6`, `cloud-r2`, `cloud-r6`, per ui-design.md's second table (its current lines 84-93), and update the File plan's `MapDecorations.map.ts` row to say "append 8 new entries and edit 8 existing mid-edge entries." Rewrite the Decisions mobile-coverage sentence from "8 of the original 48... all corner-cluster... mobile shows 48 of 56" to the corrected mechanism (16 desktopOnly originally; 8 corner wisps stay flagged, 8 mid-edge get un-flagged and repositioned; net mobile 48 of 56).
4. **Test plan gap, smaller**: ui-design.md's current acceptance criteria (its lines 113-116) add a DOM-count check — 56 `[data-testid="decorative-cloud"]` elements on `?state=Desktop`, 48 on `?state=Mobile` — on top of the array-length/unique-id test this plan already assigns to tester-b. The jest assertions (`length === 56`, unique ids) still hold unchanged and need no edit. But Phase 1's step 8 (preview-b/`ui-verify`) should explicitly check the 56/48 DOM count, not just "no gap wider than ~8%" — add that to the Phases/Test plan text so preview-b has the exact number to check instead of re-deriving it.

Confirmed correct and unaffected by the above: the 8 new gap-filler literals in this plan's Contracts (`cloud-t0/t8/b0/b8/l0/l8/r0/r8`) match ui-design.md's current §A first table (its lines 65-72) field-for-field — id, sprite, `left`/`top`, width×height, opacity all verified identical; none sit at or beyond `0%`/`100%`; all omit `desktopOnly` matching the file's non-`desktopOnly` entries' convention; `2%`/`98%` is consistent with `FIXED_ROCK_LAYOUT`'s `3%`/`97%` corner-rock convention (`MapDecorations.map.ts:6-9`, re-verified). `CloudDef`'s shape (`MapDecorations.types.ts:10-19`) and `toVisibleDecorations` (`MapDecorations.map.ts:108-113`, re-verified — line numbers in this plan's Verified-context row are stale by a few lines but the function itself is unchanged) still need no code change for the new entries; they do need to keep working correctly once the 8 existing entries' `desktopOnly` flags flip, which they will since the filter is generic.

Route back to architect-a: extend File plan, Contracts and Decisions per finding 3, and the Phases/Test plan text per finding 4. Re-review once updated.

**Revise pass (architect-a, this session) — resolves round 2.** Re-read ui-design.md's current §A in full and re-verified against `MapDecorations.map.ts` on disk (`grep -n "desktopOnly: true"`, confirmed 16 `cloud-*` hits: 8 wisps at lines 35/36/42/43/49/50/56/57, 8 mid-edge at lines 63/67/72/76/81/85/90/94 — matches finding 1 exactly). Changes made:
- File plan's `MapDecorations.map.ts` row now reads "append 8 new entries AND edit 8 existing mid-edge entries in place (desktopOnly + position)."
- Contracts gained a second table (before/after `left`/`top`/`desktopOnly` for `cloud-t2/t6/b2/b6/l2/l6/r2/r6`, with exact current line numbers) and a note that the gap-filler block already exists on disk at the old broken values — implementer-b edits those 8 lines rather than appending a duplicate block.
- Decisions rewritten with the corrected mechanism (16 `desktopOnly` originally, not 8; 8 wisps stay flagged, 8 mid-edge un-flag + reposition) and the corrected net coverage (56 desktop, 48 mobile), explicitly marking the prior "48 of 56 via 8 corner-only desktopOnly" sentence as superseded.
- Also applied ui-design.md's "optional polish" top/bottom `top` move to `2%`/`98%` as non-optional, per finding 2's reasoning (uniform fix easier to verify than two conventions for one bug) — t2/t6/b2/b6 now move `top` too, not just lose their flag.
- Phases step 5/6/8 and Test plan updated: step 5 now names both edits; tester-b's assertions add `toVisibleDecorations(true/false).clouds.length` checks (48/56); step 8 and the Test plan both specify the exact DOM-count check (56 `decorative-cloud` elements at `?state=Desktop`, 48 at `?state=Mobile`) ui-design.md's acceptance criteria require, verified the testid exists at `MapDecorations.tsx:40`.
- Re-verified the already-confirmed-correct parts (round 2's "Confirmed correct and unaffected" paragraph) are untouched: the 8 gap-filler literals, `CloudDef` shape, `toVisibleDecorations`'s generic filter needing no code change.

No further gap found against ui-design.md's current §A (both tables), its acceptance criteria (lines ~113-116), or the file on disk.

Status: APPROVED

## Review (architect-b), round 3
VERDICT: APPROVED

Re-verified this round-3 extension against ui-design.md's current §A and the file on disk:
- ui-design.md's current §A (re-read in full, lines 48-109): its first table (lines 63-72, gap-fillers) and second table (lines 84-93, mid-edge edits) match this plan's two Contracts tables field-for-field — ids, sprite, `left`/`top`, width×height, opacity, and `desktopOnly` disposition all identical. The second table's `top`-move for `cloud-t2/t6/b2/b6` (ui-design.md calls it "optional polish", this plan applies it as mandatory) is architect-a's documented, reasoned call (Decisions, point 2) — a uniform fix is simpler to verify than two conventions for one bug; not a deviation from the design, since ui-design.md's own table specifies the same `2%`/`98%` values regardless of the "optional" label.
- `grep -n "desktopOnly: true" MapDecorations.map.ts` run fresh this session on the committed `HEAD` version (`git show HEAD:...`, 48 entries, no gap-filler block) confirms the plan's premise: 16 `cloud-*` hits (8 corner wisps + 8 mid-edge), matching the plan's Decisions and both Contracts tables.
- `CloudDef` (`MapDecorations.types.ts:10-19`), `data-testid="decorative-cloud"` (`MapDecorations.tsx:40`), and both Phase 2 file-plan paths (`TileResources/`, `IslandTile/`, `ls` confirms every listed file exists) all check out.
- `MapDecorations.map.ts` on disk is mid-edit by implementer-b during this review (observed three different transient states across repeated reads in this session — fully-fixed, gap-filler-only-fixed, and still-broken); this is expected concurrent-agent noise, not a plan defect, since the plan's Contracts tables are the authoritative target regardless of the file's in-progress state. `progress.md`'s Phase 1 "implementation (implementer-b)" box is correctly still unchecked.
- `MapDecorations.map.test.ts`'s current diff (26 lines added, stable across repeated reads, unlike `.map.ts`) adds 3 tests ahead of plan lock: `FIXED_CLOUD_LAYOUT` length 56, unique ids, and "every gap filler id present in `toVisibleDecorations(true)`". These satisfy 2 of the plan's 4 assigned tester-b assertions (the 56-length and uniqueness checks) and don't conflict with any of them. They do **not** yet satisfy the other 2 — an explicit `expect(toVisibleDecorations(true).clouds).toHaveLength(48)` and `expect(toVisibleDecorations(false).clouds).toHaveLength(56)` — which the plan's Verified-context row (line 18) and Test plan both call for specifically because the file's other, pre-existing dynamic tests (`MapDecorations.map.test.ts`'s and `MapDecorations.test.tsx`'s filter-based assertions) derive their expected count from `FIXED_CLOUD_LAYOUT` itself and would stay green even if the mid-edge un-flag regressed. This is unfinished tester-b work, not a plan error; no change to plan.md needed — tester-b should add the two missing literal-count assertions per the Test plan section as already written.

No other findings.

**Revise pass (architect-a, this session) — addresses preview-b's round-3 finding (10 more clipped entries).** Re-read `MapDecorations.map.ts` on disk and verified the current `left`/`top`/`width`/`opacity` of all 10 flagged entries before locking values (no `desktopOnly` key on any of the 10, confirmed against the file's 16 `desktopOnly: true` hits): `cloud-l1` (`left: '-6%'`, `top: '16%'`, line 80), `cloud-l3` (`'-7%'`, `'38%'`, line 82), `cloud-l4` (`'-4%'`, `'50%'`, line 83), `cloud-l5` (`'-7%'`, `'62%'`, line 84), `cloud-l7` (`'-6%'`, `'84%'`, line 86), `cloud-r1` (`'106%'`, `'16%'`, line 89), `cloud-r3` (`'107%'`, `'38%'`, line 91), `cloud-r4` (`'104%'`, `'50%'`, line 92), `cloud-r5` (`'107%'`, `'62%'`, line 93), `cloud-r7` (`'106%'`, `'84%'`, line 95). Changes made:
- Decisions gained a "Round-3 left/right outer-cluster fix" bullet with the before values and the same reasoning as round 2 (identical mechanism, no new design decision).
- File plan's `MapDecorations.map.ts` row now also names the 10-entry `left`-only edit.
- Contracts gained a third table (before/after `left` for all 10, with current line numbers), stating explicitly that `top`/`src`/`width`/`height`/`opacity` are unchanged and no `desktopOnly` key exists on any of the 10.
- Phases step 5 now lists all three edits (gap-fillers, 8 mid-edge, 10 outer-cluster) so implementer-b has one place listing every required change.
- No test-count change: these 10 entries aren't `desktopOnly`, so they were already counted in `toVisibleDecorations`'s 48/56 totals — this is a pure repositioning fix, not an addition or a flag flip. Test plan and Phases step 6/8 (56/48 DOM-count and length assertions) are unaffected and need no edit.

Status: APPROVED (Phase 1, pending architect-b re-review of this round-4 extension)

## Review (architect-b), round 4
VERDICT: APPROVED

Re-verified the round-3 extension's third Contracts table (10 left/right outer-cluster entries) against `MapDecorations.map.ts` on disk this session, line by line:
- `cloud-l1` line 80 `left: '-6%'`, `cloud-l3` line 82 `'-7%'`, `cloud-l4` line 83 `'-4%'`, `cloud-l5` line 84 `'-7%'`, `cloud-l7` line 86 `'-6%'`, `cloud-r1` line 89 `'106%'`, `cloud-r3` line 91 `'107%'`, `cloud-r4` line 92 `'104%'`, `cloud-r5` line 93 `'107%'` — every line number and "from" value in the table matches the file exactly.
- `top` on all 10 unchanged and matches the table's claim: `l1`/`r1` `'16%'`, `l3`/`r3` `'38%'`, `l4`/`r4` `'50%'`, `l5`/`r5` `'62%'`, `l7`/`r7` `'84%'`. None of the 10 carries a `desktopOnly` key, confirmed against the file's 16 `desktopOnly: true` hits (lines 35,36,42,43,49,50,56,57,63,67,72,76,81,85,90,94 — none in the set `l1,l3,l4,l5,l7,r1,r3,r4,r5,r7`).
- `src`/`width`/`height`/`opacity` unchanged for all 10 per the table's claim, confirmed by direct comparison with the disk values.
- Grepped the repo for every one of these 10 ids (`cloud-l1`, `cloud-r1`, `cloud-l3`, `cloud-r3`, `cloud-l4`, `cloud-r4`, `cloud-l5`, `cloud-r5`, `cloud-l7`, `cloud-r7`) outside `node_modules`: only hit is `MapDecorations.map.ts` itself — no other code path references these ids, so no missed File plan entry.
- Target `'2%'`/`'98%'` values are the same in-box convention already shipped for the gap-fillers (round 1) and the mid-edge pair (round 2), both already fixed on disk at the time of this review (`cloud-t0/t8/b0/b8/l0/l8/r0/r8` at lines 98-105 all `2%`/`9%`/`91%`/`98%`; `cloud-t2/t6/b2/b6/l2/l6/r2/r6` at lines 63/67/72/76/81/85/90/94 all moved and un-flagged) — consistent, no new mechanism introduced.
- `MapDecorations.map.test.ts` (read in full) already contains the 48/56-length assertions the Test plan calls for (lines 70-76) — this is tester-b's in-progress work matching the plan, not a plan defect.
- No other File plan row, Contracts table or Decisions bullet needed for this extension; the 10-entry edit is purely a `left` reposition on existing non-`desktopOnly` entries, so the 48/56 mobile/desktop counts are unaffected, as the plan states.

No findings. Phase 1's plan (gap-fillers, 8 mid-edge edits, 10 outer-cluster edits) is fully locked and verified against the file on disk.

Status: APPROVED
