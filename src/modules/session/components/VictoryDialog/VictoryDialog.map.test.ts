import { PlayerColor } from '@/lib/types';
import type { Player } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';
import { toArmyIconId } from '@/modules/shared';
import { toVictoryViewModel } from './VictoryDialog.map';
import { botWinner, humanWinner } from './VictoryDialog.fixtures';

const redHumanWinner: Player = { ...humanWinner, playerId: 'red-human', name: 'Rex', color: PlayerColor.Red };
const purpleBotWinner: Player = { ...botWinner, playerId: 'purple-bot', name: 'Bot Ada', color: PlayerColor.Purple };

describe('toVictoryViewModel', () => {
  describe('when the local player is the winner', () => {
    it('shows the "Victory!" title', () => {
      expect(toVictoryViewModel(humanWinner, true).title).toBe('Victory!');
    });

    it('starts the subtitle with "You reached" and includes the victory points', () => {
      const { subtitle } = toVictoryViewModel(humanWinner, true);

      expect(subtitle).toMatch(/^You reached /);
      expect(subtitle).toContain(`${humanWinner.victoryPoints} Victory Points`);
      expect(subtitle).toBe(
        `You reached ${humanWinner.victoryPoints} Victory Points and conquered the archipelago.`,
      );
    });

    it('does not use the winner name in the subtitle', () => {
      expect(toVictoryViewModel(humanWinner, true).subtitle).not.toContain(humanWinner.name);
    });
  });

  describe('when another player is the winner', () => {
    it('shows the "Game Over" title', () => {
      expect(toVictoryViewModel(botWinner, false).title).toBe('Game Over');
    });

    it('puts the winner name at the start of the subtitle', () => {
      expect(toVictoryViewModel(botWinner, false).subtitle).toBe(
        `${botWinner.name} reached ${botWinner.victoryPoints} Victory Points and conquered the archipelago.`,
      );
    });

    it('does not start the subtitle with "You reached"', () => {
      expect(toVictoryViewModel(redHumanWinner, false).subtitle).not.toMatch(/^You reached/);
    });
  });

  describe('commanderLine', () => {
    it.each([
      [humanWinner, PLAYER_DATA[PlayerColor.Blue].name],
      [redHumanWinner, PLAYER_DATA[PlayerColor.Red].name],
      [purpleBotWinner, PLAYER_DATA[PlayerColor.Purple].name],
    ])('is the winner color\'s faction name (PLAYER_DATA) for winner in color %#', (winner, expected) => {
      expect(toVictoryViewModel(winner, false).commanderLine).toBe(expected);
    });
  });

  describe('iconId', () => {
    it.each([
      ['blue', humanWinner],
      ['red', redHumanWinner],
      ['purple', purpleBotWinner],
    ])('equals toArmyIconId for the %s winner', (_color, winner) => {
      expect(toVictoryViewModel(winner, true).iconId).toBe(toArmyIconId(winner.color));
    });

    it('differs between two colors, so the sprite is not a constant fallback', () => {
      const blue = toVictoryViewModel(humanWinner, true).iconId;
      const red = toVictoryViewModel(redHumanWinner, true).iconId;

      expect(blue).not.toBe(red);
    });
  });

  describe('color', () => {
    it('passes the winner color through unchanged', () => {
      expect(toVictoryViewModel(redHumanWinner, false).color).toBe(PlayerColor.Red);
    });
  });

  describe('isBot', () => {
    it('is true when the winner is a bot', () => {
      expect(toVictoryViewModel(botWinner, false).isBot).toBe(true);
    });

    it('is false when the winner is a human', () => {
      expect(toVictoryViewModel(humanWinner, true).isBot).toBe(false);
    });
  });

  it('does not mutate the winner', () => {
    const before = JSON.parse(JSON.stringify(humanWinner)) as Player;

    toVictoryViewModel(humanWinner, true);

    expect(humanWinner).toEqual(before);
  });
});
