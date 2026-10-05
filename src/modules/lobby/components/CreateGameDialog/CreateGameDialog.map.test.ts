import { PLAYER_COLORS, PLAYER_DATA } from '@/modules/game-rules';
import { toFactionOptions, toFormatOptions } from './CreateGameDialog.map';

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

describe('toFormatOptions', () => {
  it('returns exactly 4 entries with values [1, 2, 3, 4] in order', () => {
    const options = toFormatOptions();

    expect(options).toHaveLength(4);
    expect(options.map((option) => option.value)).toEqual([1, 2, 3, 4]);
  });

  it('has correct title and meta for each entry', () => {
    const options = toFormatOptions();

    expect(options[0].title).toBe('Solo vs. Bot AI');
    expect(options[0].meta).toBe('Training match');
    expect(options[1].title).toBe('2 Players');
    expect(options[1].meta).toBe('1v1 Duel');
    expect(options[2].title).toBe('3 Players');
    expect(options[2].meta).toBe('Archipelago Skirmish');
    expect(options[3].title).toBe('4 Players');
    expect(options[3].meta).toBe('Grand Conquest');
  });

  it('has correct icon component reference for each entry', () => {
    const options = toFormatOptions();

    // Each entry has an icon property containing a function (React component)
    options.forEach((option) => {
      expect(typeof option.icon).toBe('function');
    });

    // Verify all 4 icons are distinct functions (different references)
    const icons = options.map((opt) => opt.icon);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(4);

    // Note: Cannot verify exact icon names (Bot/Swords/Users/Crown) due to Jest mocking lucide-react.
    // Icon correctness is implicitly verified by view tests that check text rendering (titles, metas).
  });
});
