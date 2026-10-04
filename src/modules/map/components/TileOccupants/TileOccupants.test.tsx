import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileOccupantsView } from './TileOccupants';
import { useTileOccupants } from './TileOccupants.hook';
import { renderHook } from '@testing-library/react';
import { ResourceType, IslandType, type Island } from '@/lib/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

// Mock useGameBoard
jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

import { useGameBoard } from '@/modules/game-board';

describe('TileOccupants Component', () => {
  const basePlayer = {
    id: 0,
    playerId: 'p0',
    name: 'Player 1',
    color: 'blue',
    armies: [{ id: 1, position: { x: 1, y: 1 }, hasActed: false }],
    resources: { gold: 0, wood: 0, food: 0 },
    specialCards: [],
    passiveAbilities: {},
    positions: [],
    victoryPoints: 0,
    attackPower: 0,
    actionsThisTurn: [],
    revealedTiles: ['1-1'],
  };

  const baseGameState: Record<string, unknown> = {
    players: [basePlayer],
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
  };

  beforeEach(() => {
    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: baseGameState,
      localPlayer: basePlayer,
    });
  });

  it('renders soldier sprite for unpositioned army on tile', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });

  it('renders soldier sprite even when army is positioned on a resource', () => {
    const positionedPlayer = {
      ...basePlayer,
      positions: [{ armyId: 1, x: 1, y: 1, resource: ResourceType.Food }],
    };

    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: {
        ...baseGameState,
        players: [positionedPlayer],
      },
      localPlayer: positionedPlayer,
    });

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 1 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armyImg = screen.getByAltText('blue army');
    expect(armyImg).toBeInTheDocument();
  });

  it('renders multiple armies on contested tiles', () => {
    const secondPlayer = {
      id: 1,
      playerId: 'p1',
      name: 'Player 2',
      color: 'red',
      armies: [{ id: 2, position: { x: 1, y: 1 }, hasActed: false }],
      resources: { gold: 0, wood: 0, food: 0 },
      specialCards: [],
      passiveAbilities: {},
      positions: [],
      victoryPoints: 0,
      attackPower: 0,
      actionsThisTurn: [],
      revealedTiles: ['1-1'],
    };

    const multiPlayerState = {
      ...baseGameState,
      players: [basePlayer, secondPlayer],
    };

    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: multiPlayerState,
      localPlayer: basePlayer,
    });

    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 1 },
        { playerId: 1, armyId: 2 },
      ],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    render(<TileOccupantsView occupants={result.current.occupants} />);
    const armies = screen.getAllByAltText(/army/);
    expect(armies.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array when no occupants on island', () => {
    const island: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
      positionedBy: [],
    };

    const { result } = renderHook(() => useTileOccupants({ island }));
    expect(result.current.occupants).toHaveLength(0);
  });
});
