import { styles as tileDecorationsStyles } from './components/TileDecorations/TileDecorations.styles';
import { styles as islandTileStyles } from './components/IslandTile/IslandTile.styles';
import { styles as tileBoatsStyles } from './components/TileBoats/TileBoats.styles';
import { styles as tileOccupantsStyles } from './components/TileOccupants/TileOccupants.styles';

// Locks in the island-tile layer order: decorations < center content < boats < occupants.
// Each number is extracted from the real styles export's own class string (z-[N] or zN), not
// hand-copied — a future class-string edit changes what this test reads, so a regression in the
// order fails here instead of silently drifting.
function extractZIndex(classString: string): number {
  const match = classString.match(/z-\[(-?\d+)\]|\bz-(\d+)\b/);
  if (!match) {
    throw new Error(`No z-index utility class found in "${classString}"`);
  }
  const value = match[1] ?? match[2];
  return Number(value);
}

describe('island tile layer z-index chain', () => {
  const decorationsZ = extractZIndex(tileDecorationsStyles.container);
  const centerContentZ = extractZIndex(islandTileStyles.centerContent);
  const boatsZ = extractZIndex(tileBoatsStyles.container);
  const occupantsZ = extractZIndex(tileOccupantsStyles.container);

  it('stacks TileDecorations below IslandTile centerContent', () => {
    expect(decorationsZ).toBeLessThan(centerContentZ);
  });

  it('stacks IslandTile centerContent below TileBoats', () => {
    expect(centerContentZ).toBeLessThan(boatsZ);
  });

  it('stacks TileBoats below TileOccupants', () => {
    expect(boatsZ).toBeLessThan(occupantsZ);
  });
});
