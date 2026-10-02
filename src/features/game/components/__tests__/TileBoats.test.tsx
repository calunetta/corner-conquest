import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileBoats } from '../TileBoats';
import { IslandType, ResourceType, PlayerColor } from '@/lib/types';
import type { Island, GameState } from '@/lib/types';
import { useGameBoard } from '../../context/GameBoardContext';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock useGameBoard
jest.mock('../../context/GameBoardContext', () => ({
  useGameBoard: jest.fn(),
}));

describe('TileBoats Component', () => {
  const mockPlayers = [
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
      lastResourceRoll: null,
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
      lastResourceRoll: null,
    },
  ];

  const mockGameState = {
    players: mockPlayers,
    debugMode: false,
    settings: { fogOfWar: false },
  } as unknown as GameState;

  beforeEach(() => {
    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: mockGameState,
      localPlayer: mockPlayers[0],
    });
  });

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

    render(<TileBoats island={baseIsland} />);
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

    render(<TileBoats island={contestedIsland} />);
    const boats = screen.getAllByTestId('docked-boat');
    expect(boats.length).toBe(2);

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

    render(<TileBoats island={positionedIsland} />);
    const boat = screen.getByTestId('docked-boat');
    expect(boat).toBeInTheDocument();

    // Idle collector should be hidden because the collector is actively farming the resource
    expect(screen.queryByTestId('collector-idle-blue')).toBeNull();
  });
});
