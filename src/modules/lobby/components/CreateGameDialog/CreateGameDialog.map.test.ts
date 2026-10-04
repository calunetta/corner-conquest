import { PLAYER_COLORS, PLAYER_DATA } from '@/modules/game-rules';
import { toFactionOptions } from './CreateGameDialog.map';

describe('toFactionOptions', () => {
  it('returns one entry per PLAYER_COLORS member, in order', () => {
    const options = toFactionOptions();

    expect(options).toHaveLength(PLAYER_COLORS.length);
    expect(options.map((option) => option.color)).toEqual(PLAYER_COLORS);
  });

  it('maps each option to PLAYER_DATA[color].name and .sprite.idle', () => {
    const options = toFactionOptions();

    options.forEach((option) => {
      expect(option.name).toBe(PLAYER_DATA[option.color].name);
      expect(option.spriteSrc).toBe(PLAYER_DATA[option.color].sprite.idle);
    });
  });
});
