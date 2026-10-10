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
    const trees = screen.getAllByTestId('tile-forest-tree');
    expect(trees).toHaveLength(2); // Empty-island grove is always two trees (see sizing tests)

    const images = trees.map((t) => t.querySelector('img')!.getAttribute('src'));
    expect(new Set(images).size).toBe(1);
    expect(TREE_SPRITES).toContain(images[0]);
  });

  it('suppresses decorative forest on Resource islands so players only see real harvestable resource nodes', () => {
    const { container } = render(<TileForest island={resourceIsland} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders a cluster positioned for player base', () => {
    render(<TileForest island={baseIsland} isBase={true} />);
    expect(screen.getAllByTestId('tile-forest-tree')).toHaveLength(2);
  });

  it('hides the forest completely on monster tiles with living monsters', () => {
    const { container } = render(<TileForest island={monsterIslandWithMonsters} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('tile-forest')).toBeNull();
  });

  it('renders the forest once monsters are defeated (empty monsters list)', () => {
    render(<TileForest island={clearedMonsterIsland} />);
    expect(screen.getByTestId('tile-forest')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-forest-tree')).toHaveLength(2);
  });

  it('renders forest on special islands', () => {
    render(<TileForest island={specialIsland} />);
    expect(screen.getByTestId('tile-forest')).toBeInTheDocument();
    expect(screen.getAllByTestId('tile-forest-tree')).toHaveLength(1);
  });

  describe('tree sizing (percent of the tile side)', () => {
    it.each([
      ['empty island grove', emptyIsland, false, 2, '28%'],
      ['cleared monster grove', clearedMonsterIsland, false, 2, '28%'],
      ['base accent', baseIsland, true, 2, '15%'],
      ['special accent', specialIsland, false, 1, '16%'],
    ])('%s renders %i trees each sized %s', (_name, island, isBase, treeCount, size) => {
      render(<TileForest island={island} isBase={isBase} />);

      const trees = screen.getAllByTestId('tile-forest-tree');
      expect(trees).toHaveLength(treeCount);
      trees.forEach((tree) => expect(tree).toHaveStyle({ width: size, height: size }));
    });
  });
});
