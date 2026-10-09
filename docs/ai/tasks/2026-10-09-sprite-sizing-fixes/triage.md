# Triage: Idle-collector-vs-knight layering fix + FightIcon size audit

Request: Fix audit points 114 and 116 — the docked idle-collector sprite on a boat is hidden/dwarfed by the army's own soldier sprite rendering on top of it, and `FightIcon` (sword) renders too large in at least one of its four call sites.
Type: bug
Tier: S
Pipeline: architect-a architect-b implementer-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Both are CSS-sizing/z-index adjustments in existing, already-split components (`TileBoats`, `TileOccupants`, `FightIcon` callers) — no new files, no logic changes, no type changes.
- Still needs a real browser check at desktop + mobile before/after, since this is purely visual and the current code's own comments show the overlap was already a deliberate (if now-acknowledged-wrong) sizing choice.

## Scope
- In: `TileBoats.styles.ts` (`collectorOverlay`/`collectorImage` size and position) and/or `TileOccupants.styles.ts` (`slot`/`image` size) so the idle collector is visible and reads as a farmer, not eclipsed by the soldier sprite on the same boat; the four `FightIcon` call sites' size classNames (`CombatDialog.styles.ts` `headerIconSvg`/`vsIconSvg`, `ArmySelectionDialog.styles.ts` `icon`, `PlayerInfoStats.styles.ts` `statIcon`, `ActionButton.tsx`'s inline `h-4 w-4`).
- Out: the base-tile ghost boat (separate task, `2026-10-09-boat-ghost-fix`), the resource-node collector positioning and overall `TileResources` layout (separate task, `2026-10-09-island-tile-visual-redesign` — that one explicitly needs design review, this one doesn't).

## Open questions
- None blocking — root cause for the collector/knight overlap is confirmed in code (z-index + box-size stacking, see plan.md). The exact target size for each is a visual call the implementer makes and preview-b verifies against `ui-design.md`, not a design-review-level decision.
