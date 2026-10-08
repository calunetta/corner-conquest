import { PlayerColor } from '@/lib/types';
import { playerTextColors } from './player-text-colors';

describe('playerTextColors', () => {
  it.each([
    [PlayerColor.Blue, 'text-blue-400'],
    [PlayerColor.Red, 'text-red-400'],
    [PlayerColor.Purple, 'text-purple-400'],
    [PlayerColor.Yellow, 'text-yellow-400'],
  ])('maps %s to %s', (color, expectedClass) => {
    expect(playerTextColors[color]).toBe(expectedClass);
  });

  it('has exactly the 4 PlayerColor keys, no 5th or missing key', () => {
    expect(Object.keys(playerTextColors).sort()).toEqual(['blue', 'purple', 'red', 'yellow']);
  });
});
