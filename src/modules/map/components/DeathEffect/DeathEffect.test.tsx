'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeathEffect } from './DeathEffect';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imageProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imageProps} alt={String(alt)} />;
  },
}));

describe('DeathEffect Component', () => {
  const mockSprite = '/sprites/death.gif';
  const mockId = 'death-1';

  it('renders the death animation sprite when visible', () => {
    const now = Date.now();
    render(<DeathEffect sprite={mockSprite} id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Death animation');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toMatch(/death\.gif/);
  });

  it('includes the animation ID as a query parameter on the sprite src', () => {
    const now = Date.now();
    render(<DeathEffect sprite={mockSprite} id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Death animation');
    expect(image.getAttribute('src')).toBe(`${mockSprite}?anim=${mockId}`);
  });

  it('shows the effect immediately if no createdAt is provided (assumes now)', () => {
    render(<DeathEffect sprite={mockSprite} id={mockId} />);
    const image = screen.getByAltText('Death animation');
    expect(image).toBeInTheDocument();
  });

  it('uses createdAt to calculate animation timing', () => {
    const now = Date.now();
    render(<DeathEffect sprite={mockSprite} id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Death animation');
    expect(image).toBeInTheDocument();
  });

  it('renders with correct image dimensions', () => {
    const now = Date.now();
    render(<DeathEffect sprite={mockSprite} id={mockId} createdAt={now} />);
    const image = screen.getByAltText('Death animation') as HTMLImageElement;
    expect(image.width).toBe(64);
    expect(image.height).toBe(64);
  });

  it('handles different death sprite paths', () => {
    const customSprite = '/sprites/custom_death.png';
    const now = Date.now();
    render(<DeathEffect sprite={customSprite} id="custom-death" createdAt={now} />);
    const image = screen.getByAltText('Death animation');
    expect(image.getAttribute('src')).toBe(`${customSprite}?anim=custom-death`);
  });
});
