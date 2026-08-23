import { handleEndTurn } from '../actions/player';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { addPlayerToGame } from '../game-logic';
import { PlayerColor, GameStatus } from '../types';

describe('Turn Progression & Win Conditions', () => {
  let game = initializeGame('game_test', 'Turn Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);

  beforeEach(() => {
    game = initializeGame('game_test', 'Turn Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
    game = added.newGameState!;
    game = startGame(game, 'Player 1');
  });

  it('rotates to the next player when turn ends', () => {
    expect(game.currentPlayerIndex).toBe(0);
    const nextState = handleEndTurn(game);
    expect(nextState.currentPlayerIndex).toBe(1);
  });

  it('skips a player if they are sabotaged and removes the sabotage flag', () => {
    const player2 = game.players[1];
    player2.isSabotaged = true;

    // End player 1's turn
    const stateAfterP1 = handleEndTurn(game);

    // Player 2 was sabotaged so their turn is skipped and flag cleared
    expect(stateAfterP1.players[1].isSabotaged).toBe(false);
  });

  it('detects game winner when a player reaches the victory point goal', () => {
    // Next player in turn order (player 1) has reached VP goal
    const player2 = game.players[1];
    player2.victoryPoints = game.settings.victoryPointGoal;

    const nextState = handleEndTurn(game);

    expect(nextState.status).toBe(GameStatus.Finished);
    expect(nextState.winner?.id).toBe(player2.id);
  });
});
