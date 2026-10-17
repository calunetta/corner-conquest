import fs from 'fs';
import path from 'path';
import { PlayerColor, ResourceType } from '@/lib/types';
import type { Monster } from '@/lib/types';
import { PLAYER_DATA, getFirstMonsterAtLevel } from '@/modules/game-rules';
import {
  CLOUD_SIZE,
  KNIGHT_POSITION,
  KNIGHT_SIZE_PERCENT,
  MONSTER_POSITION,
  MONSTER_SIZE_PERCENT,
  RESOURCE_NODE_SLOTS,
} from './LobbyBackground.layout';
import {
  BASE_OWNER_COLOR,
  createBaseKnight,
  createMonsterIslandMonster,
  createResourceIslandNodes,
  toCloudStyle,
  toLobbyMonsterViewModel,
} from './LobbyBackground.map';
import type { CloudViewModel, MonsterWanderState } from './LobbyBackground.types';

const COMPONENT_DIR = __dirname;

function makeCloud(overrides: Partial<CloudViewModel> = {}): CloudViewModel {
  return {
    id: 'cloud-test',
    left: 10,
    top: 20,
    durationSeconds: 22,
    scale: 0.8,
    sprite: '/sprites/cloud_small.png',
    ...overrides,
  };
}

function publicFileExists(src: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', src));
}

function makeWander(overrides: Partial<MonsterWanderState> = {}): MonsterWanderState {
  return { isAttacking: false, isFlipped: false, offsetPercent: 0, ...overrides };
}

const TEST_MONSTER: Monster = {
  name: createMonsterIslandMonster().name,
  level: 4,
  sprite: { idle: '/sprites/idle-test.gif', attack: '/sprites/attack-test.gif', death: '/sprites/death.gif' },
};

