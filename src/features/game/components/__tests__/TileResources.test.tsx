import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileResources } from '../TileResources';
import { IslandType, ResourceType, PlayerColor } from '@/lib/types';
import type { Island, GameState } from '@/lib/types';
import { useGameBoard } from '../../context/GameBoardContext';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, fill, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock useGameBoard
jest.mock('../../context/GameBoardContext', () => ({
  useGameBoard: jest.fn(),
}));

describe('TileResources Component', () => {
  const mockPlayers = [
    {
      id: 0,
      name: 'Player 1',
      color: PlayerColor.Blue,
      resources: { gold: 0, wood: 0, food: 0 },
      armies: [{ id: 0, position: { x: 1, y: 1 }, hasActed: false }],
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
  } as unknown as GameState;

  beforeEach(() => {
    (useGameBoard as jest.Mock).mockReturnValue({
      gameState: mockGameState,
    });
  });

  it('renders correct sprites for food (sheep), wood (tree), and gold (mine)', () => {
    const mockIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceType.Food, amount: 1 },
        { type: ResourceType.Wood, amount: 1 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    render(<TileResources island={mockIsland} />);

    const foodNode = screen.getByTestId('resource-node-food');
    expect(foodNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/sheep.gif');

    const woodNode = screen.getByTestId('resource-node-wood');
    expect(woodNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/tree.gif');

    const goldNode = screen.getByTestId('resource-node-gold');
    expect(goldNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/mine.png');
  });

  it('renders 2 distinct food sprites when resource amount is 2', () => {
    const mockIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Food, amount: 2 }],
      occupants: [],
      positionedBy: [],
    };

    render(<TileResources island={mockIsland} />);
    expect(screen.getAllByTestId('resource-sprite-food')).toHaveLength(2);
  });

  it('renders all base resources in top banner for base tiles', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      resources: [
        { type: ResourceType.Food, amount: 1 },
        { type: ResourceType.Wood, amount: 1 },
        { type: ResourceType.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };

    render(<TileResources island={baseIsland} isBase={true} />);
    expect(screen.getByTestId('resource-node-food')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-wood')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-gold')).toBeInTheDocument();
  });

  it('renders active farming collector animation and active mine sprite when positioned', () => {
    const mockIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    render(<TileResources island={mockIsland} />);

    // Mine should switch to active mine
    const goldNode = screen.getByTestId('resource-node-gold');
    expect(goldNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/mine_active.png');

    // Active farming collector sprite for blue player
    const farmingCollector = screen.getByTestId('collector-farm-blue');
    expect(farmingCollector).toBeInTheDocument();
    expect(farmingCollector.querySelector('img')!.getAttribute('src')).toBe('/sprites/farm_blue.gif');
  });

  it('renders active sprites and collectors on ALL nodes when positioned on dual resources (e.g. 2 gold mines)', () => {
    const dualGoldIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceType.Gold, amount: 2 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceType.Gold }],
    };

    render(<TileResources island={dualGoldIsland} />);

    // Both mines should switch to active mine
    const goldNodes = screen.getAllByTestId('resource-node-gold');
    expect(goldNodes).toHaveLength(2);
    goldNodes.forEach(node => {
      expect(node.querySelector('img')!.getAttribute('src')).toBe('/sprites/mine_active.png');
    });

    // Both nodes should have active farming collectors
    const farmingCollectors = screen.getAllByTestId('collector-farm-blue');
    expect(farmingCollectors).toHaveLength(2);
  });

  it('suppresses all resources on monster islands while monsters are undefeated', () => {
    const monsterIsland: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [{ type: ResourceType.Food, amount: 1 }],
      occupants: [],
      positionedBy: [],
      monsters: [
        {
          name: 'Bear',
          level: 1,
          sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' },
        },
      ],
    };

    render(<TileResources island={monsterIsland} />);
    expect(screen.queryByTestId('tile-resources')).toBeNull();
  });
});
