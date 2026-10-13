'use client';

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardRevealEffect } from './CardRevealEffect';
import { REVEAL_ANIMATION_DURATION, REVEAL_SPRITE_PATH } from './CardRevealEffect.types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('CardRevealEffect Component', () => {
  const mockId = 'card-1-1-0';

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the reveal sprite when visible', () => {
    const now = Date.now();
    render(<CardRevealEffect id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Card revealed');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toMatch(/special_island_reveal\.gif/);
  });

  it('includes the animation ID as a query parameter on the sprite src', () => {
    const now = Date.now();
    render(<CardRevealEffect id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Card revealed');
    expect(image.getAttribute('src')).toBe(`${REVEAL_SPRITE_PATH}?anim=${mockId}`);
  });

  it('shows the effect immediately if no createdAt is provided (assumes now)', () => {
    render(<CardRevealEffect id={mockId} />);
    const image = screen.getByAltText('Card revealed');
    expect(image).toBeInTheDocument();
  });

  it('is not in the document once the animation duration has elapsed', () => {
    const now = Date.now();
    render(<CardRevealEffect id={mockId} createdAt={now} />);
    expect(screen.getByAltText('Card revealed')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(REVEAL_ANIMATION_DURATION);
    });

    expect(screen.queryByAltText('Card revealed')).not.toBeInTheDocument();
  });

  it('handles different animation ids in the cache-busting query param', () => {
    const customId = 'card-2-3-999';
    const now = Date.now();
    render(<CardRevealEffect id={customId} createdAt={now} />);
    const image = screen.getByAltText('Card revealed');
    expect(image.getAttribute('src')).toBe(`${REVEAL_SPRITE_PATH}?anim=${customId}`);
  });
});
