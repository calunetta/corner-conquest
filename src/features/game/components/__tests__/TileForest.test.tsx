import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileForest, TREE_SPRITES } from '../TileForest';
import { IslandType } from '@/lib/types';
import type { Island } from '@/lib/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

describe('TileForest Component', () => {
  it('renders a deterministic cluster of trees of the same sprite type on an empty island', () => {
    const mockIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    render(<TileForest island={mockIsland} />);
    const trees = screen.getAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(2);
    expect(trees.length).toBeLessThanOrEqual(3);

    // Verify all rendered trees on this island use the EXACT same sprite
    const images = trees.map(t => t.querySelector('img')!.getAttribute('src'));
    const uniqueSprites = Array.from(new Set(images));
    expect(uniqueSprites.length).toBe(1);
    expect(TREE_SPRITES).toContain(uniqueSprites[0]);
  });

  it('suppresses decorative forest on Resource islands so players only see real harvestable resource nodes', () => {
    const resourceIsland: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Resource,
      resources: [],
      occupants: [],
    };

    const { container } = render(<TileForest island={resourceIsland} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders a cluster positioned for player base', () => {
    const baseIsland: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    render(<TileForest island={baseIsland} isBase={true} />);
    const trees = screen.getAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(2);
  });

  it('hides the forest completely on monster tiles with living monsters', () => {
    const monsterIsland: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [],
      occupants: [],
      monsters: [
        {
          name: 'Bear',
          level: 1,
          sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' },
        },
      ],
    };

    const { container } = render(<TileForest island={monsterIsland} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders the forest once monsters are defeated (empty monsters list)', () => {
    const defeatedMonsterIsland: Island = {
      id: '2-2',
      x: 2,
      y: 2,
      type: IslandType.Monster,
      resources: [],
      occupants: [],
      monsters: [],
    };

    render(<TileForest island={defeatedMonsterIsland} />);
    expect(screen.getByTestId('tile-forest')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-forest-tree').length).toBeGreaterThanOrEqual(2);
  });
});
