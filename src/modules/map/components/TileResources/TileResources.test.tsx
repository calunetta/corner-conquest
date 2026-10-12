import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileResources, TileResourcesView } from './TileResources';
import { toTileResourcesViewModel } from './TileResources.map';
import {
  resourceIslandWithDualResources,
  resourceIslandWithFood,
  resourceIslandWithTwoDistinctResources,
  baseIslandWithResources,
  monsterIslandWithLivingMonsters,
} from './TileResources.fixtures';
import { useGameBoard } from '@/modules/game-board';
import { useIsMobile } from '@/modules/shared';
import { PlayerColor, IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
import type { Island, Player } from '@/lib/types';

// The connected TileResources container reads the game-board context and the viewport (useIsMobile).
jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

jest.mock('@/modules/shared', () => ({
  useIsMobile: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('TileResources Component', () => {
  const mockPlayers: Player[] = [
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
      playerId: 'p0',
      isBot: false,
      isVacant: false,
      lastSeenAt: null,
      reclaimRequested: false,
      armyCount: 1,
      passiveAbilities: {},
      isSabotaged: false,
    },
  ] as Player[];

  it('renders correct sprites for food (sheep), wood (tree), and gold (mine)', () => {
    const islandWithAllResources: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [
        { type: ResourceTypeEnum.Food, amount: 1 },
        { type: ResourceTypeEnum.Wood, amount: 1 },
        { type: ResourceTypeEnum.Gold, amount: 1 },
      ],
      occupants: [],
      positionedBy: [],
    };
    const nodes = toTileResourcesViewModel(islandWithAllResources, false, mockPlayers);
    render(<TileResourcesView nodes={nodes} />);

    const foodNode = screen.getByTestId('resource-node-food');
    expect(foodNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/sheep.gif');

    const woodNode = screen.getByTestId('resource-node-wood');
    expect(woodNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/tree.gif');

    const goldNode = screen.getByTestId('resource-node-gold');
    expect(goldNode.querySelector('img')!.getAttribute('src')).toBe('/sprites/mine.png');
  });

  it('renders 2 distinct food sprites when resource amount is 2', () => {
    const nodes = toTileResourcesViewModel(resourceIslandWithDualResources, false, mockPlayers);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getAllByTestId('resource-sprite-gold')).toHaveLength(2);
  });

  it('renders all base resources in top banner for base tiles', () => {
    const nodes = toTileResourcesViewModel(baseIslandWithResources, true, mockPlayers);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-food')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-gold')).toBeInTheDocument();
  });

  it('renders active farming collector animation and active mine sprite when positioned', () => {
    const islandWithPositioned: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [{ type: ResourceTypeEnum.Gold, amount: 1 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Gold }],
    };
    const nodes = toTileResourcesViewModel(islandWithPositioned, false, mockPlayers);
    render(<TileResourcesView nodes={nodes} />);

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
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Resource,
      resources: [{ type: ResourceTypeEnum.Gold, amount: 2 }],
      occupants: [{ playerId: 0, armyId: 0 }],
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Gold }],
    };
    const nodes = toTileResourcesViewModel(dualGoldIsland, false, mockPlayers);
    render(<TileResourcesView nodes={nodes} />);

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
    const nodes = toTileResourcesViewModel(monsterIslandWithLivingMonsters, false, mockPlayers);
    expect(nodes).toBeNull();
  });

  it('returns null when there are no resources', () => {
    const emptyResourceIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
      positionedBy: [],
    };
    const nodes = toTileResourcesViewModel(emptyResourceIsland, false, mockPlayers);
    expect(nodes).toBeNull();
  });
});

