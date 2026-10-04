'use client';

import { DeathEffect } from './DeathEffect';
import { DEATH_ANIMATION_DURATION } from './DeathEffect.types';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const deathEffectPreview: ComponentPreview = {
  slug: 'death-effect',
  title: 'Death Effect',
  group: 'Game map',
  states: [
    {
      name: 'Fresh animation',
      render: () => <DeathEffect sprite="/sprites/death.gif" id="death-1" createdAt={Date.now()} />,
    },
    {
      name: 'Halfway through animation',
      render: () => (
        <DeathEffect
          sprite="/sprites/death.gif"
          id="death-2"
          createdAt={Date.now() - DEATH_ANIMATION_DURATION / 2}
        />
      ),
    },
    {
      name: 'Near end of animation',
      render: () => (
        <DeathEffect
          sprite="/sprites/death.gif"
          id="death-3"
          createdAt={Date.now() - (DEATH_ANIMATION_DURATION * 0.8)}
        />
      ),
    },
    {
      name: 'No creation time (instant visible)',
      render: () => <DeathEffect sprite="/sprites/death.gif" id="death-4" />,
    },
  ],
};
