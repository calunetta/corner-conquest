import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';
import { MONSTER_TERRAIN_FILTER, SPECIAL_TERRAIN_FILTER, toTerrainStyle } from './IslandTile.terrain.map';

function island(type: IslandType): Island {
  return { id: '0-0', x: 0, y: 0, type, resources: [], occupants: [] } as Island;
}

describe('toTerrainStyle', () => {
  it('greys and darkens the ground of the special island', () => {
    expect(toTerrainStyle(island(IslandType.Special))).toEqual({ filter: SPECIAL_TERRAIN_FILTER });
  });

  it('gives the monster island its own dangerous tint', () => {
    expect(toTerrainStyle(island(IslandType.Monster))).toEqual({ filter: MONSTER_TERRAIN_FILTER });
    expect(MONSTER_TERRAIN_FILTER).not.toBe(SPECIAL_TERRAIN_FILTER);
  });

  it('leaves the ground of every other island unchanged', () => {
    expect(toTerrainStyle(island(IslandType.Base))).toBeUndefined();
    expect(toTerrainStyle(island(IslandType.Empty))).toBeUndefined();
  });
});
