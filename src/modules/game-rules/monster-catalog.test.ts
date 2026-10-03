import { generateMonsters, MONSTER_DATA } from './monster-catalog';
import { MAP_COLS, MAP_ROWS } from '@/lib/types';

describe('Monster Catalog', () => {
  describe('generateMonsters', () => {
    it('returns only level-1/2 monsters at outer-ring distance', () => {
      // Outer ring: distance > 3 from center
      const outerPos = { x: 0, y: 0 };

      // Run multiple times due to randomness
      for (let i = 0; i < 20; i++) {
        const monsters = generateMonsters(outerPos.x, outerPos.y);
        expect(monsters.length).toBeGreaterThan(0);
        monsters.forEach(m => {
          expect([1, 2]).toContain(m.level);
        });
      }
    });

    it('can include level-3/4 monsters at center and mid-ring', () => {
      const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

      // Run many iterations to hit the level-3/4 possibility at center
      let found34 = false;
      for (let i = 0; i < 100; i++) {
        const monsters = generateMonsters(center.x, center.y);
        if (monsters.some(m => m.level === 3 || m.level === 4)) {
          found34 = true;
          break;
        }
      }
      expect(found34).toBe(true);
    });

    it('never duplicates a monster name on one tile', () => {
      // Run for various positions to ensure no duplicates ever occur
      for (let x = 0; x < MAP_COLS; x++) {
        for (let y = 0; y < MAP_ROWS; y++) {
          for (let i = 0; i < 5; i++) {
            const monsters = generateMonsters(x, y);
            const names = monsters.map(m => m.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
          }
        }
      }
    });

    it('returns valid monster data references', () => {
      const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };
      const monsters = generateMonsters(center.x, center.y);

      expect(monsters.length).toBeGreaterThan(0);
      monsters.forEach(m => {
        // Verify monster has all required fields
        expect(m.name).toBeDefined();
        expect(m.level).toBeDefined();
        expect(m.sprite).toBeDefined();
        expect(m.sprite.idle).toBeDefined();
        expect(m.sprite.attack).toBeDefined();
        expect(m.sprite.death).toBeDefined();

        // Verify level is valid
        expect([1, 2, 3, 4]).toContain(m.level);
      });
    });
  });

  describe('MONSTER_DATA', () => {
    it('has entries for levels 1-4', () => {
      expect(MONSTER_DATA[1]).toBeDefined();
      expect(MONSTER_DATA[2]).toBeDefined();
      expect(MONSTER_DATA[3]).toBeDefined();
      expect(MONSTER_DATA[4]).toBeDefined();
    });

    it('each entry has name and sprite data', () => {
      [1, 2, 3, 4].forEach(level => {
        expect(MONSTER_DATA[level].name).toBeDefined();
        expect(MONSTER_DATA[level].sprite).toBeDefined();
        expect(MONSTER_DATA[level].sprite.idle).toBeDefined();
        expect(MONSTER_DATA[level].sprite.attack).toBeDefined();
        expect(MONSTER_DATA[level].sprite.death).toBeDefined();
      });
    });
  });
});
