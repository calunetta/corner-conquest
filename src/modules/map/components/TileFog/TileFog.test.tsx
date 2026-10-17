import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DEFAULT_FOG_TIMING, DEFAULT_FOG_VARIANTS } from './TileFog.config';
import { TileFog } from './TileFog';

jest.mock('next/image', () => ({
  __esModule: true,
  // A real <img> so the test can fire its load event; this stands in for next/image.
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, onLoad }: { src: string; onLoad?: () => void }) => <img alt="" data-src={src} onLoad={onLoad} />,
}));

const FOG_STILL_SRC = DEFAULT_FOG_VARIANTS[0].still;
const FOG_SPRITE_SRC = DEFAULT_FOG_VARIANTS[0].animation;

const renderedSources = () =>
  Array.from(screen.getByTestId('tile-fog').querySelectorAll('[data-src]')).map((node) =>
    node.getAttribute('data-src'),
  );

/** The element playing the pass gif, found by its source. */
const gifElement = () =>
  Array.from(screen.getByTestId('tile-fog').querySelectorAll('[data-src]')).find(
    (node) => node.getAttribute('data-src') === FOG_SPRITE_SRC,
  ) as HTMLElement;

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
    fireEvent.load(gifElement());
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

  it('keeps the still frame under the gif until the gif has loaded, so the tile never goes blank', () => {
    const { rerender } = render(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);

    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(renderedSources()).toEqual([FOG_STILL_SRC, FOG_SPRITE_SRC]);

    fireEvent.load(gifElement());
    expect(renderedSources()).toEqual([FOG_SPRITE_SRC]);
  });

  it('keeps the still frame through the fade if the gif has not loaded yet', () => {
    const { rerender } = render(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);
    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);

    act(() => {
      jest.advanceTimersByTime(DEFAULT_FOG_TIMING.fadeStartMs);
    });

    expect(screen.getByTestId('tile-fog')).toHaveAttribute('data-phase', 'fadingOut');
    expect(renderedSources()).toEqual([FOG_STILL_SRC, FOG_SPRITE_SRC]);
  });

  it('starts the pass from its first frame on every discovery, waiting for each load', () => {
    const { rerender } = render(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(renderedSources()).toEqual([]);

    rerender(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);
    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(renderedSources()).toEqual([FOG_STILL_SRC, FOG_SPRITE_SRC]);

    fireEvent.load(gifElement());
    expect(renderedSources()).toEqual([FOG_SPRITE_SRC]);

    rerender(<TileFog isCovered prefersReducedMotion={false} variantSeed={0} />);
    rerender(<TileFog isCovered={false} prefersReducedMotion={false} variantSeed={0} />);
    expect(renderedSources()).toEqual([FOG_STILL_SRC, FOG_SPRITE_SRC]);
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
