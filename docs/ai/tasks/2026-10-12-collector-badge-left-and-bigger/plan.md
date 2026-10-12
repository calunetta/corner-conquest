# Plan: Collector badge — bigger, always left

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] Every farmed resource node's collector badge renders at 65% of the node's own box (44.8% for Food), unconditionally on the node's left edge, centered on that edge midpoint.
- [ ] No `island-tile-slots.types.ts` slot geometry changes; the Final spec's per-slot table shows every one of the 9 slots clears the tile edge at 65%, worst case `TRIPLE_RESOURCE_SLOTS[2]` at 3.2% of T.
- [ ] All 9 slots are screenshot-checkable with a collector badge in `/testbed/tile-resources` (two new preview states needed; today only `SINGLE_RESOURCE_SLOT` is exercised with a badge).
- [ ] `docs/architecture/systems-and-visuals.md:109` describes the new always-left rule, not the old conditional.
- [ ] Every existing test asserting the old 55%/37.9% ratio or the conditional side updated to the new values/rule; no test still exercises a `'right'` badge side.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `BADGE_SIZE_RATIO` | `src/modules/map/components/TileResources/TileResources.map.ts:39` | the constant to change, `0.55` → `0.65` |
| `toBadgeSize` | `src/modules/map/components/TileResources/TileResources.map.ts:53-57` | computes badge size from `BADGE_SIZE_RATIO`; Food branch divides by `FOOD_SCALE` (1.45) — unchanged formula, new input |
| badge-side rule | `src/modules/map/components/TileResources/TileResources.map.ts:126-127` | `badgeSide = slot.right !== undefined && slot.left === undefined ? 'left' : 'right'` — the conditional being removed |
| `FarmingCollectorViewModel` | `src/modules/map/components/TileResources/TileResources.types.ts:24-33` | has a `side: 'left' \| 'right'` field that becomes dead (always `'left'`) once the conditional is removed — remove the field, not just hardcode its value |
| `toCollectorBadgeStyle` | `src/modules/map/components/TileResources/TileResources.tsx:24-29` | branches on `side`; the `side === 'right'` branch (`left: '100%', transform: 'translate(-50%, -50%)'`) becomes dead code once every badge is left-side |
| `TileResourcesView` | `src/modules/map/components/TileResources/TileResources.tsx:32-77` | calls `toCollectorBadgeStyle(node.farmingCollector)` at line 62 — signature changes if `side` is dropped from the type |
| `SlotDef`, `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS` | `src/modules/map/island-tile-slots.types.ts:32-70` | frozen, out of scope — geometry source for the per-slot overflow table already verified safe in `ui-design.md`'s Final spec |
| `resourceIslandWithFood`, `resourceIslandWithDualResources`, `resourceIslandWithTwoDistinctResources`, `baseIslandWithResources`, `singleNodeFixture` | `src/modules/map/components/TileResources/TileResources.fixtures.ts:5-72` | existing fixtures; `baseIslandWithResources` (2 resources: Food, Gold) needs a `positionedBy` entry added for the new "Base resource with collector" preview state |
| `baseIslandWithThreeResources` | `src/modules/map/components/IslandTile/IslandTile.fixtures.ts:48` (re-exported via import in `TileResources.map.test.ts:9`) | cross-module fixture already used by `TileResources.map.test.ts:429,439,588` for `BASE_RESOURCE_SLOTS` coverage — out of scope, not edited |
| `tileResourcesPreview`, `withCollectorNode`, `multipleResourceNodes` | `src/modules/map/components/TileResources/TileResources.preview.tsx:30-100` | registry; `withCollectorNode` is hand-written and only exercises `SINGLE_RESOURCE_SLOT` with `side: 'right'` (line 47) — must become `left`-only shape (no `side` field) and the two new states must be added here |
| badge doc sentence | `docs/architecture/systems-and-visuals.md:109` | states the 55%/conditional-side rule; must change to 65%/always-left |
| map test assertions | `src/modules/map/components/TileResources/TileResources.map.test.ts:480-497` (ratio table), `:508-603` (side/size assertions, titles mention "right side"/"left side") | every `side: 'left' \| 'right'` field in an expected object must be deleted (not changed to `'left'`), since the field no longer exists on `FarmingCollectorViewModel`; ratio values `'55%'`/`'37.9%'` → `'65%'`/`'44.8%'` |
| view test assertions | `src/modules/map/components/TileResources/TileResources.test.tsx:214-254` | three tests (`gives a farmed Gold node a 55%...`, `gives a farmed Food node a 37.9%...`, `puts the collector badge on the left edge of a right-anchored node...`) assert CSS values (`width`, `left`/`right`, `transform`) that must change to the new ratio and the single always-left CSS recipe; the third test's premise ("right-anchored node" triggers left side) no longer holds since every node is left now — retitle and keep as a plain "badge sits on the node's left edge" case |
| `useTileResources`, `TileResources.hook.test.ts` | `src/modules/map/components/TileResources/TileResources.hook.ts`, `TileResources.hook.test.ts:143-249` | asserts only `.color`, not `.size`/`.side` — unaffected, no edit needed (confirm, don't assume) |

## Decisions
- Delete `FarmingCollectorViewModel.side` and the `badgeSide` conditional entirely, instead of keeping the field and hardcoding it to `'left'`, because an always-`'left'` field and a dead `'right'` CSS branch are unused code the project's lint/`kiss-dry-solid` rule forbids; nothing outside this component folder reads `.side` (verified: `grep -rn "FarmingCollectorViewModel" src/` returns only `TileResources.types.ts` and `TileResources.tsx`). Rejected: keep `side` and always set `'left'` (smaller diff, but leaves a dead branch and a type field no caller can vary — fails the "no unused exports" checklist item).
- `toCollectorBadgeStyle` keeps its name and returns a fixed left-edge style with no parameter other than `size`, instead of becoming a bare inline object in the view, because it is still a named, documented transform with its own existing comment explaining the anchor math — collapsing it into JSX would lose that. Rejected: inline the style object directly in JSX (loses the doc comment's placement, no net simplification).
- Ratio constant changes from `0.55` to `0.65` in place; no new constant or config layer, per the ui-design Final spec's exact numbers (65% non-Food, 44.8% Food). Rejected: making the ratio a prop/parameter — nothing varies it, YAGNI.
- No change to `island-tile-slots.types.ts` — ui-design's Final spec per-slot table (reviewed and corrected by ui-designer-b) shows every slot clears the tile edge with margin at 65%, worst case 3.2% of T at `TRIPLE_RESOURCE_SLOTS[2]`. Rejected: shrinking that one slot's `size` or adding a left-edge exception (the spec found no geometric need, and the scope note in `triage.md` reserves any such change for explicit sign-off).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileResources/TileResources.map.ts` | edit | `BADGE_SIZE_RATIO` 0.55 → 0.65; remove `badgeSide` computation and the `side` field from the returned `farmingCollector` object | implementer-a |
| `src/modules/map/components/TileResources/TileResources.types.ts` | edit | remove `side: 'left' \| 'right'` from `FarmingCollectorViewModel`; update the `size` doc comment's ratio numbers | implementer-a |
| `src/modules/map/components/TileResources/TileResources.tsx` | edit | `toCollectorBadgeStyle` takes `{ size }: Pick<FarmingCollectorViewModel, 'size'>` (or the whole view model, ignoring `side`) and always returns the left-edge CSS recipe; drop the `side === 'right'` branch | implementer-b |
| `src/modules/map/components/TileResources/TileResources.fixtures.ts` | edit | add a `positionedBy` entry to `baseIslandWithResources` for the new "Base resource with collector" preview state | implementer-a |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | edit | `withCollectorNode`'s `farmingCollector` literal: `size: '37.9%'` → `'44.8%'`, remove `side: 'right'`; add two new preview states ("Resource with collector, triple slots", "Base resource with collector") built through `toTileResourcesViewModel`, same pattern as `multipleResourceNodes` | preview-a |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | edit | ratio table (`:480-497`) values `'55%'`/`'37.9%'` → `'65%'`/`'44.8%'`; every expected object at `:515-603` drops its `side` field and updates `size`; retitle tests whose title names a side (e.g. "flips the badge to the left side...", "...on the right side...") to describe the new always-left behavior | tester-a |
| `src/modules/map/components/TileResources/TileResources.test.tsx` | edit | update the three badge CSS assertions at `:214-254` to the new ratio and the single left-edge CSS recipe (`width/height: '65%'` or `'44.8%'`, `top: '50%', right: '100%', transform: 'translate(50%, -50%)'`); retitle to drop "right side"/"right-anchored" language | tester-b |
| `docs/architecture/systems-and-visuals.md` | edit | line 109: replace the 55%/conditional-side sentence with the 65%/always-left rule | docs-sync |

## Contracts
```ts
// TileResources.types.ts
export interface FarmingCollectorViewModel {
  color: PlayerColor;
  sprite: string;
  /** CSS percent of the node's own rendered box; the badge is square. '65%' for Wood/Gold,
   *  '44.8%' for Food (65% divided by the Food sprite scale, rounded to one decimal). */
  size: string;
  // 'side' field removed: the badge is always on the node's left edge now.
}

// TileResources.map.ts
const BADGE_SIZE_RATIO = 0.65; // was 0.55

// toTileResourcesViewModel's returned farmingCollector no longer includes `side`:
farmingCollector: positionedPlayer
  ? {
      color: positionedPlayer.color,
      sprite: FARM_SPRITES[positionedPlayer.color],
      size: toBadgeSize(node.type),
    }
  : null,
// The `badgeSide` local and its slot.right/slot.left check (old lines 126-127) are deleted outright,
// not left unused.

// TileResources.tsx
function toCollectorBadgeStyle({ size }: Pick<FarmingCollectorViewModel, 'size'>): CSSProperties {
  return { width: size, height: size, top: '50%', right: '100%', transform: 'translate(50%, -50%)' };
}
// Call site unchanged: toCollectorBadgeStyle(node.farmingCollector) still type-checks because
// FarmingCollectorViewModel structurally satisfies Pick<FarmingCollectorViewModel, 'size'>.
```

## Phases
### Phase 1: badge ratio and always-left side
1. implementer-a: edit `TileResources.map.ts` (ratio constant, remove `badgeSide`/`side` from the returned object) and `TileResources.types.ts` (drop `side` field, update size comment).
2. implementer-a: add a `positionedBy` entry to `baseIslandWithResources` in `TileResources.fixtures.ts` (`[{ playerId: 0, resource: ResourceTypeEnum.Food }]` or similar — any one resource already on that fixture).
3. implementer-b: edit `TileResources.tsx`'s `toCollectorBadgeStyle` per the Contracts block; confirm the call site at line 62 still compiles unchanged.
4. preview-a: update `withCollectorNode` in `TileResources.preview.tsx` (new size, drop `side`); add the two new preview states listed in the File plan, built through `toTileResourcesViewModel` like `multipleResourceNodes` (lines 30-34): the triple-slot state uses the existing `resourceIslandWithDualResources` fixture (`TileResources.fixtures.ts:15-26`: Gold amount 2 + Wood amount 1 = 3 expanded nodes → `TRIPLE_RESOURCE_SLOTS`, already proven by `TileResources.map.test.ts:555-568` to land on all three triple slots) with `positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Wood }]`; the base-island state uses `baseIslandWithResources` with its new `positionedBy` entry from step 2.
5. tester-a: update `TileResources.map.test.ts` per the File plan (ratio values, drop `side` fields, retitle side-specific test names).
6. tester-b: update `TileResources.test.tsx` per the File plan (ratio values, single CSS recipe, retitle).
7. docs-sync: update `docs/architecture/systems-and-visuals.md:109`.

Model escalation: none — same-shape edits to code the agents already have full context for (existing tests/fixtures/preview states, no new design decisions).

## Test plan
- tester-a (logic, first):
  - `toBadgeSize`/ratio table (`TileResources.map.test.ts:480-497`): every expected value updates `'55%'` → `'65%'`, `'37.9%'` → `'44.8%'`.
  - Every `farmingCollector` object assertion (`:515-603`) drops `side` and uses the new size; confirm `toEqual` (not `toMatchObject`) still passes once `side` is absent from both the actual and expected object — the actual object will also lack `side` once the map.ts change lands, so no partial-match workaround is needed.
  - Retitle: "flips the badge to the left side for a right-anchored bottom slot" (`:540`) and "sizes a triple-slot Wood badge at 55% on the right side for the left-anchored bottom slot" (`:555`) — both describe the removed conditional; new titles should state the slot and the new ratio only (e.g. "sizes a dual-slot Wood badge at 65% for the right-anchored bottom slot").
  - `never returns a px string or a bare number` test (`:499-504`) — unaffected, still matches `/^\d+(\.\d)?%$/` against `'65%'`/`'44.8%'`.
- tester-b (view and e2e):
  - `TileResources.test.tsx:214-228` ("gives a farmed Gold node a 55% collector badge..."): update to 65%, and to the single left-edge CSS recipe (`right: '100%'`, `transform: 'translate(50%, -50%)'`) since Gold at `resourceIslandWithTwoDistinctResources` was previously right-sided.
  - `:230-238` ("gives a farmed Food node a 37.9%..."): update to `'44.8%'`.
  - `:240-254` ("puts the collector badge on the left edge of a right-anchored node..."): retitle (the node is no longer "right-anchored" as the trigger — every node is left now); keep asserting the same left-edge CSS values, now at the Wood node's new ratio.
  - `:256-264` (no-px assertion), `:266-270` (no badge on unfarmed node) — unaffected, confirm they still pass.
  - No e2e spec touches badge size/side (confirm with `grep -rn "collector" e2e/` before closing the phase — not expected to find anything, but don't assume).

## Preview states
- `tile-resources`: existing states unchanged in count/name except `Resource with collector` and `Resource with collector, mobile (badge hidden)` now show the badge at 65%/44.8% on the left (via `withCollectorNode`'s updated literal).
- `tile-resources`: new state "Resource with collector, triple slots" — `resourceIslandWithDualResources` (Gold×2 + Wood×1, expands to 3 nodes across `TRIPLE_RESOURCE_SLOTS`) with `positionedBy: [{ playerId: 0, resource: Wood }]`, built through `toTileResourcesViewModel`; all three slots are visible, the Wood node at `TRIPLE_RESOURCE_SLOTS[2]` (the tightest-margin slot) shows the badge.
- `tile-resources`: new state "Base resource with collector" — `baseIslandWithResources` (now with a `positionedBy` entry) built through `toTileResourcesViewModel`, isBase=true, showing `BASE_RESOURCE_SLOTS` with a badge.

## Risks
- `baseIslandWithResources` has only 2 resources (Food, Gold); it exercises `BASE_RESOURCE_SLOTS[0]` and `BASE_RESOURCE_SLOTS[1]` but not `[2]`. Mitigation: acceptable per ui-design's Final spec, which names this exact fixture for the new state; `BASE_RESOURCE_SLOTS[2]` (`left: 65%`) is the least constrained slot in the per-slot table (span 46.9-61.2% of T) and was already checked by hand in `ui-design.md`'s table — not a review blocker, but call it out if architect-b wants a third base resource added to the fixture instead.
- Deleting `side` from `FarmingCollectorViewModel` is a signature change `toCollectorBadgeStyle` must track exactly; implementer-a (types/map) and implementer-b (tsx) edit in the same phase so a mismatched call site is caught by `npm run typecheck` before the phase closes, not after.

## Review (architect-b)
VERDICT: APPROVED

Verified independently this session, not re-trusting architect-a's citations:
- `BADGE_SIZE_RATIO = 0.55` at `TileResources.map.ts:39`, `badgeSide` conditional at `:126-127`, `toBadgeSize` at `:53-57` — match plan exactly.
- `FarmingCollectorViewModel.side` at `TileResources.types.ts:32`, `toCollectorBadgeStyle` branching on `side` at `TileResources.tsx:24-28`, call site at `:62` — match.
- `grep -rn "FarmingCollectorViewModel|badgeSide|toCollectorBadgeStyle" src/`: only the two files above plus the one call site reference `side`/`badgeSide`/the function — confirms the plan's "nothing outside this folder reads `.side`" claim and that implementer-a/b's edits are self-contained.
- `docs/architecture/systems-and-visuals.md:109` reads "55% of the node's own rendered box (37.9% for Food)... centred on the node's right edge, or on its left edge when the node is anchored to the right edge (`FarmingCollectorViewModel.side`...)" — matches the sentence the plan says to replace.
- `TileResources.map.test.ts:480-497` (ratio table, `'55%'`/`'37.9%'`), `:508-600` (six `side: 'left'|'right'` fields in `toEqual` blocks, titles naming sides at `:508,524,540,555,570,586`) and `TileResources.test.tsx:222-223,237,248-249` (`width`/`height` `'55%'`/`'37.9%'`) — all match the File plan's line ranges and old values.
- `island-tile-slots.types.ts:43-69`: `SINGLE_RESOURCE_SLOT` (left 50/transform/size 39), both `DUAL_RESOURCE_SLOTS` (left 24/right 24, size 32), all three `TRIPLE_RESOURCE_SLOTS` (left 24, right 12, left 12; size 27), all three `BASE_RESOURCE_SLOTS` (left 50/35/65 with transform, size 22) — match the ui-design.md per-slot table's inputs exactly. Re-derived each row's node-left-edge `L` and badge span independently (direct `left:X` sets `L=X`; `right:X` gives `L=100-X-size`; `left:X`+`translateX(-50%)` gives `L=X-size/2`) and got the same 9 rows and the same tightest case, `TRIPLE_RESOURCE_SLOTS[2]`, span 3.2-20.8% of T. No overflow anywhere at 65%. The Food/transform correction in ui-designer-b's review (worst case stays 3.2%, unaffected since that slot is left-anchored with no transform) is correct.
- `TileResources.fixtures.ts:41-53` (`baseIslandWithResources`, 2 resources) and `:36-100` of `TileResources.preview.tsx` (current registry, only `SINGLE_RESOURCE_SLOT` exercised with a collector) — match the plan's claim that 7 of 9 slots currently have no badge coverage in the testbed, justifying the two new preview states.
- `docs/ai/tasks/.../progress.md` Phase 1 box list matches the plan's phase.

Sign-off on the two flagged points:
1. **Delete `side` entirely rather than hardcode `'left'`: agreed.** `grep` above confirms no caller outside this folder reads `.side`, so a hardcoded always-`'left'` field would be a type that can never vary and a permanently-dead CSS branch in `toCollectorBadgeStyle` — exactly the "unused export"/dead-branch case `kiss-dry-solid` rules against. The smaller-diff alternative buys nothing: a future reader would still have to trace that `side` is always `'left'` to know the right-side CSS is unreachable, which is strictly more to carry than no field at all. No change requested.
2. **"Base resource with collector" preview exercising only `BASE_RESOURCE_SLOTS[0]`/`[1]`, not `[2]`: acceptable, no plan change.** Independently re-verified `BASE_RESOURCE_SLOTS[2]` (`left: 65%`, `transform: translateX(-50%)`, `size: 22`) gives `L = 65 - 11 = 54`, badge width `22*0.65=14.3`, span 46.9-61.2% of T — the widest margin of all 9 slots, over 14x the tightest case's margin. The acceptance criterion is "all 9 slots screenshot-checkable" for the overflow risk; `[2]`'s geometry was already covered analytically by both ui-designers and by this review, and it is not the slot carrying any risk. Asking preview-a to invent a third resource on `baseIslandWithResources` to force `[2]`'s rendering would be scope creep for a slot the math already shows is safe by a wide margin — not worth a fixture change outside the File plan. No change requested.

No other findings. File plan owners are clean (no file has two owners editing the same lines in conflicting ways — implementer-a owns map.ts/types.ts/fixtures.ts, implementer-b owns tsx only, no overlap). Contracts block's `toCollectorBadgeStyle({ size }: Pick<FarmingCollectorViewModel, 'size'>)` is structurally compatible with the unchanged call site `toCollectorBadgeStyle(node.farmingCollector)` once `side` is dropped from the inter​face — verified by inspection, no excess narrowing needed since `Pick<T, 'size'>` is satisfied by any object with at least a `size` field. Test plan correctly sequences tester-a (logic) before tester-b (view) per the `testing` skill's logic-before-view-tests rule, and both testers' retitle instructions remove every "left side"/"right side" framing that would otherwise contradict the new always-left behavior.
