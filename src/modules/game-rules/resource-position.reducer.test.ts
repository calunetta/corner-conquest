import { PlayerColor, ResourceType, IslandType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/lib/game-logic';
import { handleSelectResourceForPosition } from './resource-position.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Resource Position Test',
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

describe('handleSelectResourceForPosition', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('positions an army on a resource node to gain yield each turn', () => {
    const player = game.players[0];
    const army = player.armies[0];

    const nextState = handleSelectResourceForPosition(game, ResourceType.Gold, army.id);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.positions).toContainEqual(
      expect.objectContaining({ armyId: army.id, resource: ResourceType.Gold }),
    );
    expect(updatedPlayer.armies[0].hasActed).toBe(true);
    const tile = nextState.map[army.position.y * nextState.settings.gridSize.cols + army.position.x];
    expect(tile.positionedBy).toContainEqual({ playerId: player.id, resource: ResourceType.Gold });
  });

  it('consumes the extra move and still marks the army as acted', () => {
    const player = game.players[0];
    const army = player.armies[0];
    player.hasExtraMove = true;

    const nextState = handleSelectResourceForPosition(game, ResourceType.Gold, army.id);

    expect(nextState.players[0].hasExtraMove).toBe(false);
    expect(nextState.players[0].armies[0].hasActed).toBe(true);
    expect(nextState.log.some((entry) => entry.includes('Extra Move'))).toBe(true);
  });

  it('throws when the army is not found on the player (invalid input)', () => {
    expect(() => handleSelectResourceForPosition(game, ResourceType.Gold, 9999)).toThrow(
      'Army not found for positioning.',
    );
  });

  it('throws when the army already acted and there is no extra move (boundary)', () => {
    const player = game.players[0];
    const army = player.armies[0];
    army.hasActed = true;

    expect(() => handleSelectResourceForPosition(game, ResourceType.Gold, army.id)).toThrow(
      'This army has already acted this turn.',
    );
  });

  it('throws when the tile is not found (invalid input: position off the map)', () => {
    const player = game.players[0];
    const army = player.armies[0];
    army.position = { x: -1, y: -1 };

    expect(() => handleSelectResourceForPosition(game, ResourceType.Gold, army.id)).toThrow('Target tile not found.');
  });

  it('throws when the resource is not available on the tile (invalid input)', () => {
    const player = game.players[0];
    const army = player.armies[0];
    const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    tile.resources = tile.resources.filter((r) => r.type !== ResourceType.Gold);

    expect(() => handleSelectResourceForPosition(game, ResourceType.Gold, army.id)).toThrow(
      `Resource ${ResourceType.Gold} is not available on this island.`,
    );
  });

  it('throws when the spot is already occupied by another player (boundary)', () => {
    const player = game.players[0];
    const army = player.armies[0];
    const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    tile.positionedBy = [{ playerId: 99, resource: ResourceType.Gold }];

    expect(() => handleSelectResourceForPosition(game, ResourceType.Gold, army.id)).toThrow(
      `The ${ResourceType.Gold} spot on this island is already occupied.`,
    );
  });

  it('allows positioning on a tile with no prior positionedBy array (boundary: undefined, not just empty)', () => {
    const player = game.players[0];
    const army = player.armies[0];
    const tile = game.map[army.position.y * game.settings.gridSize.cols + army.position.x];
    tile.type = IslandType.Base;
    delete tile.positionedBy;

    const nextState = handleSelectResourceForPosition(game, ResourceType.Gold, army.id);

    expect(nextState.players[0].positions).toHaveLength(1);
  });
});
