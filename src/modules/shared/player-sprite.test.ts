import { PlayerColor } from '@/lib/types';
import { toPlayerIdleSprite } from './player-sprite';

describe('toPlayerIdleSprite', () => {
  it.each([
    [PlayerColor.Blue, '/sprites/blue.gif'],
    [PlayerColor.Red, '/sprites/red.gif'],
    [PlayerColor.Purple, '/sprites/purple.gif'],
    [PlayerColor.Yellow, '/sprites/yellow.gif'],
  ])('returns the %s player idle sprite from PLAYER_DATA', (color, expectedSprite) => {
    expect(toPlayerIdleSprite(color)).toBe(expectedSprite);
  });

  it('falls back to the blue idle sprite for a color with no PLAYER_DATA entry', () => {
    expect(toPlayerIdleSprite('not-a-real-color' as PlayerColor)).toBe('/sprites/blue_idle.gif');
  });
});
