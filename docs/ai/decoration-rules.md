# Decoration art rules

Rules for the decorations drawn on island tiles (layouts in `src/modules/map/decoration-layouts.config.json` and
the variant layouts in `tile-variants.config.json`). They are enforced by `findDecorationRuleViolations` in
`src/modules/map/decoration-rules.map.ts`, which `decoration-rules.map.test.ts` runs against the shipped configs.
A new layout that breaks a rule fails that test. Change a rule there and here together.

## Position
- A decoration's centre is `top` 3–85 % and `left` 8–85 % of the tile side (`decoration-bounds.map.ts`).

## Weapons and tools (`tool-*.png`)
- Weapons lie on the floor only on a monster island (`monster-alive`, `monster-cleared`).
- At most 3 per layout. The cleared monster island shows 2 or 3.
- None on the special island, the player base, resource islands or empty islands.

## Monster island (cleared)
- Dead ground: skull sticks and bones, some rocks and stones, and 2 or 3 weapons.
- No trees.

## Special island
- The built-in special art is always drawn; decorations go around it. Moving the built-in art moves its card animation too.
- No picture: the special island never takes a variant image (`usesBuiltInArtOnly` in `TileVariants.config.ts`). The editor hides the picture field, the upload route refuses uploads, and `validateVariant` refuses a saved image.
- The ground is bare, grey and dark: ash (`ash-*.png`), dark fungus (`fungus-dark-*.png`), dark shrubs (`shrub-dark-*.gif`).
- Standing structures are not allowed. Only ruins (`ruin-castle.png`, `ruin-tower.png`) may appear, at the player base's building size.
- At most one skull stick (`skull-spike-*.png`) per layout.
- At most 3 bones (`bones-*.png`) per layout.
- No weapons. Black units (pawns, archer, etc.) are allowed.

## Player base
- Mushrooms, stones, rocks, bushes and shrubs, plants and gold. No trees, weapons, bones, skulls, signs or chests in base variants.
- Player base buildings: archery, barracks, castle, tower, monastery. No houses.
- Default base grove (not a variant) still uses trees, as set in the editor defaults.

## Monster variants
- 16 monster variants (decorations only, no picture). Each has a lair layout (`monster-alive`) and a dead-ground layout (`monster-cleared`), with the same weapon cap.

## Resource islands
- Each resource type has its own ground (food: sheep, pumpkins, plants; wood: stumps and trees; gold: gold stones, rocks, stones).
- No weapons.

## Player base building sizes (% of tile)
| Building   | Size |
|------------|------|
| Archery    | 52   |
| Barracks   | 56   |
| Castle     | 60   |
| Tower      | 56   |
| Monastery  | 50   |

Ruins on the special island use the same sizes: castle 60, tower 56.

The validator reads these sizes from the base variants, so they stay the single source of truth.
