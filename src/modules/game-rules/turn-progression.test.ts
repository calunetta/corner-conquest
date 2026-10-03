import { GameAction, PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import {
  initializeGame,
  startGame,
  defaultGameSettings,
  addPlayerToGame,
  hasPlayerRemainingActions,
} from './index';

describe('Turn Progression: hasPlayerRemainingActions', () => {
  let game: GameState;

  beforeEach(() => {
    game = initializeGame(
      'game_test',
      'Turn Test',
      2,
      { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings
    );
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
    game = added.newGameState!;
    game = startGame(game, 'Player 1');
  });

  it('correctly evaluates hasPlayerRemainingActions when actions are available and when exhausted', () => {
    const player = game.players[0];

    // Initial state: army 0 hasActed: false, can move -> should have actions
    expect(hasPlayerRemainingActions(game, player)).toBe(true);

    // Mark army as acted, zero out resources, no cards, no affordable actions
    player.armies[0].hasActed = true;
    player.resources = { food: 0, wood: 0, gold: 0 };
    player.specialCards = [];
    player.actionsThisTurn = [GameAction.Deploy, GameAction.Upgrade, GameAction.BuyCard];

    // Now player has no valid moves, attacks, or affordable actions
    expect(hasPlayerRemainingActions(game, player)).toBe(false);

    // If Extra Move is given, player should have actions again
    player.hasExtraMove = true;
    expect(hasPlayerRemainingActions(game, player)).toBe(true);
  });
});
