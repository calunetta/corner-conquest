import { PlayerColor, ResourceType, IslandType, CardName, GameStatus } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';
import { handleEndTurn } from './player-turn.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Player Turn Test',
    2,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
  game = added.newGameState!;
  game = startGame(game, 'Player 1');
  return game;
}

describe('handleEndTurn', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('rotates to the next player', () => {
    expect(game.currentPlayerIndex).toBe(0);
    const nextState = handleEndTurn(game);
    expect(nextState.currentPlayerIndex).toBe(1);
  });

  it('resets the next player\'s per-turn flags and army acted state', () => {
    const player2 = game.players[1];
    player2.armies[0].hasActed = true;
    player2.hasExtraMove = true;
    player2.efficientActive = true;
    player2.masterBuilderActive = true;
    player2.reinforceActive = true;

    const nextState = handleEndTurn(game);
    const updated = nextState.players[1];

    expect(updated.armies[0].hasActed).toBe(false);
    expect(updated.hasExtraMove).toBe(false);
    expect(updated.efficientActive).toBe(false);
    expect(updated.masterBuilderActive).toBe(false);
    expect(updated.reinforceActive).toBe(false);
    expect(updated.actionsThisTurn).toEqual([]);
  });

  it('skips a sabotaged player and clears the sabotage flag', () => {
    const player2 = game.players[1];
    player2.isSabotaged = true;

    const stateAfterP1 = handleEndTurn(game);

    expect(stateAfterP1.players[1].isSabotaged).toBe(false);
    expect(stateAfterP1.currentPlayerIndex).toBe(0); // wraps back to player 1 since player 2 was skipped
  });

  it('generates resources from positioned armies for the incoming player', () => {
    const player2 = game.players[1];
    player2.armies[0].hasActed = true;
    player2.positions.push({
      armyId: player2.armies[0].id,
      resource: ResourceType.Gold,
      x: player2.armies[0].position.x,
      y: player2.armies[0].position.y,
    });
    const initialGold = player2.resources.gold;
    const baseTile = game.map[player2.armies[0].position.y * game.settings.gridSize.cols + player2.armies[0].position.x];
    const goldYield = baseTile.resources.find((r) => r.type === ResourceType.Gold)!.amount;
    expect(goldYield).toBe(game.settings.baseResourceAmount); // base tiles yield baseResourceAmount (1) of each resource

    const nextState = handleEndTurn(game);

    expect(nextState.players[1].resources.gold).toBe(initialGold + goldYield);
    expect(nextState.players[1].positions).toHaveLength(0);
    expect(nextState.log).toContain(`${player2.name} automatically collected ${goldYield} gold.`);
  });

  it('opens the Productive dialog instead of auto-collecting when the incoming player holds a Productive card', () => {
    const player2 = game.players[1];
    player2.specialCards = [CardName.Productive];
    player2.positions.push({
      armyId: player2.armies[0].id,
      resource: ResourceType.Gold,
      x: player2.armies[0].position.x,
      y: player2.armies[0].position.y,
    });
    const goldBefore = player2.resources.gold;

    const nextState = handleEndTurn(game);

    expect(nextState.productiveDialogState).toEqual({ playerId: player2.id });
    expect(nextState.players[1].resources.gold).toBe(goldBefore); // not auto-collected
    expect(nextState.players[1].positions).toHaveLength(1); // left untouched for the dialog to resolve
  });

  it('detects a game winner when the incoming player has reached the victory point goal', () => {
    const player2 = game.players[1];
    player2.victoryPoints = game.settings.victoryPointGoal;

    const nextState = handleEndTurn(game);

    expect(nextState.status).toBe(GameStatus.Finished);
    expect(nextState.winner?.id).toBe(player2.id);
    expect(nextState.log.some((entry) => entry.includes('won the game'))).toBe(true);
  });

  it('does not overwrite an existing winner (boundary: winner already set)', () => {
    const player1 = game.players[0];
    const player2 = game.players[1];
    game.winner = player1;
    player2.victoryPoints = game.settings.victoryPointGoal;

    const nextState = handleEndTurn(game);

    expect(nextState.winner).toBe(player1);
  });

  it("grants the Explorer passive ability's VP for each non-base island the incoming player's armies occupy", () => {
    const player2 = game.players[1];
    player2.passiveAbilities.explorer = true;
    const army = player2.armies[0];
    const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    tile.type = IslandType.Resource;
    const vpBefore = player2.victoryPoints;

    const nextState = handleEndTurn(game);

    expect(nextState.players[1].victoryPoints).toBe(vpBefore + 1);
  });

  it("does not grant Explorer VP for an army standing on its own base tile (boundary)", () => {
    const player2 = game.players[1];
    player2.passiveAbilities.explorer = true;
    const vpBefore = player2.victoryPoints;
    // player2's army starts on their own base tile (IslandType.Base) by default.

    const nextState = handleEndTurn(game);

    expect(nextState.players[1].victoryPoints).toBe(vpBefore);
  });

  it("grants the Collector passive ability's resources for each occupied resource island", () => {
    const player2 = game.players[1];
    player2.passiveAbilities.collector = true;
    const army = player2.armies[0];
    const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    tile.type = IslandType.Resource;
    tile.resources = [{ type: ResourceType.Wood, amount: 3 }];
    const woodBefore = player2.resources.wood;

    const nextState = handleEndTurn(game);

    expect(nextState.players[1].resources.wood).toBe(woodBefore + 1); // Collector grants a flat +1, not `amount`
  });

  it('filters out death animations older than the 2-second display window', () => {
    const now = Date.now();
    game.deathAnimations = [
      { id: 'old', x: 0, y: 0, sprite: 'death.gif', createdAt: now - 5000 },
      { id: 'fresh', x: 0, y: 0, sprite: 'death.gif', createdAt: now },
    ];

    const nextState = handleEndTurn(game);

    expect(nextState.deathAnimations.map((a) => a.id)).toEqual(['fresh']);
  });

  it('is a no-op when there are no players at all (empty input boundary)', () => {
    game.players = [];
    const nextState = handleEndTurn(game);
    expect(nextState).toBe(game);
  });

  it('increments the turn counter when play wraps back to player 0', () => {
    game.currentPlayerIndex = 1;
    const turnBefore = game.turn;

    const nextState = handleEndTurn(game);

    expect(nextState.currentPlayerIndex).toBe(0);
    expect(nextState.turn).toBe(turnBefore + 1);
  });

  it('clamps an out-of-range currentPlayerIndex back to 0 before rotating (invalid input boundary)', () => {
    game.currentPlayerIndex = 99;
    const nextState = handleEndTurn(game);
    expect(nextState.currentPlayerIndex).toBe(1);
  });
});
