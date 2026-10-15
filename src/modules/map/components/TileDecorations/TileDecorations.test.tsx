import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TileDecorations } from './TileDecorations';
import { toDecorationLayout } from './TileDecorations.map';
import { baseIsland, monsterIslandWithMonsters, resourceIsland } from './TileDecorations.fixtures';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('TileDecorations', () => {
  it('renders every instance of a populated layout (Base island, real migrated config)', () => {
    render(<TileDecorations island={baseIsland} isBase />);

    const layout = toDecorationLayout(baseIsland, true);
    const decorations = screen.getAllByTestId('tile-decoration');
    expect(decorations).toHaveLength(layout.instances.length);
  });

  it("renders each instance's image, alt text, and style (top/left/size/z, center-anchored transform)", () => {
    render(<TileDecorations island={baseIsland} isBase />);

    const layout = toDecorationLayout(baseIsland, true);
    const instance = layout.instances[0];
    const decoration = screen.getAllByTestId('tile-decoration')[0];
    const img = decoration.querySelector('img');

    expect(img).toHaveAttribute('src', instance.image);
    expect(img).toHaveAttribute('alt', 'Island decoration');
    expect(decoration).toHaveStyle({
      top: `${instance.top}%`,
      left: `${instance.left}%`,
      width: `${instance.size}%`,
      height: `${instance.size}%`,
      zIndex: instance.z,
      transform: 'translate(-50%, -50%)',
    });
  });

  it('renders the container with zero children for an empty-instances layout (Resource island), no crash', () => {
    render(<TileDecorations island={resourceIsland} />);

    expect(screen.getByTestId('tile-decorations')).toBeInTheDocument();
    expect(screen.queryAllByTestId('tile-decoration')).toHaveLength(0);
  });

  it('still mounts (no longer suppressed) for a living-Monster island', () => {
    render(<TileDecorations island={monsterIslandWithMonsters} />);

    expect(screen.getByTestId('tile-decorations')).toBeInTheDocument();
  });

  it('renders no decoration elements at all for a Resource island (not just an empty container check)', () => {
    const { container } = render(<TileDecorations island={resourceIsland} />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
