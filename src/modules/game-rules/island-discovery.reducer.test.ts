import { PlayerColor, IslandType, CardName, HAND_LIMIT, GameStatus } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { revealIsland } from './island-discovery.reducer';

function buildGame(): GameState {
  return startGame(
    initializeGame(
      'game_test',
      'Discovery Test',
      1,
      { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    ),
    'Player 1',
  );
}

/** A tile away from the player's base, forced to a known type for deterministic assertions. */
function forcedTile(game: GameState, type: (typeof IslandType)[keyof typeof IslandType]) {
  const tile = game.map.find((t) => !(t.x === 0 && t.y === 0))!;
  tile.type = type;
  return tile;
}

describe('revealIsland', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('reveals new islands and awards discovery VP', () => {
    const player = game.players[0];
    const initialVp = player.victoryPoints;
    const targetTile = game.map.find((i) => i.type === IslandType.Resource && !player.revealedTiles.includes(i.id))!;

    revealIsland(game, targetTile.x, targetTile.y);

    expect(player.revealedTiles).toContain(targetTile.id);
    expect(player.victoryPoints).toBe(initialVp + game.settings.vpPerIslandDiscovery);
  });

  it('returns the state unchanged when the tile was already revealed (boundary)', () => {
    const player = game.players[0];
    const baseTileId = `0-0`; // pushed to revealedTiles at player creation (fogOfWar is on by default)
    expect(player.revealedTiles).toContain(baseTileId);
    const vpBefore = player.victoryPoints;

    const result = revealIsland(game, 0, 0);

    expect(result).toBe(game);
    expect(player.victoryPoints).toBe(vpBefore);
  });

  it('sets state.winner and GameStatus.Finished when the discovery VP reaches the victory point goal', () => {
    const player = game.players[0];
    player.victoryPoints = game.settings.victoryPointGoal - game.settings.vpPerIslandDiscovery;
    const tile = forcedTile(game, IslandType.Resource);

    const nextState = revealIsland(game, tile.x, tile.y);

    expect(nextState.winner).toBe(player);
    expect(nextState.status).toBe(GameStatus.Finished);
    expect(nextState.log.some((entry) => entry.includes('won the game'))).toBe(true);
  });

  it('isScout suppresses the discovery VP award', () => {
    const player = game.players[0];
    const tile = forcedTile(game, IslandType.Resource);
    const vpBefore = player.victoryPoints;

    revealIsland(game, tile.x, tile.y, true);

    expect(player.revealedTiles).toContain(tile.id);
    expect(player.victoryPoints).toBe(vpBefore);
  });

  it('draws a special card into specialCards when the tile is a Special island', () => {
    const player = game.players[0];
    const tile = forcedTile(game, IslandType.Special);
    const handSizeBefore = player.specialCards.length;
    expect(game.specialCardsDeck.length).toBeGreaterThan(0);

    revealIsland(game, tile.x, tile.y);

    expect(player.specialCards.length).toBe(handSizeBefore + 1);
    expect(game.log.some((entry) => entry.includes('found a card'))).toBe(true);
  });

  it('isScout suppresses the special-card draw on a Special island', () => {
    const player = game.players[0];
    const tile = forcedTile(game, IslandType.Special);
    const handSizeBefore = player.specialCards.length;

    revealIsland(game, tile.x, tile.y, true);

    expect(player.specialCards.length).toBe(handSizeBefore);
  });

  it('does not draw a card when the hand is already full (boundary: HAND_LIMIT)', () => {
    const player = game.players[0];
    player.specialCards = Array.from({ length: HAND_LIMIT }, () => CardName.Scout);
    const tile = forcedTile(game, IslandType.Special);

    revealIsland(game, tile.x, tile.y);

    expect(player.specialCards).toHaveLength(HAND_LIMIT);
    expect(game.log.some((entry) => entry.includes('hand is full'))).toBe(true);
  });

  it('logs that the deck is empty when both the deck and discard pile are empty (empty-input boundary)', () => {
    const player = game.players[0];
    game.specialCardsDeck = [];
    game.discardPile = [];
    const tile = forcedTile(game, IslandType.Special);
    const handSizeBefore = player.specialCards.length;

    revealIsland(game, tile.x, tile.y);

    expect(player.specialCards).toHaveLength(handSizeBefore);
    expect(game.log.some((entry) => entry.includes('deck is empty!'))).toBe(true);
  });

  it('reshuffles the discard pile into the deck when the deck is empty but the discard pile is not', () => {
    const player = game.players[0];
    game.specialCardsDeck = [];
    game.discardPile = [CardName.Scout];
    const tile = forcedTile(game, IslandType.Special);

    revealIsland(game, tile.x, tile.y);

    expect(player.specialCards).toContain(CardName.Scout);
    expect(game.discardPile).toHaveLength(0);
  });
});