describe('TileResourcesView placement and sizing', () => {
  const players = [
    { id: 0, color: PlayerColor.Blue },
    { id: 1, color: PlayerColor.Red },
  ] as unknown as Player[];

  it('places a single resource node in the middle band of the tile', () => {
    const nodes = toTileResourcesViewModel(resourceIslandWithFood, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-food')).toHaveStyle({ top: '65.5%', left: '50%' });
  });

  it('sizes a single Food node as a percent of the tile, scaled up for the sheep canvas padding', () => {
    const nodes = toTileResourcesViewModel(resourceIslandWithFood, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-food')).toHaveStyle({ width: '56.6%', height: '56.6%' });
  });

  it('sizes a non-Food node of a two-resource tile as a percent of the tile, not px', () => {
    const nodes = toTileResourcesViewModel(resourceIslandWithTwoDistinctResources, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-gold')).toHaveStyle({ width: '32%', height: '32%' });
    expect(screen.getByTestId('resource-node-wood')).toHaveStyle({ width: '32%', height: '32%' });
  });

  it('sizes a Base gold node as a percent of the tile and a Base food node with the Food scale', () => {
    const nodes = toTileResourcesViewModel(baseIslandWithResources, true, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-gold')).toHaveStyle({ width: '22%', height: '22%' });
    expect(screen.getByTestId('resource-node-food')).toHaveStyle({ width: '31.9%', height: '31.9%' });
  });

  it('places the Base food node at the top-center slot and the Base gold node at the bottom-left slot', () => {
    const nodes = toTileResourcesViewModel(baseIslandWithResources, true, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('resource-node-food')).toHaveStyle({ top: '15%', left: '50%' });
    expect(screen.getByTestId('resource-node-gold')).toHaveStyle({ top: '85%', left: '35%' });
  });

  it('gives a farmed Gold node a 65% collector badge centered on the node\'s left edge', () => {
    const island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Gold }],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('collector-farm-blue')).toHaveStyle({
      width: '65%',
      height: '65%',
      top: '50%',
      right: '100%',
      transform: 'translate(50%, -50%)',
    });
  });

  it('gives a farmed Food node a 44.8% collector badge, so it matches the 65% badge on other resources', () => {
    const island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Food }],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('collector-farm-blue')).toHaveStyle({ width: '44.8%', height: '44.8%' });
  });

  it('keeps every farmed badge on its node\'s left edge, whichever slot the node occupies', () => {
    const island = {
      ...resourceIslandWithDualResources,
      positionedBy: [
        { playerId: 0, resource: ResourceTypeEnum.Gold },
        { playerId: 0, resource: ResourceTypeEnum.Wood },
      ],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} />);
    const badges = screen.getAllByTestId('collector-farm-blue');
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge).toHaveStyle({
        width: '65%',
        height: '65%',
        top: '50%',
        right: '100%',
        transform: 'translate(50%, -50%)',
      });
    });
  });

  it('sizes the collector badge with no px value, so it scales with the node instead of the tile', () => {
    const island = {
      ...resourceIslandWithTwoDistinctResources,
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Gold }],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.getByTestId('collector-farm-blue').getAttribute('style')).not.toMatch(/px/);
  });

  it('renders no collector badge on an unfarmed node', () => {
    const nodes = toTileResourcesViewModel(resourceIslandWithTwoDistinctResources, false, players);
    render(<TileResourcesView nodes={nodes} />);
    expect(screen.queryByTestId(/^collector-farm-/)).not.toBeInTheDocument();
  });

  it('renders resource and collector sprites without numeric width or height attributes', () => {
    const island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Food }],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} />);
    for (const img of [
      screen.getByRole('img', { name: 'food resource' }),
      screen.getByRole('img', { name: 'blue collector farming' }),
    ]) {
      expect(img).not.toHaveAttribute('width');
      expect(img).not.toHaveAttribute('height');
    }
  });

  it('hides the farming collector badge but keeps the resource node when showFarmingCollector is false', () => {
    const island = {
      ...resourceIslandWithFood,
      positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Food }],
    };
    const nodes = toTileResourcesViewModel(island, false, players);
    render(<TileResourcesView nodes={nodes} showFarmingCollector={false} />);
    expect(screen.getByTestId('resource-node-food')).toBeInTheDocument();
    expect(screen.queryByTestId(/^collector-farm-/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /collector farming/ })).not.toBeInTheDocument();
  });
});

describe('TileResources connected component', () => {
  const players = [
    { id: 0, color: PlayerColor.Blue },
    { id: 1, color: PlayerColor.Red },
  ] as unknown as Player[];

  const farmedFoodIsland = {
    ...resourceIslandWithFood,
    positionedBy: [{ playerId: 0, resource: ResourceTypeEnum.Food }],
  };

  beforeEach(() => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: { players },
    } as unknown as ReturnType<typeof useGameBoard>);
  });

  it('shows the farming collector badge on a desktop viewport', () => {
    jest.mocked(useIsMobile).mockReturnValue(false);
    render(<TileResources island={farmedFoodIsland} />);
    expect(screen.getByTestId('collector-farm-blue')).toBeInTheDocument();
  });

  it('hides the farming collector badge on a mobile viewport but keeps the resource node', () => {
    jest.mocked(useIsMobile).mockReturnValue(true);
    render(<TileResources island={farmedFoodIsland} />);
    expect(screen.getByTestId('resource-node-food')).toBeInTheDocument();
    expect(screen.queryByTestId(/^collector-farm-/)).not.toBeInTheDocument();
  });
});
