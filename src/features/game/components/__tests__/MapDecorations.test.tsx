import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapDecorations, FIXED_ROCK_LAYOUT } from '../MapDecorations';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

describe('MapDecorations Component', () => {
  it('renders all deterministic rocks on desktop mode', () => {
    render(<MapDecorations isMobile={false} />);
    const rocks = screen.getAllByTestId('decorative-rock');
    expect(rocks.length).toBe(FIXED_ROCK_LAYOUT.length);
  });

  it('renders a filtered subset of rocks on mobile mode', () => {
    render(<MapDecorations isMobile={true} />);
    const mobileRocks = screen.getAllByTestId('decorative-rock');
    const expectedMobileCount = FIXED_ROCK_LAYOUT.filter(r => !r.desktopOnly).length;
    expect(mobileRocks.length).toBe(expectedMobileCount);
    expect(mobileRocks.length).toBeLessThan(FIXED_ROCK_LAYOUT.length);
  });

  it('uses valid rock sprite paths', () => {
    const { container } = render(<MapDecorations isMobile={false} />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(FIXED_ROCK_LAYOUT.length);
    images.forEach(img => {
      expect(img.getAttribute('src')).toMatch(/\/sprites\/(small|mini|medium|big)_rock\.gif/);
    });
  });
});
