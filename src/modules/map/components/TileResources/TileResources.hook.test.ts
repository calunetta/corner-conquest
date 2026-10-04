import { renderHook } from '@testing-library/react';
import { useTileResources } from './TileResources.hook';
import { IslandType, ResourceType, PlayerColor, type Island, type GameState, type Player } from '@/lib/types';
import { useGameBoard } from '@/modules/game-board';
import type { GameBoardContextType } from '@/modules/game-board';

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

describe('useTileResources', () => {
  const mockGameState: GameState = {
    turn: 1,
    currentPlayerId: 0,
    players: [
      {
        id: 0,
        name: 'Player Blue',
        color: PlayerColor.Blue,
        resources: { gold: 0, wood: 0, food: 0 },
        armies: [],
        positions: [],
        specialCards: [],
        revealedTiles: ['1-1'],
        victoryPoints: 0,
        attackPower: 1,
        actionsThisTurn: [],
        nextArmyCost: 3,
        reinforceActive: false,
        efficientActive: false,
        masterBuilderActive: false,
        hasExtraMove: false,
        lastResourceRoll: null,
      } as unknown as Player,
    ],
    map: [],
    deathAnimations: [],
    debugMode: false,
    settings: {
      fogOfWar: false,
      victoryPointGoal: 10,
      upgradeCost: 5,
      abilityCost: 3,
      baseResourceAmount: 1,
      availableAbilities: [],
    },
  } as unknown as GameState;

  beforeEach(() => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: mockGameState,
    } as GameBoardContextType);
  });

  it('returns null nodes for island with no resources', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const { result } = renderHook(() => useTileResources({ island }));

    expect(result.current.nodes).toBeNull();
  });

  it('returns view model for island with resources', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileResources({ island }));

    expect(result.current.nodes).not.toBeNull();
    expect(result.current.nodes!.length).toBe(1);
  });

  it('expands multiple resource amounts correctly', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Food, amount: 2 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileResources({ island }));

    expect(result.current.nodes!.length).toBe(3);
  });

  it('uses isBase prop to control base resource layout', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      resources: [
        { type: ResourceType.Food, amount: 2 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    const { result: resultBase } = renderHook(() => useTileResources({ island, isBase: true }));
    const { result: resultNotBase } = renderHook(() => useTileResources({ island, isBase: false }));

    // Base should have exactly 2 nodes (1 per resource type)
    expect(resultBase.current.nodes!.length).toBe(2);
    // Non-base should expand amounts: 2 food + 1 gold = 3 nodes
    expect(resultNotBase.current.nodes!.length).toBe(3);
  });

  it('reads gameState.players from context', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const { result } = renderHook(() => useTileResources({ island }));

    // Should find the farming collector using players from context
    expect(result.current.nodes![0].farmingCollector).not.toBeNull();
    expect(result.current.nodes![0].farmingCollector!.color).toBe(PlayerColor.Blue);
  });

  it('returns null when monster island has living monsters', () => {
    const island: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      monsters: [
        {
          name: 'Bear',
          level: 1,
          sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/bear_death.gif' },
        },
      ],
    };

    const { result } = renderHook(() => useTileResources({ island }));

    expect(result.current.nodes).toBeNull();
  });

  it('updates nodes when island prop changes', () => {
    const island1: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      positionedBy: [],
    };

    const island2: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 2 }],
      occupants: [],
      positionedBy: [],
    };

    const { result, rerender } = renderHook((props) => useTileResources(props), { initialProps: { island: island1 } });

    expect(result.current.nodes!.length).toBe(1);
    expect(result.current.nodes![0].type).toBe(ResourceType.Food);

    rerender({ island: island2 });

    expect(result.current.nodes!.length).toBe(2);
    expect(result.current.nodes!.every((n) => n.type === ResourceType.Gold)).toBe(true);
  });

  it('defaults isBase to false when not provided', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      resources: [{ type: ResourceType.Food, amount: 2 }],
      occupants: [],
      positionedBy: [],
    };

    // Call without isBase prop
    const { result } = renderHook(() => useTileResources({ island }));

    // Should expand amounts (2 food = 2 nodes) since isBase defaults to false
    expect(result.current.nodes!.length).toBe(2);
  });

  it('responds to gameState changes', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    const { result, rerender } = renderHook(() => useTileResources({ island }));

    expect(result.current.nodes![0].farmingCollector!.color).toBe(PlayerColor.Blue);

    // Mock a different player now
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        ...mockGameState,
        players: [
          {
            ...mockGameState.players[0],
            color: PlayerColor.Red,
          } as Player,
        ],
      } as GameState,
    } as GameBoardContextType);

    rerender({ island });

    expect(result.current.nodes![0].farmingCollector!.color).toBe(PlayerColor.Red);
  });
});
