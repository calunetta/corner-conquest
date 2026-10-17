import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_FOG_TIMING, DEFAULT_FOG_VARIANTS } from './TileFog.config';
import { TileFog } from './TileFog';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => <span data-src={src} />,
}));

const FOG_STILL_SRC = DEFAULT_FOG_VARIANTS[0].still;
const FOG_SPRITE_SRC = DEFAULT_FOG_VARIANTS[0].animation;

const renderedSources = () =>
  Array.from(screen.getByTestId('tile-fog').querySelectorAll('[data-src]')).map((node) =>
    node.getAttribute('data-src'),
  );

describe('TileFog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the still frame, not the animated gif, while the tile is covered', () => {
    render(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);

    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'covered');
    expect(renderedSources()).toEqual([FOG_STILL_SRC]);
  });

  it('plays the gif on discovery, fades it slowly, then removes the layer', () => {
    const { rerender } = render(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);

    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'lifting');
    expect(renderedSources()).toEqual([FOG_SPRITE_SRC]);

    act(() => {
      jest.advanceTimersByTime(DEFAULT_FOG_TIMING.fadeStartMs);
    });
    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'fadingOut');
    expect(renderedSources()).toEqual([FOG_SPRITE_SRC]);

    act(() => {
      jest.advanceTimersByTime(DEFAULT_FOG_TIMING.fadeMs);
    });
    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'cleared');
    expect(renderedSources()).toEqual([]);
    expect(screen.getByTestId('tile-fog')).toHaveClass('invisible');
  });

  it('starts the pass from its first frame on every discovery', () => {
    const { rerender } = render(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(renderedSources()).toEqual([]);

    rerender(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);
    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);

    expect(renderedSources()).toEqual([FOG_SPRITE_SRC]);
  });

  it('never plays on a tile that starts revealed', () => {
    render(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);

    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'cleared');
    expect(renderedSources()).toEqual([]);
  });

  it('skips the pass under reduced motion', () => {
    const { rerender } = render(<TileFog isCovered prefersReducedMotion variantSeed={0} />);

    rerender(<TileFog isCovered={false} prefersReducedMotion variantSeed={0} />);

    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'cleared');
    expect(renderedSources()).toEqual([]);
  });
});
