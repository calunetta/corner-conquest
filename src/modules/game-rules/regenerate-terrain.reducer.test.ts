import { GameAction, IslandType, PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { defaultGameSettings, handleGameAction, initializeGame, startGame } from '@/modules/game-rules';
import { handleRegenerateTerrain } from './regenerate-terrain.reducer';

function buildGame(debugMode: boolean): GameState {
  const game = initializeGame(
    'game_regen',
    'Regenerate Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    debugMode,
    defaultGameSettings,
  );
  return startGame(game, 'Player 1');
}

describe('handleRegenerateTerrain', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the same state outside debug matches', () => {
    const game = buildGame(false);
    expect(handleRegenerateTerrain(game)).toBe(game);
  });

  it('keeps every base tile and every occupied tile unchanged', () => {
    const game = buildGame(true);
    const before = game.map.filter((tile) => tile.type === IslandType.Base || tile.occupants.length > 0);

    const after = handleRegenerateTerrain(game).map;

    for (const tile of before) {
      expect(after.find((candidate) => candidate.id === tile.id)).toEqual(tile);
    }
  });

  it('keeps the map size and the tile positions', () => {
    const game = buildGame(true);
    const after = handleRegenerateTerrain(game).map;

    expect(after).toHaveLength(game.map.length);
    expect(after.map((tile) => [tile.id, tile.x, tile.y])).toEqual(game.map.map((tile) => [tile.id, tile.x, tile.y]));
  });

  it('clears resources and monsters on rerolled tiles, so a monster island never keeps resources', () => {
    const game = buildGame(true);
    // Make every rerollable tile a resource tile with stock; a reroll must not leave that stock behind.
    game.map = game.map.map((tile) =>
      tile.type === IslandType.Base || tile.occupants.length > 0
        ? tile
        : { ...tile, type: IslandType.Resource, resources: [{ type: 'food' as never, amount: 9 }] },
    );

    const after = handleRegenerateTerrain(game).map;

    for (const tile of after) {
      if (tile.type === IslandType.Monster) expect(tile.resources).not.toEqual([{ type: 'food', amount: 9 }]);
    }
    expect(after.some((tile) => tile.type === IslandType.Monster)).toBe(true);
  });

  it('is reachable through handleGameAction', () => {
    const game = buildGame(true);
    const result = handleGameAction({ action: GameAction.RegenerateTerrain, gameState: game });
    expect(result.state?.map).toHaveLength(game.map.length);
  });
});
