# Triage: Collector badge — bigger, always left

Request: Bump the farming-collector badge from 55% to 65% of the resource node's own box, and always place it on the node's left side (matching the farmer sprite's facing direction) instead of the current logic that flips to the right edge for most nodes and only goes left when the node itself is anchored to the tile's right edge.
Type: refactor
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier

- Verified this session:
  - [TileResources.map.ts:36-39](src/modules/map/components/TileResources/TileResources.map.ts:36) — `BADGE_SIZE_RATIO = 0.55`, with a comment explaining there is deliberately no px floor so the badge can't be bigger than its own node at small tile sizes.
  - [TileResources.map.ts:126-127](src/modules/map/components/TileResources/TileResources.map.ts:126) — current side rule: `badgeSide = slot.right !== undefined && slot.left === undefined ? 'left' : 'right'`, i.e. left only when the node itself is anchored to the tile's right edge.
  - [island-tile-slots.types.ts:59-63](src/modules/map/island-tile-slots.types.ts:59) — `TRIPLE_RESOURCE_SLOTS[2]` is `{ top: '70%', left: '12%', size: 27 }`, a node anchored only 12% of T from the tile's left edge.
- **Overflow risk found by hand, not yet decided:** at left:12%, size 27, a left-anchored badge at the *current* 0.55 ratio would be `27 * 0.55 = 14.85%` wide, spanning from `12 - 14.85 = -2.85%` to `12%` of T — already past the tile's left edge today in principle (today this exact case renders on the *right* instead, which is why it's never been visible). At the requested 0.65 ratio the same slot's badge would be `27 * 0.65 = 17.55%` wide, spanning `-5.55%` to `12%` — a bigger overflow, and forcing it to always render left would make this the normal case for every node near the left edge, not a one-off.
- This is exactly the class of bug the Oct 11 layout-consolidation and responsive-sizing tasks (`docs/ai/tasks/2026-10-11-island-tile-layout-consolidation`, `docs/ai/tasks/2026-10-11-resource-sprite-responsive-sizing`) spent two phases fixing — a positioning rule changed without checking it against every slot's actual geometry. Per the triage table this makes it a tier-M "root cause analysis" item, not an S tweak implementers can do by just following the existing pattern: the existing pattern (side flips to avoid edge overflow) is precisely what the request asks to remove, so someone has to work out, per slot, whether "always left" is safe as-is or needs a per-slot exception/smaller badge near the left edge.
- Visible UI: yes (badge size and side change for every farmed resource) — `ui-designer-a`/`ui-designer-b` run before the architects per the tier-M rule.
- Gameplay: no rule/number change. Data: no Firestore/`GameState` change.
- Files/layers: `TileResources.map.ts` (ratio constant, side logic — logic layer, implementer-a), `TileResources.tsx` (`toCollectorBadgeStyle`, if the per-side CSS recipe needs to change — view layer, implementer-b), `TileResources.map.test.ts` (badge-size and badge-side assertions, e.g. test titles and values at [TileResources.map.test.ts:524](src/modules/map/components/TileResources/TileResources.map.test.ts:524) and [:555](src/modules/map/components/TileResources/TileResources.map.test.ts:555)), `TileResources.test.tsx` (badge style assertions at [TileResources.test.tsx:214](src/modules/map/components/TileResources/TileResources.test.tsx:214) and [:230](src/modules/map/components/TileResources/TileResources.test.tsx:230)), `docs/architecture/systems-and-visuals.md:109` (documents the current 55%/side rule). About 5 files, one component family — fits in one phase.
- No existing row in `docs/ai/refactor.md` for this.

## Scope

- In: the badge size ratio (55% → 65%) and the badge-side rule (conditional → always-left, unless the ui-designer/architect pass finds a geometric reason a specific slot needs an exception to avoid tile-edge overflow); updating the doc sentence and every test asserting the old ratio/side.
- Out: the resource-node slot *position* table itself (`island-tile-slots.types.ts`'s `top`/`left`/`right`/`size` values — frozen by the prior consolidation task, not reopened here unless the badge change is provably unsafe without touching it, in which case say so back to the user instead of changing it silently); the mobile badge-hidden behavior (unchanged); any new preview states beyond what's needed to see the new ratio/side on the existing states.

## Open questions

- None — proceeding with the swarm. The overflow risk above is exactly what `ui-designer-a`/`ui-designer-b` and `architect-a`/`architect-b` are tasked with resolving (e.g. deciding whether a smaller left-edge exception is needed) before `implementer-a` touches code.
