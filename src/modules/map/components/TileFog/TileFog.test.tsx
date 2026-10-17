import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_FOG_TIMING, DEFAULT_FOG_VARIANTS } from './TileFog.config';
import { TileFog } from './TileFog';
import { NEUTRAL_FOG_COLOUR } from './TileFog.map';

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

  describe('neutral fog', () => {
    it('keeps the terrain-coloured fog when the setting is off (default)', () => {
      render(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);

      const layer = screen.getByTestId('tile-fog');
      expect(layer).toHaveAttribute('data-neutral', 'false');
      expect(layer.style.backgroundColor).toBe('');
      expect(layer).not.toHaveClass('rounded-lg');
    });

    it('paints an opaque grey backing under covered fog when the setting is on', () => {
      render(<TileFog isCovered isNeutral prefersReducedMotion={false} variantSeed={0} />);

      const layer = screen.getByTestId('tile-fog');
      expect(layer).toHaveAttribute('data-neutral', 'true');
      expect(layer).toHaveStyle({ backgroundColor: NEUTRAL_FOG_COLOUR });
      expect(layer).toHaveClass('rounded-lg');
      expect(renderedSources()).toEqual([FOG_STILL_SRC]);
    });

    it('keeps the grey backing through the pass and fade, so terrain does not flash before the fade', () => {
      const { rerender } = render(<TileFog isCovered isNeutral prefersReducedMotion={false} variantSeed={0} />);

      rerender(<TileFog isCovered={false} isNeutral prefersReducedMotion={false} variantSeed={0} />);
      act(() => {
        jest.advanceTimersByTime(DEFAULT_FOG_TIMING.fadeStartMs);
      });

      expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'fadingOut');
      expect(screen.getByTestId('tile-fog')).toHaveStyle({ backgroundColor: NEUTRAL_FOG_COLOUR });
    });
  });
});
