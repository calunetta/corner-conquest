import { PlayerColor } from '@/lib/types';
import { toArmyIconId } from './army-icon';

describe('toArmyIconId', () => {
  it.each([
    [PlayerColor.Blue, 'army-blue'],
    [PlayerColor.Red, 'army-red'],
    [PlayerColor.Purple, 'army-purple'],
    [PlayerColor.Yellow, 'army-yellow'],
  ])('returns the %s army icon id', (color, expectedId) => {
    expect(toArmyIconId(color)).toBe(expectedId);
  });

  it('falls back to the blue army icon id for a color with no entry', () => {
    expect(toArmyIconId('not-a-real-color' as PlayerColor)).toBe('army-blue');
  });
});
