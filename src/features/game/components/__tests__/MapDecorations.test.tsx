import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapDecorations, FIXED_ROCK_LAYOUT, FIXED_CLOUD_LAYOUT } from '../MapDecorations';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

describe('MapDecorations Component', () => {
  it('renders all deterministic rocks and clouds on desktop mode', () => {
    render(<MapDecorations isMobile={false} />);
    const rocks = screen.getAllByTestId('decorative-rock');
    expect(rocks.length).toBe(FIXED_ROCK_LAYOUT.length);

    const clouds = screen.getAllByTestId('decorative-cloud');
    expect(clouds.length).toBe(FIXED_CLOUD_LAYOUT.length);
  });

  it('renders a filtered subset of rocks and clouds on mobile mode', () => {
    render(<MapDecorations isMobile={true} />);
    const mobileRocks = screen.getAllByTestId('decorative-rock');
    const expectedMobileRockCount = FIXED_ROCK_LAYOUT.filter(r => !r.desktopOnly).length;
    expect(mobileRocks.length).toBe(expectedMobileRockCount);
    expect(mobileRocks.length).toBeLessThan(FIXED_ROCK_LAYOUT.length);

    const mobileClouds = screen.getAllByTestId('decorative-cloud');
    const expectedMobileCloudCount = FIXED_CLOUD_LAYOUT.filter(c => !c.desktopOnly).length;
    expect(mobileClouds.length).toBe(expectedMobileCloudCount);
    expect(mobileClouds.length).toBeLessThan(FIXED_CLOUD_LAYOUT.length);
  });

  it('uses valid rock and cloud sprite paths', () => {
    render(<MapDecorations isMobile={false} />);
    const rocks = screen.getAllByTestId('decorative-rock');
    rocks.forEach(rock => {
      const img = rock.querySelector('img')!;
      expect(img.getAttribute('src')).toMatch(/\/sprites\/(small|mini|medium|big)_rock\.gif/);
    });

    const clouds = screen.getAllByTestId('decorative-cloud');
    clouds.forEach(cloud => {
      const img = cloud.querySelector('img')!;
      expect(img.getAttribute('src')).toMatch(/\/sprites\/cloud_(small|medium|big)\.png/);
    });
  });
});
