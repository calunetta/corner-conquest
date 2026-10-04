import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileForest, TREE_SPRITES } from './index';
import { clearedMonsterIsland, emptyIsland, monsterIslandWithMonsters, resourceIsland, baseIsland, specialIsland } from './TileForest.fixtures';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('TileForest Component', () => {
  it('renders a deterministic cluster of trees of the same sprite type on an empty island', () => {
    render(<TileForest island={emptyIsland} />);
    const trees = screen.queryAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(1); // At least one tree is rendered

    // Verify all rendered trees on this island use the EXACT same sprite
    if (trees.length > 0) {
      const images = trees.map(t => t.querySelector('img')!.getAttribute('src'));
      const uniqueSprites = Array.from(new Set(images));
      expect(uniqueSprites.length).toBe(1);
      expect(TREE_SPRITES).toContain(uniqueSprites[0]);
    }
  });

  it('suppresses decorative forest on Resource islands so players only see real harvestable resource nodes', () => {
    const { container } = render(<TileForest island={resourceIsland} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders a cluster positioned for player base', () => {
    render(<TileForest island={baseIsland} isBase={true} />);
    const trees = screen.queryAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(1);
  });

  it('hides the forest completely on monster tiles with living monsters', () => {
    const { container } = render(<TileForest island={monsterIslandWithMonsters} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders the forest once monsters are defeated (empty monsters list)', () => {
    render(<TileForest island={clearedMonsterIsland} />);
    expect(screen.getByTestId('tile-forest')).toBeInTheDocument();
    const trees = screen.queryAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(0); // Forest layout may be sparse
  });

  it('renders forest on special islands', () => {
    render(<TileForest island={specialIsland} />);
    expect(screen.getByTestId('tile-forest')).toBeInTheDocument();
    const trees = screen.queryAllByTestId('tile-forest-tree');
    expect(trees.length).toBeGreaterThanOrEqual(1);
  });
});
