'use client';

import { CardRevealEffect } from './CardRevealEffect';
import { REVEAL_ANIMATION_DURATION } from './CardRevealEffect.types';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const cardRevealEffectPreview: ComponentPreview = {
  slug: 'card-reveal-effect',
  title: 'Card Reveal Effect',
  group: 'Game map',
  states: [
    {
      name: 'Fresh animation',
      render: () => <CardRevealEffect id="card-1" createdAt={Date.now()} />,
    },
    {
      name: 'Halfway through animation',
      render: () => (
        <CardRevealEffect id="card-2" createdAt={Date.now() - REVEAL_ANIMATION_DURATION / 2} />
      ),
    },
    {
      name: 'Near end of animation',
      render: () => (
        <CardRevealEffect id="card-3" createdAt={Date.now() - REVEAL_ANIMATION_DURATION * 0.8} />
      ),
    },
    {
      name: 'No creation time (instant visible)',
      render: () => <CardRevealEffect id="card-4" />,
    },
  ],
};
