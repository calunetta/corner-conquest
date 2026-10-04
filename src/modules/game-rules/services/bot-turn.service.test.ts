import { PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '../game-setup.reducer';

jest.mock('@/lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => ({})),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));

import { db, doc, setDoc } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { takeBotTurn } from './bot-turn.service';

const mockSetDoc = setDoc as jest.Mock;

function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    1,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Player 1');
  return game;
}

describe('takeBotTurn', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('executes a bot turn and writes the resulting state to Firestore (ported integration case)', async () => {
    const game = buildBotTurnGame();
    game.currentPlayerIndex = 1;
    const bot = game.players[1];
    expect(bot.isBot).toBe(true);

    await expect(takeBotTurn(game)).resolves.not.toThrow();

    expect(doc).toHaveBeenCalledWith(db, 'games', 'game_test');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, writtenState] = mockSetDoc.mock.calls[0] as [unknown, GameState];
    // decideBotTurn ran to completion and ended the bot's turn, handing it back to the human.
    expect(writtenState.currentPlayerIndex).toBe(0);
  });

  it('is a no-op when the current player is not a bot (guard case)', async () => {
    const game = buildBotTurnGame();
    game.currentPlayerIndex = 0; // the human player's turn
    expect(game.players[0].isBot).toBe(false);

    await takeBotTurn(game);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('is a no-op when the game is not in the "playing" status (guard case, invalid input)', async () => {
    const game = initializeGame(
      'game_test',
      'Bot Test',
      1,
      { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
      1,
      false,
      defaultGameSettings,
    ); // status 'waiting': startGame was never called
    game.currentPlayerIndex = 1;

    await takeBotTurn(game);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
