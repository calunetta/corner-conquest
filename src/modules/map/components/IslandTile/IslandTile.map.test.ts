import { toIslandTileViewModel } from './IslandTile.map';
import { IslandType, CardName, PlayerColor, type Island } from '@/lib/types';
import { initialUIState } from '@/modules/game-board';
import {
  gameStateFixture,
  localPlayerFixture,
  armyFixture,
} from './IslandTile.fixtures';
import type { IslandTileContext } from './IslandTile.types';

describe('toIslandTileViewModel', () => {
  const baseContext: IslandTileContext = {
    gameState: { ...gameStateFixture, settings: { ...gameStateFixture.settings, fogOfWar: false } },
    localPlayer: localPlayerFixture,
    uiState: {
      ...initialUIState,
      possibleMoves: [{ x: 2, y: 2 }],
    },
    selectedArmy: null,
  };

  it('marks tile as selected when army is positioned there', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, { ...baseContext, selectedArmy: armyFixture });

    expect(result.isSelected).toBe(true);
  });

  it('marks tile as not selected when army is elsewhere', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, { ...baseContext, selectedArmy: { id: 999, position: { x: 9, y: 9 }, hasActed: false } });

    expect(result.isSelected).toBe(false);
  });

  it('marks tile as possible move when in possibleMoves', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.isPossibleMove).toBe(true);
  });

  it('marks tile as not possible move when not in possibleMoves', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.isPossibleMove).toBe(false);
  });

  it('marks tile as teleport target when teleport pending and not opponent base', () => {
    const island: Island = {
      id: '3-3',
      x: 3,
      y: 3,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, {
      ...baseContext,
      uiState: { ...baseContext.uiState, pendingAction: { type: 'teleport', cardName: CardName.ExtraMove } },
      selectedArmy: armyFixture,
    });

    expect(result.isTeleportTarget).toBe(true);
  });

  it('does not mark opponent base as teleport target', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Base,
      owner: 1, // Opponent
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, {
      ...baseContext,
      uiState: { ...baseContext.uiState, pendingAction: { type: 'teleport', cardName: CardName.ExtraMove } },
      selectedArmy: armyFixture,
    });

    expect(result.isTeleportTarget).toBe(false);
  });

  it('marks tile as scout target when scout pending and fog of war and not revealed', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      uiState: {
        ...baseContext.uiState,
        pendingAction: { type: 'scout' as const, cardName: CardName.ExtraMove, count: 1, scoutedTiles: [] },
      },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['0-0'] },
    });

    expect(result.isScoutTarget).toBe(true);
  });

  it('does not mark scout target in debug mode', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const contextWithScout = {
      ...baseContext,
      gameState: { ...baseContext.gameState, debugMode: true, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      uiState: {
        ...baseContext.uiState,
        pendingAction: { type: 'scout' as const, cardName: CardName.ExtraMove, count: 1, scoutedTiles: [] },
      },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['1-1', '0-0'] },
    };

    const result = toIslandTileViewModel(island, contextWithScout);

    expect(result.isScoutTarget).toBe(false);
  });

  it('marks tile as base when type is Base', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.isBase).toBe(true);
  });

  it('returns baseOwner when Base tile and owner exists', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.baseOwner).not.toBeNull();
    expect(result.baseOwner!.id).toBe(0);
  });

  it('returns null baseOwner when not a Base tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.baseOwner).toBeNull();
  });

  it('always returns isTileVisible true for Base islands', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const contextWithFogOfWar = {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      localPlayer: { ...localPlayerFixture, revealedTiles: [] }, // Not revealed
    };

    const result = toIslandTileViewModel(island, contextWithFogOfWar);

    expect(result.isTileVisible).toBe(true);
  });

  it('always returns isTileVisible true in debug mode', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const contextDebug = {
      ...baseContext,
      gameState: { ...baseContext.gameState, debugMode: true, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      localPlayer: { ...localPlayerFixture, revealedTiles: [] },
    };

    const result = toIslandTileViewModel(island, contextDebug);

    expect(result.isTileVisible).toBe(true);
  });

  it('respects fog of war visibility', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const contextFogOfWar = {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['0-0'] },
    };

    const result = toIslandTileViewModel(island, contextFogOfWar);

    expect(result.isTileVisible).toBe(false);
  });

  it('returns isTileVisible true when personally revealed with fog of war', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const contextFogOfWarRevealed = {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['1-1', '0-0', '5-5'] },
    };

    const result = toIslandTileViewModel(island, contextFogOfWarRevealed);

    expect(result.isTileVisible).toBe(true);
  });

  it('returns tilePlayerColor when exactly one local player occupies tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.tilePlayerColor).toBe(PlayerColor.Blue);
  });

  it('returns null tilePlayerColor when 2 players occupy tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.tilePlayerColor).toBeNull();
  });

  it('returns null tilePlayerColor when local player does not occupy tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [{ playerId: 1, armyId: 1 }],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.tilePlayerColor).toBeNull();
  });

  it('returns null tilePlayerColor when tile not visible', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const contextFogOfWar = {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['1-1', '0-0'] },
    };

    const result = toIslandTileViewModel(island, contextFogOfWar);

    expect(result.tilePlayerColor).toBeNull();
  });

  it('marks tile as clickable when it is a possible move', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.isClickable).toBe(true);
  });

  it('marks tile as clickable when it is a scout target', () => {
    const island: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const contextWithScout = {
      ...baseContext,
      gameState: { ...baseContext.gameState, settings: { ...baseContext.gameState.settings, fogOfWar: true } },
      uiState: {
        ...baseContext.uiState,
        pendingAction: { type: 'scout' as const, cardName: CardName.ExtraMove, count: 1, scoutedTiles: [] },
      },
      localPlayer: { ...localPlayerFixture, revealedTiles: ['1-1', '0-0'] },
    };

    const result = toIslandTileViewModel(island, contextWithScout);

    expect(result.isClickable).toBe(true);
  });

  it('marks tile as clickable when local player already occupies it', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [{ playerId: 0, armyId: 0 }],
    };

    const result = toIslandTileViewModel(island, baseContext);

    expect(result.isClickable).toBe(true);
  });

  it('does not mutate input island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const originalIsland = JSON.parse(JSON.stringify(island));

    toIslandTileViewModel(island, baseContext);

    expect(island).toEqual(originalIsland);
  });
});
