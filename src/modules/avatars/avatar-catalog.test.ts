import { AVATAR_CATALOG, AVATAR_IDS, AVATAR_OPTIONS, isValidAvatarId, toAvatarSrc } from './index';

const FALLBACK = '/sprites/color-fallback.png';

describe('avatar catalog', () => {
  it('has exactly 25 entries with ids human-01 to human-25 in order', () => {
    const expectedIds = Array.from({ length: 25 }, (_, i) => `human-${String(i + 1).padStart(2, '0')}`);

    expect(AVATAR_OPTIONS).toHaveLength(25);
    expect([...AVATAR_IDS]).toEqual(expectedIds);
    expect(AVATAR_OPTIONS.map((entry) => entry.id)).toEqual(expectedIds);
  });

  it('numbers positions 1 to 25 in order', () => {
    expect(AVATAR_OPTIONS.map((entry) => entry.position)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it.each([
    ['human-01', '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png'],
    ['human-09', '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_09.png'],
    ['human-10', '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_10.png'],
    ['human-25', '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_25.png'],
  ])('maps %s to the asset path %s', (id, src) => {
    expect(AVATAR_CATALOG[id as keyof typeof AVATAR_CATALOG].src).toBe(src);
  });

  it('gives every entry a unique src', () => {
    expect(new Set(AVATAR_OPTIONS.map((entry) => entry.src)).size).toBe(25);
  });

  it('indexes AVATAR_CATALOG by the same entries as AVATAR_OPTIONS', () => {
    expect(Object.keys(AVATAR_CATALOG)).toHaveLength(25);
    AVATAR_OPTIONS.forEach((entry) => expect(AVATAR_CATALOG[entry.id]).toBe(entry));
  });
});

describe('isValidAvatarId', () => {
  it.each(['human-01', 'human-13', 'human-25'])('accepts %s', (id) => {
    expect(isValidAvatarId(id)).toBe(true);
  });

  it.each([
    ['human-26', 'human-26'],
    ['human-00', 'human-00'],
    ['human-1', 'human-1'],
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['wrong case', 'HUMAN-01'],
    ['padded', ' human-01'],
    ['prototype key', 'toString'],
    ['__proto__', '__proto__'],
  ])('rejects %s', (_label, id) => {
    expect(isValidAvatarId(id)).toBe(false);
  });
});

describe('toAvatarSrc', () => {
  it('returns the catalog src for a known id', () => {
    expect(toAvatarSrc('human-02', FALLBACK)).toBe(
      '/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_02.png',
    );
  });

  it.each([
    ['an unknown id', 'human-26'],
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a prototype key', 'constructor'],
  ])('returns the fallback for %s', (_label, id) => {
    expect(toAvatarSrc(id, FALLBACK)).toBe(FALLBACK);
  });
});
