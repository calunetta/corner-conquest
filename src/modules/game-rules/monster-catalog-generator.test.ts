import fs from 'fs';
import path from 'path';
import {
  SEED_MONSTER_CATALOG,
  buildMonsterCatalogEntries,
  parseMonsterSpriteFilename,
  renderMonsterCatalogSource,
  renderMonsterNameSource,
} from './monster-catalog-generator';

const MONSTER_DIRECTORY = path.join(process.cwd(), 'public', 'monster');

function seedNames(entries: { name: string }[]): string[] {
  return entries.slice(0, SEED_MONSTER_CATALOG.length).map((entry) => entry.name);
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('parseMonsterSpriteFilename', () => {
  it.each([
    { filename: 'lancer-lvl1-idle.gif', expected: { name: 'Lancer', level: 1, isBoss: false, kind: 'idle' } },
    { filename: 'bear-lvl2-attack.gif', expected: { name: 'Bear', level: 2, isBoss: false, kind: 'attack' } },
    { filename: 'ogre-lvl3-idle.gif', expected: { name: 'Ogre', level: 3, isBoss: false, kind: 'idle' } },
    { filename: 'boss-minotaur-lvl4-idle.gif', expected: { name: 'Minotaur', level: 4, isBoss: true, kind: 'idle' } },
    { filename: 'boss-minotaur-lvl4-attack.gif', expected: { name: 'Minotaur', level: 4, isBoss: true, kind: 'attack' } },
    { filename: 'fire-ogre-lvl2-idle.gif', expected: { name: 'Fire Ogre', level: 2, isBoss: false, kind: 'idle' } },
    { filename: 'boss-ice-dragon-lvl3-attack.gif', expected: { name: 'Ice Dragon', level: 3, isBoss: true, kind: 'attack' } },
    { filename: 'boss-dragon-lvl1-idle.gif', expected: { name: 'Dragon', level: 1, isBoss: true, kind: 'idle' } },
    { filename: 'GOBLIN-LVL1-IDLE.GIF', expected: { name: 'Goblin', level: 1, isBoss: false, kind: 'idle' } },
    { filename: 'imp2-lvl1-idle.gif', expected: { name: 'Imp2', level: 1, isBoss: false, kind: 'idle' } },
  ])('parses $filename', ({ filename, expected }) => {
    expect(parseMonsterSpriteFilename(filename)).toEqual(expected);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each(['lancer-lvl1-idle.gif', 'bear-lvl2-attack.gif', 'ogre-lvl3-idle.gif', 'boss-minotaur-lvl4-idle.gif'])(
    'parses the real file %s',
    (filename) => {
      expect(fs.existsSync(path.join(MONSTER_DIRECTORY, filename))).toBe(true);
      expect(parseMonsterSpriteFilename(filename)).not.toBeNull();
    },
  );

  it('parses every real file in public/monster without a warning', () => {
    const filenames = fs.readdirSync(MONSTER_DIRECTORY).filter((file) => file.endsWith('.gif'));

    expect(filenames.length).toBeGreaterThan(0);
    filenames.forEach((filename) => expect(parseMonsterSpriteFilename(filename)).not.toBeNull());
    expect(console.warn).not.toHaveBeenCalled();
  });

  describe('level caps', () => {
    it('rejects a non-boss level 4 and warns', () => {
      expect(parseMonsterSpriteFilename('titan-lvl4-idle.gif')).toBeNull();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('titan-lvl4-idle.gif'));
    });

    it('rejects a boss level 5 and warns', () => {
      expect(parseMonsterSpriteFilename('boss-titan-lvl5-idle.gif')).toBeNull();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('boss-titan-lvl5-idle.gif'));
    });

    it('rejects a non-boss level 9 and warns', () => {
      expect(parseMonsterSpriteFilename('ogre-lvl9-idle.gif')).toBeNull();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('accepts a non-boss level 3 and a boss level 4 (the caps themselves)', () => {
      expect(parseMonsterSpriteFilename('ogre-lvl3-idle.gif')?.level).toBe(3);
      expect(parseMonsterSpriteFilename('boss-ogre-lvl4-idle.gif')?.level).toBe(4);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('rejects lvl0 for boss and non-boss alike, without throwing', () => {
      expect(parseMonsterSpriteFilename('ogre-lvl0-idle.gif')).toBeNull();
      expect(parseMonsterSpriteFilename('boss-ogre-lvl0-idle.gif')).toBeNull();
    });
  });

  describe('boss prefix', () => {
    it('marks isBoss only for the leading "boss-" and strips it from the name', () => {
      expect(parseMonsterSpriteFilename('boss-orc-lvl2-idle.gif')).toMatchObject({ name: 'Orc', isBoss: true });
      expect(parseMonsterSpriteFilename('orc-lvl2-idle.gif')).toMatchObject({ name: 'Orc', isBoss: false });
    });

    it('does not treat a "boss" inside the slug as a prefix', () => {
      expect(parseMonsterSpriteFilename('big-boss-lvl2-idle.gif')).toMatchObject({ name: 'Big Boss', isBoss: false });
    });

    it('does not treat a bare "boss" slug as a prefix', () => {
      expect(parseMonsterSpriteFilename('boss-lvl2-idle.gif')).toMatchObject({ name: 'Boss', isBoss: false });
    });
  });

  describe('invalid names return null without a warning', () => {
    it.each([
      '',
      'lancer.gif',
      'lancer-lvl1.gif',
      'lancer-lvl1-idle.png',
      'lancer-lvl1-idle.gif.bak',
      'lancer-lvl-idle.gif',
      'lancer-lvlx-idle.gif',
      'lancer-lvl1-death.gif',
      'lancer-lvl1-Idle2.gif',
      '-lvl1-idle.gif',
      'lancer_lvl1_idle.gif',
      'lancer-lvl-1-idle.gif',
      'dir/lancer-lvl1-idle.gif',
      '.DS_Store',
      'minotaur_idle.gif',
    ])('%j', (filename) => {
      expect(parseMonsterSpriteFilename(filename)).toBeNull();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});

describe('buildMonsterCatalogEntries', () => {
  it('returns exactly the seeds, in seed order, for an empty scan', () => {
    expect(buildMonsterCatalogEntries([])).toEqual(SEED_MONSTER_CATALOG);
  });

  it('returns the seeds when every filename is invalid', () => {
    expect(buildMonsterCatalogEntries(['readme.txt', '.DS_Store', 'junk.gif'])).toEqual(SEED_MONSTER_CATALOG);
  });

  it('seeds cover levels 1-4 and a boss: Lancer, Bear, Ogre, Minotaur(boss)', () => {
    expect(SEED_MONSTER_CATALOG.map(({ name, level, isBoss }) => ({ name, level, isBoss }))).toEqual([
      { name: 'Lancer', level: 1, isBoss: false },
      { name: 'Bear', level: 2, isBoss: false },
      { name: 'Ogre', level: 3, isBoss: false },
      { name: 'Minotaur', level: 4, isBoss: true },
    ]);
  });

  it('reproduces the seeds from the real public/monster directory', () => {
    const filenames = fs.readdirSync(MONSTER_DIRECTORY);

    expect(buildMonsterCatalogEntries(filenames).slice(0, SEED_MONSTER_CATALOG.length)).toEqual(SEED_MONSTER_CATALOG);
  });

  it('re-adds a seed that the scan is missing', () => {
    const entries = buildMonsterCatalogEntries(['lancer-lvl1-idle.gif', 'lancer-lvl1-attack.gif']);

    expect(seedNames(entries)).toEqual(['Lancer', 'Bear', 'Ogre', 'Minotaur']);
    expect(entries).toHaveLength(4);
  });

  it('pairs idle and attack by name and level', () => {
    const entries = buildMonsterCatalogEntries(['fire-ogre-lvl2-attack.gif', 'fire-ogre-lvl2-idle.gif']);

    expect(entries[entries.length - 1]).toEqual({
      name: 'Fire Ogre',
      level: 2,
      isBoss: false,
      sprite: { idle: '/monster/fire-ogre-lvl2-idle.gif', attack: '/monster/fire-ogre-lvl2-attack.gif' },
    });
  });

  it('keeps an entry with no attack file and leaves attack undefined', () => {
    const entries = buildMonsterCatalogEntries(['mute-ogre-lvl2-idle.gif']);
    const added = entries[entries.length - 1];

    expect(added.sprite).toEqual({ idle: '/monster/mute-ogre-lvl2-idle.gif' });
    expect(added.sprite).not.toHaveProperty('attack');
  });

  it('drops an attack file that has no idle file', () => {
    expect(buildMonsterCatalogEntries(['ghost-lvl2-attack.gif'])).toEqual(SEED_MONSTER_CATALOG);
  });

  it('keeps the same name at different levels as separate entries', () => {
    const entries = buildMonsterCatalogEntries(['orc-lvl1-idle.gif', 'orc-lvl2-idle.gif']);
    const extras = entries.slice(SEED_MONSTER_CATALOG.length);

    expect(extras.map(({ name, level }) => ({ name, level }))).toEqual([
      { name: 'Orc', level: 1 },
      { name: 'Orc', level: 2 },
    ]);
  });

  it('flags boss entries and marks non-boss entries false', () => {
    const entries = buildMonsterCatalogEntries(['boss-hydra-lvl3-idle.gif', 'imp-lvl1-idle.gif']);
    const extras = entries.slice(SEED_MONSTER_CATALOG.length);

    expect(extras.map(({ name, isBoss }) => ({ name, isBoss }))).toEqual([
      { name: 'Hydra', isBoss: true },
      { name: 'Imp', isBoss: false },
    ]);
  });

  it('skips over-cap files with a warning and still returns the seeds', () => {
    const entries = buildMonsterCatalogEntries(['titan-lvl4-idle.gif', 'boss-titan-lvl5-idle.gif', 'orc-lvl0-idle.gif']);

    expect(entries).toEqual(SEED_MONSTER_CATALOG);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('lets a scanned seed replace the seed literal and keeps seed order', () => {
    const entries = buildMonsterCatalogEntries(['ogre-lvl3-idle.gif']);

    expect(seedNames(entries)).toEqual(['Lancer', 'Bear', 'Ogre', 'Minotaur']);
    expect(entries[2].sprite).toEqual({ idle: '/monster/ogre-lvl3-idle.gif' });
  });

  it('puts new entries after the seeds, in filename order', () => {
    const entries = buildMonsterCatalogEntries(['zed-lvl1-idle.gif', 'amy-lvl1-idle.gif']);

    expect(entries.slice(SEED_MONSTER_CATALOG.length).map((entry) => entry.name)).toEqual(['Zed', 'Amy']);
  });

  it('does not mutate the input list or the seed catalog', () => {
    const filenames = ['ogre-lvl3-idle.gif', 'ogre-lvl3-attack.gif', 'imp-lvl1-idle.gif'];
    const filenamesBefore = [...filenames];
    const seedsBefore = JSON.parse(JSON.stringify(SEED_MONSTER_CATALOG));

    buildMonsterCatalogEntries(filenames);

    expect(filenames).toEqual(filenamesBefore);
    expect(SEED_MONSTER_CATALOG).toEqual(seedsBefore);
  });
});

describe('render helpers', () => {
  it('renderMonsterCatalogSource writes one line per entry and omits attack when absent', () => {
    const source = renderMonsterCatalogSource([
      { ...SEED_MONSTER_CATALOG[0] },
      { name: 'Mute' as never, level: 1, isBoss: false, sprite: { idle: '/monster/mute-lvl1-idle.gif' } },
    ]);

    expect(source).toContain(
      "{ name: 'Lancer', level: 1, isBoss: false, sprite: { idle: '/monster/lancer-lvl1-idle.gif', attack: '/monster/lancer-lvl1-attack.gif' } },",
    );
    expect(source).toContain("{ name: 'Mute', level: 1, isBoss: false, sprite: { idle: '/monster/mute-lvl1-idle.gif' } },");
  });

  it('renderMonsterNameSource strips spaces from keys and dedupes names', () => {
    const source = renderMonsterNameSource(['Fire Ogre', 'Bear', 'Fire Ogre']);

    expect(source).toContain("FireOgre: 'Fire Ogre',");
    expect(source.match(/FireOgre:/g)).toHaveLength(1);
    expect(source).toContain("Bear: 'Bear',");
  });
});
