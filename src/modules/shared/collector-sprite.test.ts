import { PlayerColor } from '@/lib/types';
import { toCollectorIdleSprite } from './collector-sprite';

describe('toCollectorIdleSprite', () => {
  it.each([
    [PlayerColor.Blue, '/sprites/collector_blue_idle.gif'],
    [PlayerColor.Red, '/sprites/collector_red_idle.gif'],
    [PlayerColor.Purple, '/sprites/collector_purple_idle.gif'],
    [PlayerColor.Yellow, '/sprites/collector_yellow_idle.gif'],
  ])('returns the %s collector idle sprite', (color, expectedSprite) => {
    expect(toCollectorIdleSprite(color)).toBe(expectedSprite);
  });

  it('falls back to the blue collector idle sprite for a color with no entry', () => {
    expect(toCollectorIdleSprite('not-a-real-color' as PlayerColor)).toBe('/sprites/collector_blue_idle.gif');
  });
});
