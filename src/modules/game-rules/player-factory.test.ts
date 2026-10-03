import { createPlayer } from './player-factory';
import { BASE_CARDS } from './card-data';
import { defaultGameSettings } from './game-setup.reducer';
import { PlayerColor, ResourceType } from '@/lib/types';

describe('Player Factory', () => {
  describe('createPlayer', () => {
    it('gives debug-mode human players 20/20/20 resources and full deduped BASE_CARDS', () => {
      const basePos = { x: 0, y: 0 };
      const player = createPlayer(
        0,
        'user_1',
        'Alice',
        PlayerColor.Blue,
        false, // not a bot
        basePos,
        defaultGameSettings,
        true, // debug mode
      );

      expect(player.resources[ResourceType.Food]).toBe(20);
      expect(player.resources[ResourceType.Wood]).toBe(20);
      expect(player.resources[ResourceType.Gold]).toBe(20);

      const expectedCards = [...new Set(BASE_CARDS)];
      expect(player.specialCards).toEqual(expectedCards);
    });

    it('gives non-debug human players 0/0/0 resources and no cards', () => {
      const basePos = { x: 0, y: 0 };
      const player = createPlayer(
        0,
        'user_1',
        'Alice',
        PlayerColor.Blue,
        false, // not a bot
        basePos,
        defaultGameSettings,
        false, // no debug mode
      );

      expect(player.resources[ResourceType.Food]).toBe(0);
      expect(player.resources[ResourceType.Wood]).toBe(0);
      expect(player.resources[ResourceType.Gold]).toBe(0);
      expect(player.specialCards).toEqual([]);
    });

    it('gives bot players 0/0/0 resources and no cards regardless of debug mode', () => {
      const basePos = { x: 0, y: 0 };

      // Bot in debug mode
      const botDebug = createPlayer(
        1,
        'bot_1',
        'Bot 1',
        PlayerColor.Red,
        true, // is a bot
        basePos,
        defaultGameSettings,
        true, // debug mode
      );

      expect(botDebug.resources[ResourceType.Food]).toBe(0);
      expect(botDebug.resources[ResourceType.Wood]).toBe(0);
      expect(botDebug.resources[ResourceType.Gold]).toBe(0);
      expect(botDebug.specialCards).toEqual([]);

      // Bot without debug mode
      const botNoDebug = createPlayer(
        1,
        'bot_1',
        'Bot 1',
        PlayerColor.Red,
        true, // is a bot
        basePos,
        defaultGameSettings,
        false, // no debug mode
      );

      expect(botNoDebug.resources[ResourceType.Food]).toBe(0);
      expect(botNoDebug.resources[ResourceType.Wood]).toBe(0);
      expect(botNoDebug.resources[ResourceType.Gold]).toBe(0);
      expect(botNoDebug.specialCards).toEqual([]);
    });

    it('seeds revealedTiles with base tile id when fogOfWar is true', () => {
      const basePos = { x: 5, y: 3 };
      const settings = { ...defaultGameSettings, fogOfWar: true };

      const player = createPlayer(
        0,
        'user_1',
        'Alice',
        PlayerColor.Blue,
        false,
        basePos,
        settings,
        false,
      );

      const expectedTileId = `${basePos.x}-${basePos.y}`;
      expect(player.revealedTiles).toContain(expectedTileId);
      expect(player.revealedTiles.length).toBe(1);
    });

    it('leaves revealedTiles empty when fogOfWar is false', () => {
      const basePos = { x: 5, y: 3 };
      const settings = { ...defaultGameSettings, fogOfWar: false };

      const player = createPlayer(
        0,
        'user_1',
        'Alice',
        PlayerColor.Blue,
        false,
        basePos,
        settings,
        false,
      );

      expect(player.revealedTiles).toEqual([]);
    });

    it('creates player with correct initial army at base position', () => {
      const basePos = { x: 2, y: 4 };
      const player = createPlayer(
        0,
        'user_1',
        'Alice',
        PlayerColor.Blue,
        false,
        basePos,
        defaultGameSettings,
        false,
      );

      expect(player.armies.length).toBe(1);
      expect(player.armies[0].position).toEqual(basePos);
      expect(player.armies[0].hasActed).toBe(false);
      expect(player.armyCount).toBe(1);
    });

    it('creates player with correct metadata and initial state', () => {
      const player = createPlayer(
        2,
        'user_123',
        'Bob',
        PlayerColor.Purple,
        false,
        { x: 1, y: 1 },
        defaultGameSettings,
        false,
      );

      expect(player.id).toBe(2);
      expect(player.playerId).toBe('user_123');
      expect(player.name).toBe('Bob');
      expect(player.color).toBe(PlayerColor.Purple);
      expect(player.isBot).toBe(false);
      expect(player.victoryPoints).toBe(0);
      expect(player.hasExtraMove).toBe(false);
      expect(player.isSabotaged).toBe(false);
      expect(player.efficientActive).toBe(false);
      expect(player.masterBuilderActive).toBe(false);
      expect(player.reinforceActive).toBe(false);
    });
  });
});
