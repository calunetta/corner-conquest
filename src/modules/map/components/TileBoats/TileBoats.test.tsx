import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileBoatsView } from './TileBoats';
import { toTileBoatsViewModel } from './TileBoats.map';
import { IslandType, ResourceType, PlayerColor } from '@/lib/types';
import type { Island, Player } from '@/lib/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('TileBoats Component', () => {
  const mockPlayers: Player[] = [
    {
      id: 0,
      name: 'Player Blue',
      color: PlayerColor.Blue,
      resources: { gold: 0, wood: 0, food: 0 },
      armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
      positions: [],
      specialCards: [],
      revealedTiles: ['1-1', '0-0'],
      victoryPoints: 0,
      attackPower: 1,
      actionsThisTurn: [],
      nextArmyCost: 3,
      reinforceActive: false,
      efficientActive: false,
      masterBuilderActive: false,
      hasExtraMove: false,
      playerId: 'p0',
      isBot: false,
      armyCount: 1,
      passiveAbilities: {},
      isSabotaged: false,
    },
    {
      id: 1,
      name: 'Player Red',
      color: PlayerColor.Red,
      resources: { gold: 0, wood: 0, food: 0 },
      armies: [{ id: 1, position: { x: 1, y: 1 }, hasActed: false }],
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
      playerId: 'p1',
      isBot: false,
      armyCount: 1,
      passiveAbilities: {},
      isSabotaged: false,
    },
  ];

  const mockGameState = {
    players: mockPlayers,
    debugMode: false,
    settings: { fogOfWar: false },
  };

  it('renders docked boat on player base at game start', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const boats = toTileBoatsViewModel(baseIsland, mockGameState.players, mockPlayers[0] as Player, false, false);
    render(<TileBoatsView boats={boats} />);
    const boat = screen.getByTestId('docked-boat');
    expect(boat).toBeInTheDocument();
    expect(boat.querySelector('img')!.getAttribute('src')).toBe('/sprites/boat.gif');
    expect(screen.getByTestId('collector-idle-blue')).toBeInTheDocument();
  });

  it('renders distinct non-overlapping corner boats when 2 players occupy the same island', () => {
    const contestedIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 1 },
      ],
    };

    const boats = toTileBoatsViewModel(contestedIsland, mockGameState.players, mockPlayers[0] as Player, false, false);
    render(<TileBoatsView boats={boats} />);
    const boatElements = screen.getAllByTestId('docked-boat');
    expect(boatElements.length).toBe(2);

    // Both players should have their idle collector at their respective boat
    expect(screen.getByTestId('collector-idle-blue')).toBeInTheDocument();
    expect(screen.getByTestId('collector-idle-red')).toBeInTheDocument();
  });

  it('hides the idle collector from the boat when the army is actively positioned on a resource', () => {
    const positionedIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Food }],
    };

    const boats = toTileBoatsViewModel(positionedIsland, mockGameState.players, mockPlayers[0] as Player, false, false);
    render(<TileBoatsView boats={boats} />);
    const boat = screen.getByTestId('docked-boat');
    expect(boat).toBeInTheDocument();

    // Idle collector should be hidden because the collector is actively farming the resource
    expect(screen.queryByTestId('collector-idle-blue')).toBeNull();
  });

  it('returns null when no boats are present', () => {
    const emptyIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const boats = toTileBoatsViewModel(emptyIsland, mockGameState.players, mockPlayers[0] as Player, false, false);
    expect(boats).toBeNull();
  });

  it('respects fog of war when localPlayer has not revealed the tile', () => {
    const hiddenIsland: Island = {
      id: '5-5',
      x: 5,
      y: 5,
      type: IslandType.Resource,
      resources: [],
      occupants: [{ playerId: 1, armyId: 1 }],
    };

    const localPlayerWithoutReveal = {
      ...mockPlayers[0],
      revealedTiles: [],
    } as Player;

    const boats = toTileBoatsViewModel(hiddenIsland, mockGameState.players, localPlayerWithoutReveal, false, true);
    expect(boats).toBeNull(); // Tile not visible due to fog of war
  });
});
