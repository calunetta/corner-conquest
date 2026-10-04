import fs from 'fs';
import path from 'path';
import { LOBBY_ISLANDS, LOBBY_BOATS, toLobbyBackground } from './LobbyBackground.map';

describe('LobbyBackground.map', () => {
  describe('toLobbyBackground', () => {
    it('returns 7 islands and 2 boats', () => {
      const { islands, boats } = toLobbyBackground();

      expect(islands).toHaveLength(7);
      expect(boats).toHaveLength(2);
    });

    it('returns the LOBBY_ISLANDS and LOBBY_BOATS constants verbatim', () => {
      const { islands, boats } = toLobbyBackground();

      expect(islands).toBe(LOBBY_ISLANDS);
      expect(boats).toBe(LOBBY_BOATS);
    });
  });

  describe('sprite paths', () => {
    const allSprites = [
      ...LOBBY_ISLANDS.flatMap((island) => [island.mainSprite, ...island.decorations]),
      ...LOBBY_BOATS.map((boat) => boat.sprite),
    ];

    it.each(allSprites.map((sprite) => [sprite.alt, sprite.src]))(
      'sprite "%s" points at a file that exists under public/sprites (%s)',
      (_alt, src) => {
        const absolutePath = path.join(process.cwd(), 'public', src);
        expect(fs.existsSync(absolutePath)).toBe(true);
      },
    );
  });

  it('every island has a unique id', () => {
    const ids = LOBBY_ISLANDS.map((island) => island.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every boat has a unique id', () => {
    const ids = LOBBY_BOATS.map((boat) => boat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
