import type { Island, MonsterName } from '@/lib/types';
import { IslandType, MAP_COLS, MAP_ROWS, ResourceType } from '@/lib/types';
import { defaultGameSettings } from './game-settings';
import type { MonsterCatalogEntry } from './monster-catalog.types';

// Replaced by a mutable array so each test chooses the catalog contents.
jest.mock('./monster-catalog.generated', () => ({ MONSTER_CATALOG: [] }));

import { MONSTER_CATALOG as mockCatalog } from './monster-catalog';
import { SEED_MONSTER_CATALOG } from './monster-catalog-generator';
import { generateIslandTerrain } from './map-generation';

const CENTER = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

function setCatalog(entries: MonsterCatalogEntry[]): void {
  mockCatalog.splice(0, mockCatalog.length, ...entries);
}

function entry(name: string, level: 1 | 2 | 3 | 4, isBoss = false): MonsterCatalogEntry {
  return {
    name: name as MonsterName,
    level,
    isBoss,
    sprite: { idle: `/monster/${name.toLowerCase()}-idle.gif`, attack: `/monster/${name.toLowerCase()}-attack.gif` },
  };
}

function emptyMap(): Island[][] {
  return Array.from({ length: MAP_ROWS }, (_, y) =>
    Array.from({ length: MAP_COLS }, (_, x): Island => ({
      id: `${x}-${y}`,
      x,
      y,
      type: IslandType.Empty,
      occupants: [],
      resources: [],
      positionedBy: [],
      monsters: [],
    })),
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('generateIslandTerrain', () => {
  describe('center tile', () => {
    it('is a Monster tile holding exactly the boss-tagged monster', () => {
      setCatalog([...SEED_MONSTER_CATALOG, entry('Fire Ogre', 3)]);

      const map = generateIslandTerrain(emptyMap(), defaultGameSettings);
      const center = map[CENTER.y][CENTER.x];

      expect(center.type).toBe(IslandType.Monster);
      expect(center.monsters?.map((monster) => monster.name)).toEqual(['Minotaur']);
      expect(center.monsters?.[0]?.level).toBe(4);
      expect(center.monsters?.[0]?.sprite).toEqual({
        idle: '/monster/boss-minotaur-lvl4-idle.gif',
        attack: '/monster/boss-minotaur-lvl4-attack.gif',
        death: '/sprites/death.gif',
      });
    });

    it('picks among every boss regardless of level', () => {
      setCatalog([entry('Dragon', 1, true), entry('Hydra', 3, true), entry('Lancer', 1)]);
      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      const center = generateIslandTerrain(emptyMap(), defaultGameSettings)[CENTER.y][CENTER.x];

      expect(center.monsters?.map((monster) => monster.name)).toEqual(['Hydra']);
    });

    it('with an empty boss pool takes the distance-1 big-monster roll and is never left empty', () => {
      setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Ogre', 3)]);
      // 0.1: big monster, level 4 roll, empty level 4 falls back to Ogre; little monster level 1 = Lancer
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      const center = generateIslandTerrain(emptyMap(), defaultGameSettings)[CENTER.y][CENTER.x];

      expect(center.type).toBe(IslandType.Monster);
      expect(center.monsters?.map((monster) => monster.name)).toEqual(['Ogre', 'Lancer']);
    });

    it('with an empty boss pool never has an empty center across many real rolls', () => {
      setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Ogre', 3)]);

      for (let i = 0; i < 100; i++) {
        const center = generateIslandTerrain(emptyMap(), defaultGameSettings)[CENTER.y][CENTER.x];
        expect(center.monsters?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Monster tile with no spawnable monsters', () => {
    it('becomes a Resource tile with generated resources', () => {
      // Only a boss exists, so no non-boss pool: every non-center Monster tile spawns nothing.
      setCatalog([entry('Minotaur', 4, true)]);
      // 0.9 is a Monster tile at every distance; generateTileResources then gives one Gold node of 2 * base.
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const map = generateIslandTerrain(emptyMap(), defaultGameSettings);

      map.flat().filter((tile) => !(tile.x === CENTER.x && tile.y === CENTER.y)).forEach((tile) => {
        expect(tile.type).toBe(IslandType.Resource);
        expect(tile.monsters).toEqual([]);
        expect(tile.resources).toEqual([{ type: ResourceType.Gold, amount: 2 * defaultGameSettings.baseResourceAmount }]);
      });
      expect(map[CENTER.y][CENTER.x].type).toBe(IslandType.Monster);
    });

    it('never leaves a Monster tile without monsters, nor a Resource tile without resources', () => {
      setCatalog([entry('Minotaur', 4, true), entry('Lancer', 1)]);

      for (let i = 0; i < 20; i++) {
        generateIslandTerrain(emptyMap(), defaultGameSettings).flat().forEach((tile) => {
          if (tile.type === IslandType.Monster) expect(tile.monsters?.length).toBeGreaterThan(0);
          if (tile.type === IslandType.Resource) expect(tile.resources.length).toBeGreaterThan(0);
        });
      }
    });

    it('keeps a Monster tile as Monster when a monster does spawn', () => {
      setCatalog([...SEED_MONSTER_CATALOG]);
      jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const tile = generateIslandTerrain(emptyMap(), defaultGameSettings)[0][0];

      expect(tile.type).toBe(IslandType.Monster);
      expect(tile.monsters?.length).toBeGreaterThan(0);
      expect(tile.resources).toEqual([]);
    });
  });
});
