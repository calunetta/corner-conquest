# Triage: Shoreline boat docking & idle collector not working as documented

Request: the shoreline boat docking system and its idle-collector relationship (`docs/README.md` §6.12) are not working — boats and/or idle collectors are not showing up or behaving correctly. Tiny Swords sprite integration is out of scope per user: keep `/sprites/boat.gif`, no dock graphic exists in any local Tiny Swords pack so none will be added.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Spans two sibling view components rendered side-by-side on every island tile: `src/modules/map/components/TileBoats/` (boat anchoring, corner assignment, idle-collector overlay) and `src/modules/map/components/TileOccupants/` (active-farming collector vs. idle-collector per `docs/README.md:427-430`), wired together in `src/modules/map/components/IslandTile/IslandTile.tsx:106,110`.
- Both components independently derive overlapping state (`TileBoats.map.ts` computes `showIdleCollector`/`idleCollectorSprite` from `island.positionedBy`; `TileOccupants` has its own idle-vs-farming logic) — a likely source of the reported breakage, but the exact divergence is unverified and needs root-cause analysis before a fix is written.
- Bug signal: yes, root cause not yet known. Visible UI: yes, but it's a regression against already-documented behavior, not a new design — no UI designers needed.
- No Firestore shape or `GameState` field changes expected; this is presentation-layer only.

## Scope
- In: `TileBoats.tsx`/`.map.ts`/`.hook.ts`, `TileOccupants.tsx`/`.hook.ts`, their tests and fixtures; `IslandTile.tsx` wiring only if the root cause is there.
- Out: Tiny Swords sprite/asset integration (explicitly declined — no Tiny Swords pack has a dock sprite, and the single Enemy Pack boat has no per-player-color variants). Keep existing `/sprites/boat.gif` and `collector_${color}_idle.gif`/`farm_${color}.gif` assets. No game-rule or Firestore changes.

## Open questions
- None — user confirmed: no dock art, keep current boat sprite, fix is about the logic/visibility bug only.
