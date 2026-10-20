'use client';

import { useEffect, useRef } from 'react';
import type { ComponentPreview } from '@/testbed';
import { CardName } from '@/lib/types';
import { CardFace } from './CardFace';
import type { CardFaceSize } from './CardFace.types';

const ALL_CARDS = Object.values(CardName);

function CardGrid({ size }: { size: CardFaceSize }) {
  return (
    <div className="flex flex-wrap gap-3 p-4">
      {ALL_CARDS.map((cardName) => (
        <div key={cardName} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <CardFace cardName={cardName} size={size} alt={cardName} />
          <span>{cardName}</span>
        </div>
      ))}
    </div>
  );
}

/** Fires the image error event after mount so the placeholder shows without an invented asset path. */
function FailingCardFace() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.querySelector('img')?.dispatchEvent(new Event('error'));
  }, []);

  return (
    <div ref={containerRef} className="p-4">
      <CardFace cardName={ALL_CARDS[0]} size="hero" alt="Image failure" />
    </div>
  );
}

export const cardFacePreview: ComponentPreview = {
  slug: 'cards-card-face',
  title: 'Card face',
  group: 'Cards',
  states: [
    { name: 'All cards, tile', render: () => <CardGrid size="tile" /> },
    { name: 'All cards, hero', render: () => <CardGrid size="hero" /> },
    { name: 'All cards, hero-compact', render: () => <CardGrid size="hero-compact" /> },
    { name: 'Image failure', render: () => <FailingCardFace /> },
  ],
};
