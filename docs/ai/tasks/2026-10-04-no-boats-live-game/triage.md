# Triage: No boats visible anywhere on the live game board

Request: user reports zero boats visible on the actual running game board (screenshot of a live match, 2 players, mid-game) — not even on the two Base tiles, which `docs/README.md:445` says should always show the owner's anchored boat. Related: idle/farming collector sprites are also not visible on any occupied tile, and several unit sprites appear clipped at the tile's bottom edge.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Root cause unknown and the obvious suspects are ruled out, which is itself the evidence this needs investigation, not a quick patch:
  - `src/modules/map/components/TileBoats/` and `src/modules/map/components/IslandTile/IslandTile.tsx` have **zero uncommitted diff** (`git diff --stat` clean) as of commit `87e4eca`, which fixed and testbed-verified the corner-collision bug in this same area today — the committed logic is confirmed correct in isolation (`npm test` 33/33 in `TileBoats`, testbed preview renders boats correctly at `/testbed/tile-boats`).
  - So the live-game symptom (boats fully absent, not just miscornered) is not reproduced by the component's own unit tests or its testbed preview — the break is upstream of `toTileBoatsViewModel`/`TileBoatsView`, or a rendering/layout issue (z-index, clipping) rather than a logic defect in that pure function.
  - Candidates to rule in/out, not yet checked: `GameBoardContext` wiring on the live page (is `gameState`/`localPlayer` reaching `useTileBoats` the way the fixtures assume?), whether live Firestore-synced `Island.owner`/`occupants` shape matches what `toTileBoatsViewModel` expects, and whether CSS/z-index changes from an in-progress Tiny Swords terrain art swap (`public/tiny-swords/`, `scripts/asset-tools/` — currently untracked, uncommitted, from a different session) are visually covering the boat layer without any logic being wrong. The clipped unit sprites in the same screennshot point toward a layout/CSS cause, not purely a data cause.
  - Collectors (idle and farming) are also absent — same investigation should cover `TileOccupants.tsx`/`TileResources.tsx` collector overlays, since they're siblings in the same tile-rendering stack and share the visibility/positioning plumbing.
- Bug signal: yes, root cause unknown. Visible UI: yes, restoring documented behavior — no UI designers needed. No Firestore shape change expected unless the root cause turns out to be a data-shape mismatch, in which case architect-a escalates back to the user before touching it.

## Scope
- In: why boats and collectors render in the testbed/unit tests but not in an actual running match; fix wherever the real cause is (data wiring, CSS/z-index/clipping, or component logic not covered by existing tests).
- Out: the Tiny Swords terrain/art integration itself (separate, in-progress, uncommitted work by another session) — investigate whether it's the *cause* of occlusion, but don't take over or finish that integration here. If root cause turns out to require changes inside `public/tiny-swords/`-dependent code that doesn't exist yet (i.e. that other integration isn't actually responsible), say so and stop rather than guessing.

## Open questions
- None blocking start — root cause is exactly what Plan stage must determine. If investigation finds the cause is the other session's in-progress Tiny Swords integration itself (not a pre-existing bug), stop and ask the user how to coordinate rather than editing that other session's uncommitted work.
