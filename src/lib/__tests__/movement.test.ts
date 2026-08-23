import { getPossibleMoves, revealIsland, handleMoveAction } from '../actions/movement';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { PlayerColor, IslandType } from '../types';

describe('Movement & Discovery Logic', () => {
  let game = initializeGame('game_test', 'Movement Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
  
  beforeEach(() => {
    game = initializeGame('game_test', 'Movement Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
    game = startGame(game, 'Player 1');
  });

  it('calculates valid adjacent moves for an army', () => {
    const army = game.players[0].armies[0];
    const moves = getPossibleMoves(game, army);
    expect(moves.length).toBeGreaterThan(0);
    moves.forEach(m => {
      const baseInfo = game.baseTiles.find(b => b.x === m.x && b.y === m.y);
      if (baseInfo) {
        expect(baseInfo.owner).toBe(game.players[0].id);
      }
    });
  });

  it('returns empty possible moves if army has already acted', () => {
    const army = game.players[0].armies[0];
    army.hasActed = true;
    const moves = getPossibleMoves(game, army);
    expect(moves).toEqual([]);
  });

  it('reveals new islands and awards discovery VP', () => {
    const player = game.players[0];
    const initialVP = player.victoryPoints;
    const targetTile = game.map.find(i => i.type === IslandType.Resource && !player.revealedTiles.includes(i.id))!;
    
    revealIsland(game, targetTile.x, targetTile.y);

    expect(player.revealedTiles).toContain(targetTile.id);
    expect(player.victoryPoints).toBe(initialVP + game.settings.vpPerIslandDiscovery);
  });

  it('moves army to new tile and marks army as acted', () => {
    const army = game.players[0].armies[0];
    const possibleMoves = getPossibleMoves(game, army);
    const targetMove = possibleMoves[0];
    
    const nextState = handleMoveAction(game, targetMove.x, targetMove.y, army);
    const updatedArmy = nextState.players[0].armies[0];

    expect(updatedArmy.position).toEqual({ x: targetMove.x, y: targetMove.y });
    expect(updatedArmy.hasActed).toBe(true);
    expect(nextState.map[targetMove.y * nextState.settings.gridSize.cols + targetMove.x].occupants).toContainEqual({
      playerId: nextState.players[0].id,
      armyId: updatedArmy.id
    });
  });
});