describe('LobbyBackground.map', () => {
  describe('toCloudStyle', () => {
    it.each([
      { left: 0, top: 0, durationSeconds: 18, scale: 0.6, expectedLeft: '0%', expectedTop: '0%' },
      { left: 90, top: 45, durationSeconds: 28, scale: 1, expectedLeft: '90%', expectedTop: '45%' },
      { left: 37.5, top: 12.25, durationSeconds: 23, scale: 0.75, expectedLeft: '37.5%', expectedTop: '12.25%' },
    ])(
      'maps left $left and top $top to percentage positions and duration $durationSeconds to animationDuration',
      ({ left, top, durationSeconds, scale, expectedLeft, expectedTop }) => {
        const style = toCloudStyle(makeCloud({ left, top, durationSeconds, scale }));

        expect(style).toEqual({
          left: expectedLeft,
          top: expectedTop,
          width: CLOUD_SIZE.width,
          height: CLOUD_SIZE.height,
          animationDuration: `${durationSeconds}s`,
          scale,
        });
      },
    );

    it('does not mutate the cloud it receives', () => {
      const cloud = makeCloud();
      const snapshot = { ...cloud };

      toCloudStyle(cloud);

      expect(cloud).toEqual(snapshot);
    });
  });

  describe('createResourceIslandNodes', () => {
    it('returns exactly one node per resource, in Food, Wood, Gold order', () => {
      const nodes = createResourceIslandNodes();

      expect(nodes.map((node) => node.key)).toEqual([
        ResourceType.Food,
        ResourceType.Wood,
        ResourceType.Gold,
      ]);
    });

    it('uses the real resource sprites for each node', () => {
      const nodes = createResourceIslandNodes();

      expect(nodes.map((node) => node.src)).toEqual([
        '/sprites/sheep.gif',
        '/sprites/tree.gif',
        '/sprites/mine.png',
      ]);
    });

    it('has exactly one layout slot per resource, so no node is dropped or left unplaced', () => {
      expect(RESOURCE_NODE_SLOTS).toHaveLength(3);
      expect(createResourceIslandNodes()).toHaveLength(RESOURCE_NODE_SLOTS.length);
    });

    it('places each node at its slot from RESOURCE_NODE_SLOTS, sized as a percentage of the island', () => {
      const nodes = createResourceIslandNodes();

      nodes.forEach((node, index) => {
        const slot = RESOURCE_NODE_SLOTS[index];
        expect(node.style).toEqual({
          top: slot.top,
          left: slot.left,
          width: `${slot.sizePercent}%`,
          height: `${slot.sizePercent}%`,
        });
      });
    });

    it('returns a sprite path that exists under public/ for every node', () => {
      createResourceIslandNodes().forEach((node) => {
        expect(publicFileExists(node.src)).toBe(true);
      });
    });

    it('returns fresh objects on every call', () => {
      const first = createResourceIslandNodes();
      const second = createResourceIslandNodes();

      expect(first).toEqual(second);
      expect(first[0].style).not.toBe(second[0].style);
    });
  });

  describe('createMonsterIslandMonster', () => {
    it('returns the Minotaur at level 4 with its catalog sprites and the shared death sprite', () => {
      expect(createMonsterIslandMonster()).toEqual({
        name: 'Minotaur',
        level: 4,
        sprite: {
          idle: '/monster/boss-minotaur-lvl4-idle.gif',
          attack: '/monster/boss-minotaur-lvl4-attack.gif',
          death: '/sprites/death.gif',
        },
      });
    });

    it('no longer points at the removed /sprites/minotaur_*.gif files', () => {
      const { idle, attack } = createMonsterIslandMonster().sprite;

      expect(idle).not.toContain('/sprites/minotaur_');
      expect(attack).not.toContain('/sprites/minotaur_');
    });

    it('is deterministic: Math.random is never called and every call returns the same value', () => {
      const randomSpy = jest.spyOn(Math, 'random');

      const results = Array.from({ length: 10 }, () => createMonsterIslandMonster());

      expect(randomSpy).not.toHaveBeenCalled();
      results.forEach((result) => expect(result).toEqual(results[0]));
      randomSpy.mockRestore();
    });

    it('matches the first level-4 catalog entry rather than a copied literal', () => {
      const entry = getFirstMonsterAtLevel(4);
      const monster = createMonsterIslandMonster();

      expect(entry).toBeDefined();
      expect(monster.name).toBe(entry?.name);
      expect(monster.sprite.idle).toBe(entry?.sprite.idle);
      expect(monster.sprite.attack).toBe(entry?.sprite.attack);
    });

    it('returns fresh objects on every call', () => {
      expect(createMonsterIslandMonster()).not.toBe(createMonsterIslandMonster());
    });

    it.each(['idle', 'attack', 'death'] as const)('returns a %s sprite that exists under public/', (key) => {
      const src = createMonsterIslandMonster().sprite[key];

      expect(src).toBeDefined();
      expect(publicFileExists(src as string)).toBe(true);
    });
  });

  describe('BASE_OWNER_COLOR', () => {
    it('is blue, the colour of the castle on the base island', () => {
      expect(BASE_OWNER_COLOR).toBe(PlayerColor.Blue);
    });
  });

  describe('createBaseKnight', () => {
    it('draws the idle sprite of the base owner from PLAYER_DATA', () => {
      expect(createBaseKnight().src).toBe(PLAYER_DATA[BASE_OWNER_COLOR].sprite.idle);
    });

    it('places the knight at KNIGHT_POSITION, sized as a percentage of the island box', () => {
      expect(createBaseKnight().style).toEqual({
        top: KNIGHT_POSITION.top,
        left: KNIGHT_POSITION.left,
        width: `${KNIGHT_SIZE_PERCENT}%`,
        height: `${KNIGHT_SIZE_PERCENT}%`,
      });
    });

    it('returns a knight sprite that exists under public/', () => {
      expect(publicFileExists(createBaseKnight().src)).toBe(true);
    });

    it('returns fresh style objects on every call', () => {
      expect(createBaseKnight().style).not.toBe(createBaseKnight().style);
    });
  });

  describe('toLobbyMonsterViewModel', () => {
    it('shows the idle sprite and no transform while the monster is not wandering', () => {
      const view = toLobbyMonsterViewModel(TEST_MONSTER, makeWander());

      expect(view.spriteSrc).toBe(TEST_MONSTER.sprite.idle);
      expect(view.style.transform).toBe('translateX(0%)');
    });

    it('places the sprite at MONSTER_POSITION, sized as a percentage of the island box', () => {
      const view = toLobbyMonsterViewModel(TEST_MONSTER, makeWander());

      expect(view.style).toMatchObject({
        top: MONSTER_POSITION.top,
        left: MONSTER_POSITION.left,
        width: `${MONSTER_SIZE_PERCENT}%`,
        height: `${MONSTER_SIZE_PERCENT}%`,
      });
    });

    it.each([
      { name: 'a rightward step', offsetPercent: 12, isFlipped: false, expected: 'translateX(12%)' },
      { name: 'a leftward step', offsetPercent: -9, isFlipped: true, expected: 'translateX(-9%) scaleX(-1)' },
      { name: 'a zero step facing right', offsetPercent: 0, isFlipped: false, expected: 'translateX(0%)' },
      { name: 'a leftward step at the range minimum', offsetPercent: -15, isFlipped: true, expected: 'translateX(-15%) scaleX(-1)' },
    ])('translates for $name', ({ offsetPercent, isFlipped, expected }) => {
      const view = toLobbyMonsterViewModel(TEST_MONSTER, makeWander({ offsetPercent, isFlipped }));

      expect(view.style.transform).toBe(expected);
    });

    it('shows the attack sprite and drops the sideways translation while attacking', () => {
      const view = toLobbyMonsterViewModel(TEST_MONSTER, makeWander({ isAttacking: true, offsetPercent: 12 }));

      expect(view.spriteSrc).toBe(TEST_MONSTER.sprite.attack);
      expect(view.style.transform).toBe('');
    });

    it('falls back to the idle sprite while attacking when the monster has no attack sprite', () => {
      const monsterWithoutAttack: Monster = {
        ...TEST_MONSTER,
        sprite: { idle: TEST_MONSTER.sprite.idle, death: TEST_MONSTER.sprite.death },
      };

      const view = toLobbyMonsterViewModel(monsterWithoutAttack, makeWander({ isAttacking: true, offsetPercent: 12 }));

      expect(view.spriteSrc).toBe(TEST_MONSTER.sprite.idle);
      expect(view.spriteSrc).toBeDefined();
    });

    it('keeps the facing while attacking so the monster does not turn around mid-pose', () => {
      const view = toLobbyMonsterViewModel(TEST_MONSTER, makeWander({ isAttacking: true, isFlipped: true, offsetPercent: -9 }));

      expect(view.spriteSrc).toBe(TEST_MONSTER.sprite.attack);
      expect(view.style.transform).toBe('scaleX(-1)');
    });

    it('does not mutate the monster or the wander state it receives', () => {
      const wander = makeWander({ isFlipped: true, offsetPercent: -9 });
      const monsterSnapshot = JSON.parse(JSON.stringify(TEST_MONSTER)) as Monster;
      const wanderSnapshot = { ...wander };

      toLobbyMonsterViewModel(TEST_MONSTER, wander);

      expect(TEST_MONSTER).toEqual(monsterSnapshot);
      expect(wander).toEqual(wanderSnapshot);
    });
  });

  // Regression guard: the lobby background must not depend on the real board's locked slot tables
  // (see LobbyBackground.layout.ts). Every source file in this folder is checked, including files
  // added later, so the guard does not depend on a hand-kept list of names.
  describe('layout independence (regression guard)', () => {
    const sourceFiles = fs
      .readdirSync(COMPONENT_DIR)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => !/\.(test|preview)\.tsx?$/.test(file));

    it('finds the component source files it is guarding', () => {
      expect(sourceFiles).toEqual(expect.arrayContaining([
        'LobbyBackground.layout.ts',
        'LobbyBackground.map.ts',
        'LobbyBackground.hook.ts',
        'LobbyBackground.types.ts',
        'LobbyBackground.tsx',
        'LobbyBackground.monster.hook.ts',
        'LobbyBackground.random.ts',
      ]));
    });

    it.each(sourceFiles)('%s does not reference island-tile-slots', (file) => {
      const source = fs.readFileSync(path.join(COMPONENT_DIR, file), 'utf8');

      expect(source).not.toContain('island-tile-slots');
    });

    // The monster's motion is lobby-owned so it can be tuned in layout.ts without touching the real monster.
    it.each(sourceFiles)('%s does not import the real AnimatedMonster component or hook', (file) => {
      const source = fs.readFileSync(path.join(COMPONENT_DIR, file), 'utf8');

      expect(source).not.toMatch(/from\s+['"][^'"]*AnimatedMonster/);
      expect(source).not.toContain('useAnimatedMonster');
    });
  });
});
