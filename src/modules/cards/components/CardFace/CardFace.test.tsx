import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CardName } from '@/lib/types';
import { CardFace } from './CardFace';

describe('CardFace', () => {
  it('renders the card art image with empty alt by default', () => {
    render(<CardFace cardName={CardName.WarChief} size="tile" />);

    const img = screen.getByTestId('card-face').querySelector('img');
    expect(img).not.toBeNull();
    expect(decodeURIComponent(img!.getAttribute('src') ?? '')).toContain('war-chief-card');
    expect(img).toHaveAttribute('alt', '');
  });

  it('uses the given alt text', () => {
    render(<CardFace cardName={CardName.WarChief} size="tile" alt="War Chief card" />);

    expect(screen.getByRole('img', { name: 'War Chief card' })).toBeInTheDocument();
  });

  it('exposes the card name on the wrapper', () => {
    render(<CardFace cardName={CardName.Scout} size="tile" />);

    expect(screen.getByTestId('card-face')).toHaveAttribute('data-card', CardName.Scout);
  });

  it.each([
    ['tile', '80px', '120px'],
    ['hero', '200px', '300px'],
    ['hero-compact', '150px', '225px'],
  ] as const)('%s wrapper is %s x %s', (size, width, height) => {
    render(<CardFace cardName={CardName.WarChief} size={size} />);

    expect(screen.getByTestId('card-face')).toHaveStyle({ width, height });
  });

  it('shows the layers placeholder and no image after the image errors', () => {
    render(<CardFace cardName={CardName.WarChief} size="tile" />);

    fireEvent.error(screen.getByTestId('card-face').querySelector('img')!);

    expect(screen.getByTestId('registry-icon-layers')).toBeInTheDocument();
    expect(screen.getByTestId('card-face').querySelector('img[src*="war-chief-card"]')).toBeNull();
  });

  it('restores the image when the card changes after a failure', () => {
    const { rerender } = render(<CardFace cardName={CardName.WarChief} size="tile" />);
    fireEvent.error(screen.getByTestId('card-face').querySelector('img')!);

    rerender(<CardFace cardName={CardName.Scout} size="tile" />);

    expect(screen.queryByTestId('registry-icon-layers')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-face').querySelector('img[src*="scout-card"]')).not.toBeNull();
  });
});
