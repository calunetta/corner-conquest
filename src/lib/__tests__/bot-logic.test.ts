import { takeBotTurn } from '../bot-logic';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { PlayerColor, GameStatus } from '../types';

jest.mock('../firebase', () => ({
  db: {},
  doc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));

describe('Bot AI Logic', () => {
  it('executes a bot turn and transitions state', async () => {
    let game = initializeGame('game_test', 'Bot Test', 1, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 1, false, defaultGameSettings);
    game = startGame(game, 'Player 1');
    
    // Set current player to bot
    game.currentPlayerIndex = 1;
    const bot = game.players[1];
    expect(bot.isBot).toBe(true);

    await expect(takeBotTurn(game)).resolves.not.toThrow();
  });
});
