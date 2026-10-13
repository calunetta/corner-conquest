import fs from 'fs';
import path from 'path';
import { ResourceType } from '@/lib/types';
import { MONSTER_DATA } from '@/modules/game-rules';
import { CLOUD_SIZE, RESOURCE_NODE_SLOTS } from './LobbyBackground.layout';
import {
  createMonsterIslandMonster,
  createResourceIslandNodes,
  toCloudStyle,
} from './LobbyBackground.map';
import type { CloudViewModel } from './LobbyBackground.types';

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
    it('returns the Minotaur at level 4 with its MONSTER_DATA sprites', () => {
      expect(createMonsterIslandMonster()).toEqual({
        name: 'Minotaur',
        level: 4,
        sprite: {
          idle: '/sprites/minotaur_idle.gif',
          attack: '/sprites/minotaur_attack.gif',
          death: '/sprites/death.gif',
        },
      });
    });

    it('matches the MONSTER_DATA entry for level 4 rather than a copied literal', () => {
      const monster = createMonsterIslandMonster();

      expect(monster.name).toBe(MONSTER_DATA[4].name);
      expect(monster.sprite).toEqual(MONSTER_DATA[4].sprite);
    });

    it.each(['idle', 'attack', 'death'] as const)('returns a %s sprite that exists under public/', (key) => {
      expect(publicFileExists(createMonsterIslandMonster().sprite[key])).toBe(true);
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
      ]));
    });

    it.each(sourceFiles)('%s does not reference island-tile-slots', (file) => {
      const source = fs.readFileSync(path.join(COMPONENT_DIR, file), 'utf8');

      expect(source).not.toContain('island-tile-slots');
    });
  });
});
