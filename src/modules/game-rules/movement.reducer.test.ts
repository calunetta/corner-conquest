import { PlayerColor, IslandType, CardName, GameAction, ResourceType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/lib/game-logic';
import { getPossibleMoves, handleMoveAction } from './movement.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Movement Test',
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

describe('getPossibleMoves', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('calculates valid adjacent moves for an army, never returning an opponent-owned base tile', () => {
    const army = game.players[0].armies[0];
    const moves = getPossibleMoves(game, army);
    expect(moves.length).toBeGreaterThan(0);
    moves.forEach((m) => {
      const baseInfo = game.baseTiles.find((b) => b.x === m.x && b.y === m.y);
      if (baseInfo) {
        expect(baseInfo.owner).toBe(game.players[0].id);
      }
    });
  });

  it('returns an empty list if the army has already acted and there is no extra move (boundary)', () => {
    const army = game.players[0].armies[0];
    army.hasActed = true;
    expect(getPossibleMoves(game, army)).toEqual([]);
  });

  it('still returns moves for an already-acted army when the player has an extra move', () => {
    const army = game.players[0].armies[0];
    army.hasActed = true;
    game.players[0].hasExtraMove = true;
    expect(getPossibleMoves(game, army).length).toBeGreaterThan(0);
  });
});

describe('handleMoveAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('moves the army to a new tile and marks it as acted', () => {
    const army = game.players[0].armies[0];
    const possibleMoves = getPossibleMoves(game, army);
    const targetMove = possibleMoves[0];

    const nextState = handleMoveAction(game, targetMove.x, targetMove.y, army);
    const updatedArmy = nextState.players[0].armies[0];

    expect(updatedArmy.position).toEqual({ x: targetMove.x, y: targetMove.y });
    expect(updatedArmy.hasActed).toBe(true);
    expect(nextState.map[targetMove.y * nextState.settings.gridSize.cols + targetMove.x].occupants).toContainEqual({
      playerId: nextState.players[0].id,
      armyId: updatedArmy.id,
    });
  });

  it('throws when the army is not found on the player (invalid input)', () => {
    const fakeArmy = { id: 9999, position: { x: 0, y: 0 }, hasActed: false };
    expect(() => handleMoveAction(game, 1, 0, fakeArmy)).toThrow('Army not found for move action.');
  });

  it('throws when the army already acted and there is no extra move', () => {
    const army = game.players[0].armies[0];
    army.hasActed = true;
    expect(() => handleMoveAction(game, 1, 0, army)).toThrow(`Invalid move: Army ${army.id} has already acted.`);
  });

  it('throws when the target tile is not among the possible moves', () => {
    const army = game.players[0].armies[0];
    expect(() => handleMoveAction(game, 4, 5, army)).toThrow(`Invalid move for army ${army.id} to (4, 5).`);
  });

  describe('Teleport', () => {
    it('moves the army to a non-adjacent tile and consumes the Teleport card', () => {
      const player = game.players[0];
      player.specialCards = [CardName.Teleport];
      const army = player.armies[0];
      expect(army.position).toEqual({ x: 0, y: 0 });

      const nextState = handleMoveAction(game, 4, 4, army, true);
      const updatedPlayer = nextState.players[0];

      expect(updatedPlayer.armies[0].position).toEqual({ x: 4, y: 4 });
      expect(updatedPlayer.specialCards).not.toContain(CardName.Teleport);
      expect(nextState.discardPile).toContain(CardName.Teleport);
      expect(updatedPlayer.actionsThisTurn).toContain(GameAction.UseCard);
    });

    it('succeeds teleporting onto the player’s own base tile', () => {
      const player = game.players[0];
      player.specialCards = [CardName.Teleport];
      const army = player.armies[0];
      army.position = { x: 2, y: 2 }; // move off base first so teleporting "back" is meaningful

      const ownBase = game.baseTiles.find((b) => b.owner === player.id)!;
      const nextState = handleMoveAction(game, ownBase.x, ownBase.y, army, true);

      expect(nextState.players[0].armies[0].position).toEqual({ x: ownBase.x, y: ownBase.y });
      expect(nextState.players[0].armies[0].hasActed).toBe(true);
    });

    it("throws when teleporting onto an opponent's base island", () => {
      const player = game.players[0];
      player.specialCards = [CardName.Teleport];
      const army = player.armies[0];
      const opponentBase = game.baseTiles.find((b) => b.owner !== player.id)!;

      expect(() => handleMoveAction(game, opponentBase.x, opponentBase.y, army, true)).toThrow(
        "Cannot teleport onto an opponent's base island.",
      );
    });

    it('throws attempting teleport without holding the Teleport card', () => {
      const player = game.players[0];
      player.specialCards = [];
      const army = player.armies[0];

      expect(() => handleMoveAction(game, 4, 4, army, true)).toThrow(
        'Teleport card not found, but was attempted to be used.',
      );
    });
  });

  it('clears the previous tile’s positionedBy entry when a positioned army moves away', () => {
    const player = game.players[0];
    const army = player.armies[0];
    const possibleMoves = getPossibleMoves(game, army);
    const targetMove = possibleMoves[0];
    const oldTile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    oldTile.positionedBy = [{ playerId: player.id, resource: ResourceType.Food }];
    player.positions = [{ x: army.position.x, y: army.position.y, resource: ResourceType.Food, armyId: army.id }];

    handleMoveAction(game, targetMove.x, targetMove.y, army);

    expect(player.positions).toHaveLength(0);
    expect(oldTile.positionedBy).toEqual([]);
  });

  it('consumes the extra move instead of marking hasActed when the player has one', () => {
    const player = game.players[0];
    const army = player.armies[0];
    player.hasExtraMove = true;
    const possibleMoves = getPossibleMoves(game, army);
    const targetMove = possibleMoves[0];

    const nextState = handleMoveAction(game, targetMove.x, targetMove.y, army);

    expect(nextState.players[0].hasExtraMove).toBe(false);
    expect(nextState.players[0].armies[0].hasActed).toBe(false);
  });

  it('reveals the destination island on first arrival', () => {
    const army = game.players[0].armies[0];
    const possibleMoves = getPossibleMoves(game, army);
    const targetMove = possibleMoves[0];
    const targetTile = game.map[targetMove.y * game.settings.gridSize.cols + targetMove.x];

    const nextState = handleMoveAction(game, targetMove.x, targetMove.y, army);

    if (targetTile.type !== IslandType.Empty) {
      expect(nextState.players[0].revealedTiles).toContain(targetTile.id);
    }
  });
});
