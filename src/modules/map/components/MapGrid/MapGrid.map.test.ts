import { toGridDimensions } from './MapGrid.map';
import { MAP_COLS, MAP_ROWS, IslandType, type Island } from '@/lib/types';

describe('MapGrid.map', () => {
  describe('toGridDimensions', () => {
    it('returns MAP_COLS/MAP_ROWS fallback when map is empty', () => {
      const result = toGridDimensions([]);

      expect(result).toEqual({ cols: MAP_COLS, rows: MAP_ROWS });
    });

    it('returns MAP_COLS/MAP_ROWS fallback when map is null', () => {
      const result = toGridDimensions(null as unknown as Island[]);

      expect(result).toEqual({ cols: MAP_COLS, rows: MAP_ROWS });
    });

    it('returns correct dimensions for a single island at (0,0)', () => {
      const island: Island = {
        id: '0-0',
        x: 0,
        y: 0,
        type: IslandType.Empty,
        resources: [],
        occupants: [],
      };

      const result = toGridDimensions([island]);

      // With an island at (0,0), max x=0 and max y=0, so cols=1, rows=1
      expect(result).toEqual({ cols: 1, rows: 1 });
    });

    it('returns correct dimensions for islands at max x and y', () => {
      const islands: Island[] = [
        {
          id: '0-0',
          x: 0,
          y: 0,
          type: IslandType.Empty,
          resources: [],
          occupants: [],
        },
        {
          id: '3-4',
          x: 3,
          y: 4,
          type: IslandType.Base,
          owner: 0,
          resources: [],
          occupants: [],
        },
      ];

      const result = toGridDimensions(islands);

      // Max x=3, max y=4, so cols=4, rows=5
      expect(result).toEqual({ cols: 4, rows: 5 });
    });

    it('returns correct dimensions ignoring x=0 islands', () => {
      const islands: Island[] = [
        {
          id: '1-0',
          x: 1,
          y: 0,
          type: IslandType.Empty,
          resources: [],
          occupants: [],
        },
        {
          id: '2-1',
          x: 2,
          y: 1,
          type: IslandType.Resource,
          resources: [],
          occupants: [],
        },
      ];

      const result = toGridDimensions(islands);

      // Max x=2, max y=1, so cols=3, rows=2
      expect(result).toEqual({ cols: 3, rows: 2 });
    });

    it('returns correct dimensions for a full 5x6 map', () => {
      const islands: Island[] = [];
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 5; x++) {
          islands.push({
            id: `${x}-${y}`,
            x,
            y,
            type: IslandType.Empty,
            resources: [],
            occupants: [],
          });
        }
      }

      const result = toGridDimensions(islands);

      // Max x=4, max y=5, so cols=5, rows=6
      expect(result).toEqual({ cols: 5, rows: 6 });
    });

    it('does not mutate the input array', () => {
      const islands: Island[] = [
        {
          id: '1-1',
          x: 1,
          y: 1,
          type: IslandType.Empty,
          resources: [],
          occupants: [],
        },
      ];
      const originalLength = islands.length;

      toGridDimensions(islands);

      expect(islands).toHaveLength(originalLength);
    });
  });
});
