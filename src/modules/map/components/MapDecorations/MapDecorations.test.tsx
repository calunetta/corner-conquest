import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapDecorations } from './MapDecorations';
import { FIXED_ROCK_LAYOUT, FIXED_CLOUD_LAYOUT } from './MapDecorations.map';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('MapDecorations', () => {
  it('renders all rocks and clouds on desktop (isMobile=false)', () => {
    render(<MapDecorations isMobile={false} />);

    const rocks = screen.getAllByTestId('decorative-rock');
    expect(rocks).toHaveLength(FIXED_ROCK_LAYOUT.length);

    const clouds = screen.getAllByTestId('decorative-cloud');
    expect(clouds).toHaveLength(FIXED_CLOUD_LAYOUT.length);
  });

  it('filters out desktopOnly rocks on mobile (isMobile=true)', () => {
    render(<MapDecorations isMobile={true} />);

    const rocks = screen.getAllByTestId('decorative-rock');
    const nonDesktopRocks = FIXED_ROCK_LAYOUT.filter((r) => !r.desktopOnly);

    expect(rocks).toHaveLength(nonDesktopRocks.length);
    expect(rocks.length).toBeLessThan(FIXED_ROCK_LAYOUT.length);
  });

  it('filters out desktopOnly clouds on mobile (isMobile=true)', () => {
    render(<MapDecorations isMobile={true} />);

    const clouds = screen.getAllByTestId('decorative-cloud');
    const nonDesktopClouds = FIXED_CLOUD_LAYOUT.filter((c) => !c.desktopOnly);

    expect(clouds).toHaveLength(nonDesktopClouds.length);
    expect(clouds.length).toBeLessThan(FIXED_CLOUD_LAYOUT.length);
  });

  it('applies styles to rock containers', () => {
    render(<MapDecorations isMobile={false} />);

    const rocks = screen.getAllByTestId('decorative-rock');
    rocks.forEach((rock, idx) => {
      const rockDef = FIXED_ROCK_LAYOUT[idx];
      expect(rock).toHaveStyle({
        left: rockDef.left,
        top: rockDef.top,
        width: `${rockDef.size}px`,
        height: `${rockDef.size}px`,
      });
    });
  });

  it('applies styles to cloud containers', () => {
    render(<MapDecorations isMobile={false} />);

    const clouds = screen.getAllByTestId('decorative-cloud');
    clouds.forEach((cloud, idx) => {
      const cloudDef = FIXED_CLOUD_LAYOUT[idx];
      expect(cloud).toHaveStyle({
        left: cloudDef.left,
        top: cloudDef.top,
        width: `${cloudDef.width}px`,
        height: `${cloudDef.height}px`,
        opacity: (cloudDef.opacity ?? 0.8).toString(),
      });
    });
  });

  it('renders rock images with correct src and dimensions', () => {
    render(<MapDecorations isMobile={false} />);

    const rockContainers = screen.getAllByTestId('decorative-rock');
    rockContainers.forEach((container, idx) => {
      const img = container.querySelector('img');
      const rockDef = FIXED_ROCK_LAYOUT[idx];

      expect(img).toHaveAttribute('src', rockDef.src);
      expect(img).toHaveAttribute('width', rockDef.size.toString());
      expect(img).toHaveAttribute('height', rockDef.size.toString());
      expect(img).toHaveAttribute('alt', 'decorative rock');
    });
  });

  it('renders cloud images with correct src and dimensions', () => {
    render(<MapDecorations isMobile={false} />);

    const cloudContainers = screen.getAllByTestId('decorative-cloud');
    cloudContainers.forEach((container, idx) => {
      const img = container.querySelector('img');
      const cloudDef = FIXED_CLOUD_LAYOUT[idx];

      expect(img).toHaveAttribute('src', cloudDef.src);
      expect(img).toHaveAttribute('width', cloudDef.width.toString());
      expect(img).toHaveAttribute('height', cloudDef.height.toString());
      expect(img).toHaveAttribute('alt', 'perimeter cloud');
    });
  });

  it('marks root container as aria-hidden', () => {
    const { container } = render(<MapDecorations isMobile={false} />);
    const root = container.querySelector('[aria-hidden="true"]');

    expect(root).toBeInTheDocument();
  });

  it('uses default opacity of 0.8 when cloud opacity is not specified', () => {
    render(<MapDecorations isMobile={false} />);

    const cloudContainers = screen.getAllByTestId('decorative-cloud');
    cloudContainers.forEach((container, idx) => {
      const cloudDef = FIXED_CLOUD_LAYOUT[idx];
      const expectedOpacity = cloudDef.opacity ?? 0.8;

      expect(container).toHaveStyle({ opacity: expectedOpacity.toString() });
    });
  });

  it('defaults isMobile to false when prop not provided', () => {
    // Desktop mode (full layout)
    render(<MapDecorations />);

    const rocks = screen.getAllByTestId('decorative-rock');
    expect(rocks).toHaveLength(FIXED_ROCK_LAYOUT.length);

    const clouds = screen.getAllByTestId('decorative-cloud');
    expect(clouds).toHaveLength(FIXED_CLOUD_LAYOUT.length);
  });

  it('transitions correctly when isMobile changes from false to true', () => {
    const { rerender } = render(<MapDecorations isMobile={false} />);

    let rocks = screen.getAllByTestId('decorative-rock');
    expect(rocks).toHaveLength(FIXED_ROCK_LAYOUT.length);

    rerender(<MapDecorations isMobile={true} />);

    rocks = screen.getAllByTestId('decorative-rock');
    const nonDesktopRocks = FIXED_ROCK_LAYOUT.filter((r) => !r.desktopOnly);
    expect(rocks).toHaveLength(nonDesktopRocks.length);
  });
});
