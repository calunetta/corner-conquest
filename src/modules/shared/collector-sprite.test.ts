import { PlayerColor } from '@/lib/types';
import { toCollectorIconId } from './collector-sprite';

describe('toCollectorIconId', () => {
  it.each([
    [PlayerColor.Blue, 'collector-blue'],
    [PlayerColor.Red, 'collector-red'],
    [PlayerColor.Purple, 'collector-purple'],
    [PlayerColor.Yellow, 'collector-yellow'],
  ])('returns the %s collector icon id', (color, expectedId) => {
    expect(toCollectorIconId(color)).toBe(expectedId);
  });

  it('falls back to the blue collector icon id for a color with no entry', () => {
    expect(toCollectorIconId('not-a-real-color' as PlayerColor)).toBe('collector-blue');
  });
});
