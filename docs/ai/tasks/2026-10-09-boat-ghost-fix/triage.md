# Triage: Remove ghost boat lingering at base after army departs

Request: Fix audit point 115 — the boat rendered at a player's Base tile never disappears once that player's army moves away, leaving an empty "ghost" boat permanently docked at base.
Type: bug
Tier: S
Pipeline: architect-a architect-b implementer-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Root cause isolated to one pure mapper function, `src/modules/map/components/TileBoats/TileBoats.map.ts`. No type or contract changes.
- Visual-only change, but it changes what's rendered on every Base tile for the whole match, so needs a preview check (desktop + mobile) before/after, not just a code read.

## Scope
- In: `TileBoats.map.ts`'s base-tile fallback branch (`toTileBoatsViewModel`), its existing tests, and a testbed preview check of a base tile with the owner's army away.
- Out: the non-base boat-docking logic (occupant-tied boats at other islands) — confirmed already correct, not touched. Idle-collector sprite/size bug (audit point 116) is a separate, likely-unrelated component (`TileOccupants` vs. the boat's own idle-collector sprite) — tracked as its own task (`2026-10-09-sprite-sizing-fixes`), not fixed here even though it's visually adjacent.

## Open questions
- None for the code fix itself. One design confirmation folded into the plan's Decision: should the Base tile show *no* boat at all once the owning player's armies have all left, or should it keep a static "dock" visual with no boat sprite? Plan defaults to "no boat" (simplest, matches the complaint), flag to the user/UI designer only if that reads as too empty once previewed.
