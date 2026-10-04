import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileResourcesView } from './TileResources';
import { toTileResourcesViewModel } from './TileResources.map';
import { resourceIslandWithDualResources, baseIslandWithResources, monsterIslandWithLivingMonsters } from './TileResources.fixtures';
import { PlayerColor, IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
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
