import { MAP_COLS, MAP_ROWS } from '@/lib/types';
import type { MonsterName } from '@/lib/types';
import type { MonsterCatalogEntry } from './monster-catalog.types';

// The generated catalog is replaced by a mutable array so each test controls which names exist.
// monster-catalog.ts reads the same array reference on every call, so tests mutate the re-exported array.
jest.mock('./monster-catalog.generated', () => ({ MONSTER_CATALOG: [] }));

import {
  generateMonsters,
  getBossCandidates,
  getFirstMonsterAtLevel,
  getNonBossCandidatesByLevel,
  pickBossMonster,
  MONSTER_CATALOG as mockCatalog,
  toMonster,
} from './monster-catalog';
import { SEED_MONSTER_CATALOG } from './monster-catalog-generator';

const CENTER_X = Math.floor(MAP_COLS / 2);
const CENTER_Y = Math.floor(MAP_ROWS / 2);
const RING_1 = { x: CENTER_X + 1, y: CENTER_Y };
const RING_2 = { x: CENTER_X + 2, y: CENTER_Y };
const RING_OUTER = { x: CENTER_X + 4, y: CENTER_Y };
const SHARED_DEATH_SPRITE = '/sprites/death.gif';

function entry(
  name: string,
  level: 1 | 2 | 3 | 4,
  options: { isBoss?: boolean; attack?: boolean } = {},
): MonsterCatalogEntry {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return {
    name: name as MonsterName,
    level,
    isBoss: options.isBoss ?? false,
    sprite: {
      idle: `/monster/${slug}-lvl${level}-idle.gif`,
      ...(options.attack === false ? {} : { attack: `/monster/${slug}-lvl${level}-attack.gif` }),
    },
  };
}

function setCatalog(entries: MonsterCatalogEntry[]): void {
  mockCatalog.splice(0, mockCatalog.length, ...entries);
}

/** Math.random returns the given values in order, then repeats the last one. */
function mockRandomSequence(values: number[]): jest.SpyInstance {
  let index = 0;
  return jest.spyOn(Math, 'random').mockImplementation(() => values[Math.min(index++, values.length - 1)]);
}

function namesOf(monsters: { name: string }[]): string[] {
  return monsters.map((monster) => monster.name);
}

beforeEach(() => {
  setCatalog(SEED_MONSTER_CATALOG.map((seed) => ({ ...seed, sprite: { ...seed.sprite } })));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('seed entries (real generated catalog)', () => {
  const realCatalog = jest.requireActual<{ MONSTER_CATALOG: MonsterCatalogEntry[] }>(
    './monster-catalog.generated',
  ).MONSTER_CATALOG;

  it.each([
    { name: 'Lancer', level: 1, isBoss: false },
    { name: 'Bear', level: 2, isBoss: false },
    { name: 'Ogre', level: 3, isBoss: false },
    { name: 'Minotaur', level: 4, isBoss: true },
  ])('contains $name at level $level with isBoss $isBoss', ({ name, level, isBoss }) => {
    const found = realCatalog.find((candidate) => candidate.name === name);

    expect(found).toMatchObject({ name, level, isBoss });
    expect(found?.sprite.idle).toMatch(/^\/monster\/.+-lvl\d-idle\.gif$/);
  });

  it('has no two entries with the same name and level', () => {
    const keys = realCatalog.map((candidate) => `${candidate.name}|${candidate.level}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('candidate lookups', () => {
  beforeEach(() => {
    setCatalog([
      ...SEED_MONSTER_CATALOG,
      entry('Fire Ogre', 3),
      entry('Titan', 4),
      entry('Red Lancer', 1),
    ]);
  });

  it('getNonBossCandidatesByLevel returns only non-boss entries of that level, in catalog order', () => {
    expect(namesOf(getNonBossCandidatesByLevel(3))).toEqual(['Ogre', 'Fire Ogre']);
    expect(namesOf(getNonBossCandidatesByLevel(4))).toEqual(['Titan']);
    expect(namesOf(getNonBossCandidatesByLevel(1))).toEqual(['Lancer', 'Red Lancer']);
  });

  it('getNonBossCandidatesByLevel returns an empty array for a level with no entry', () => {
    expect(getNonBossCandidatesByLevel(0)).toEqual([]);
    expect(getNonBossCandidatesByLevel(5)).toEqual([]);
  });

  it('getBossCandidates returns only boss entries', () => {
    expect(namesOf(getBossCandidates())).toEqual(['Minotaur']);
  });

  it('getFirstMonsterAtLevel returns the first catalog entry at the level, boss or not', () => {
    expect(getFirstMonsterAtLevel(4)?.name).toBe('Minotaur');
    expect(getFirstMonsterAtLevel(3)?.name).toBe('Ogre');
  });

  it('getFirstMonsterAtLevel returns undefined for an empty level', () => {
    expect(getFirstMonsterAtLevel(5)).toBeUndefined();
  });
});

describe('toMonster', () => {
  it('maps an entry with both sprites and adds the shared death sprite', () => {
    expect(toMonster(entry('Bear', 2))).toEqual({
      name: 'Bear',
      level: 2,
      sprite: {
        idle: '/monster/bear-lvl2-idle.gif',
        attack: '/monster/bear-lvl2-attack.gif',
        death: SHARED_DEATH_SPRITE,
      },
    });
  });

  it('leaves attack undefined, not the idle path, when the entry has no attack sprite', () => {
    const monster = toMonster(entry('Mute Bear', 2, { attack: false }));

    expect(monster.sprite).toEqual({
      idle: '/monster/mute-bear-lvl2-idle.gif',
      attack: undefined,
      death: SHARED_DEATH_SPRITE,
    });
    expect(monster.sprite.attack).toBeUndefined();
  });

  it('does not carry isBoss onto the Monster and does not mutate the entry', () => {
    const source = entry('Minotaur', 4, { isBoss: true });
    const snapshot = JSON.parse(JSON.stringify(source));

    const monster = toMonster(source);

    expect(monster).not.toHaveProperty('isBoss');
    expect(source).toEqual(snapshot);
  });
});

describe('generateMonsters', () => {
  describe('with the seed catalog', () => {
    it('never returns two monsters with the same name, on any tile', () => {
      for (let x = 0; x < MAP_COLS; x++) {
        for (let y = 0; y < MAP_ROWS; y++) {
          for (let i = 0; i < 20; i++) {
            const names = namesOf(generateMonsters(x, y));
            expect(new Set(names).size).toBe(names.length);
          }
        }
      }
    });

    it('returns fully populated Monster objects with the shared death sprite', () => {
      const monsters = generateMonsters(RING_1.x, RING_1.y);

      expect(monsters.length).toBeGreaterThan(0);
      monsters.forEach((monster) => {
        expect(monster.sprite.idle).toMatch(/^\/monster\//);
        expect(monster.sprite.attack).toMatch(/^\/monster\//);
        expect(monster.sprite.death).toBe(SHARED_DEATH_SPRITE);
        expect([1, 2, 3, 4]).toContain(monster.level);
      });
    });

    it('never returns the boss on a normal roll (boss is not in the non-boss pool)', () => {
      for (let i = 0; i < 200; i++) {
        expect(namesOf(generateMonsters(CENTER_X, CENTER_Y))).not.toContain('Minotaur');
      }
    });
  });

  describe('distance-gated levels', () => {
    beforeEach(() => {
      setCatalog([
        ...SEED_MONSTER_CATALOG,
        entry('Fire Ogre', 3),
        entry('Titan', 4),
        entry('Red Lancer', 1),
        entry('Cub', 2),
      ]);
    });

    it('outer ring (distance 4) only yields levels 1 and 2', () => {
      for (let i = 0; i < 300; i++) {
        generateMonsters(RING_OUTER.x, RING_OUTER.y).forEach((monster) => {
          expect([1, 2]).toContain(monster.level);
        });
      }
    });

    it('distance 2 never yields level 4 even though a level-4 non-boss exists', () => {
      for (let i = 0; i < 300; i++) {
        generateMonsters(RING_2.x, RING_2.y).forEach((monster) => {
          expect([1, 2, 3]).toContain(monster.level);
        });
      }
    });

    it('distance 3 (boundary) still yields level 3 and never level 4', () => {
      const seenLevels = new Set<number>();
      for (let i = 0; i < 400; i++) {
        generateMonsters(CENTER_X + 3, CENTER_Y).forEach((monster) => seenLevels.add(monster.level));
      }

      expect(seenLevels.has(3)).toBe(true);
      expect(seenLevels.has(4)).toBe(false);
    });

    it('distance 4 (boundary) never yields level 3', () => {
      for (let i = 0; i < 400; i++) {
        expect(generateMonsters(CENTER_X + 2, CENTER_Y + 2).every((monster) => monster.level <= 2)).toBe(true);
      }
    });

    it('ring 1 can yield level 4 when a non-boss level-4 candidate exists', () => {
      const seenNames = new Set<string>();
      for (let i = 0; i < 600; i++) {
        namesOf(generateMonsters(RING_1.x, RING_1.y)).forEach((name) => seenNames.add(name));
      }

      expect(seenNames.has('Titan')).toBe(true);
    });
  });

  describe('level-first pick', () => {
    it('picks the level with the same probabilities, then a name uniformly among that level only', () => {
      // Level 3 has two names; level 2 has one. A name-first pick over all entries would differ.
      setCatalog([...SEED_MONSTER_CATALOG, entry('Fire Ogre', 3)]);

      // ring 1: big (0.1<0.3), level 3 (0.9>=0.25), pick index 0 of [Ogre, Fire Ogre], little level 1, pick Lancer
      mockRandomSequence([0.1, 0.9, 0, 0.1, 0]);
      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Ogre', 'Lancer']);
      jest.restoreAllMocks();

      // same, but the name pick lands on the last level-3 candidate
      mockRandomSequence([0.1, 0.9, 0.99, 0.1, 0]);
      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Fire Ogre', 'Lancer']);
    });

    it('rolls level 4 on ring 1 with probability below 0.25 and picks the level-4 non-boss', () => {
      setCatalog([...SEED_MONSTER_CATALOG, entry('Titan', 4)]);

      mockRandomSequence([0.1, 0.24, 0, 0.1, 0]);

      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Titan', 'Lancer']);
    });

    it('rolls level 3 on ring 1 at the 0.25 boundary', () => {
      setCatalog([...SEED_MONSTER_CATALOG, entry('Titan', 4)]);

      mockRandomSequence([0.1, 0.25, 0, 0.1, 0]);

      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Ogre', 'Lancer']);
    });

    it('pairs a big monster with a level-2 little monster when the little roll is 0.6 or above', () => {
      mockRandomSequence([0.1, 0.9, 0, 0.6, 0]);

      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Ogre', 'Bear']);
    });
  });

  describe('sibling fallback', () => {
    it('ring 1: a rolled level 4 with no non-boss candidate falls back to level 3', () => {
      // Seed catalog: the only level-4 entry is the boss, so the non-boss level-4 pool is empty.
      mockRandomSequence([0.1, 0.1, 0, 0.1, 0]);

      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Ogre', 'Lancer']);
    });

    it('ring 1: a rolled level 3 with no candidate falls back to level 4', () => {
      setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Titan', 4)]);

      mockRandomSequence([0.1, 0.9, 0, 0.1, 0]);

      expect(namesOf(generateMonsters(RING_1.x, RING_1.y))).toEqual(['Titan', 'Lancer']);
    });

    it('distance 2: an empty level 3 does not fall back to level 4 (level 4 is not allowed there)', () => {
      setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Titan', 4)]);

      // big (0.1<0.3) -> level 3 empty, level 4 not allowed -> big slot dropped; little level 1 follows
      mockRandomSequence([0.1, 0.1, 0]);

      const names = namesOf(generateMonsters(RING_2.x, RING_2.y));

      expect(names).toEqual(['Lancer']);
    });

    it.each([
      { title: 'level 1 empty falls back to level 2', catalog: [entry('Bear', 2), entry('Ogre', 3)], expected: ['Bear'] },
      { title: 'level 2 empty falls back to level 1', catalog: [entry('Lancer', 1), entry('Ogre', 3)], expected: ['Lancer'] },
    ])('outer ring: $title', ({ catalog, expected }) => {
      setCatalog(catalog);

      // one little monster (0.1<0.7); level pick 0 -> level 1 or the only gate; fallback decides the name
      mockRandomSequence([0.1, catalog[0].level === 2 ? 0 : 0.99, 0]);

      expect(namesOf(generateMonsters(RING_OUTER.x, RING_OUTER.y))).toEqual(expected);
    });
  });

  describe('empty and degenerate pools', () => {
    it('returns an empty array, never undefined or a throw, when no level has a candidate', () => {
      setCatalog([entry('Minotaur', 4, { isBoss: true })]);

      [RING_1, RING_2, RING_OUTER, { x: CENTER_X, y: CENTER_Y }].forEach(({ x, y }) => {
        expect(generateMonsters(x, y)).toEqual([]);
      });
    });

    it('returns an empty array for an empty catalog', () => {
      setCatalog([]);

      expect(generateMonsters(RING_OUTER.x, RING_OUTER.y)).toEqual([]);
    });

    it('drops a duplicate name when both rolled slots resolve to the same entry', () => {
      setCatalog([entry('Lancer', 1)]);

      // outer ring: two little monsters (0.9>=0.7), both rolled at level 1 -> same Lancer twice
      mockRandomSequence([0.9, 0, 0, 0, 0]);

      expect(namesOf(generateMonsters(RING_OUTER.x, RING_OUTER.y))).toEqual(['Lancer']);
    });

    it('keeps two different names when the rolls land on different entries', () => {
      setCatalog([entry('Lancer', 1), entry('Red Lancer', 1)]);

      // two little monsters, level pick 0, name picks 0 then 0.99
      mockRandomSequence([0.9, 0, 0, 0, 0.99]);

      expect(namesOf(generateMonsters(RING_OUTER.x, RING_OUTER.y))).toEqual(['Lancer', 'Red Lancer']);
    });

    it('ring 1 without a level 1 or 2 pool still never throws', () => {
      setCatalog([entry('Ogre', 3)]);

      for (let i = 0; i < 100; i++) {
        expect(() => generateMonsters(RING_1.x, RING_1.y)).not.toThrow();
      }
    });
  });

  describe('many candidates, stress', () => {
    it('never duplicates a name when several candidates per level exist', () => {
      setCatalog([
        ...SEED_MONSTER_CATALOG,
        entry('Red Lancer', 1),
        entry('Cub', 2),
        entry('Fire Ogre', 3),
        entry('Titan', 4),
      ]);

      for (let x = 0; x < MAP_COLS; x++) {
        for (let y = 0; y < MAP_ROWS; y++) {
          for (let i = 0; i < 20; i++) {
            const names = namesOf(generateMonsters(x, y));
            expect(new Set(names).size).toBe(names.length);
          }
        }
      }
    });
  });
});

describe('pickBossMonster', () => {
  it('returns the seed Minotaur as a Monster when it is the only boss', () => {
    expect(pickBossMonster()).toEqual({
      name: 'Minotaur',
      level: 4,
      sprite: {
        idle: '/monster/boss-minotaur-lvl4-idle.gif',
        attack: '/monster/boss-minotaur-lvl4-attack.gif',
        death: SHARED_DEATH_SPRITE,
      },
    });
  });

  it('is deterministic with a single boss across calls', () => {
    const names = Array.from({ length: 20 }, () => pickBossMonster()?.name);

    expect(new Set(names)).toEqual(new Set(['Minotaur']));
  });

  it('picks uniformly among bosses regardless of their level', () => {
    setCatalog([...SEED_MONSTER_CATALOG, entry('Dragon', 1, { isBoss: true }), entry('Hydra', 3, { isBoss: true })]);

    mockRandomSequence([0]);
    expect(pickBossMonster()?.name).toBe('Minotaur');
    jest.restoreAllMocks();

    mockRandomSequence([0.5]);
    expect(pickBossMonster()?.name).toBe('Dragon');
    jest.restoreAllMocks();

    mockRandomSequence([0.99]);
    expect(pickBossMonster()?.level).toBe(3);
  });

  it('never returns a non-boss entry', () => {
    setCatalog([...SEED_MONSTER_CATALOG, entry('Fire Ogre', 3)]);

    for (let i = 0; i < 100; i++) {
      expect(pickBossMonster()?.name).toBe('Minotaur');
    }
  });

  it('returns undefined when the boss pool is empty (the center then falls back to generateMonsters)', () => {
    setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Ogre', 3)]);

    expect(pickBossMonster()).toBeUndefined();
  });

  it('center fallback: with no boss, generateMonsters at the center still returns a valid roll', () => {
    setCatalog([entry('Lancer', 1), entry('Bear', 2), entry('Ogre', 3)]);

    expect(pickBossMonster()).toBeUndefined();
    mockRandomSequence([0.1, 0.9, 0, 0.1, 0]);

    expect(namesOf(generateMonsters(CENTER_X, CENTER_Y))).toEqual(['Ogre', 'Lancer']);
  });
});
