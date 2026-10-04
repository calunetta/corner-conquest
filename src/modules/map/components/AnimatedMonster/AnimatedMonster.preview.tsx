'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AnimatedMonster } from './AnimatedMonster';
import type { ComponentPreview } from '@/testbed/testbed.types';

// Sprite data matching src/modules/game-rules/monster-catalog.ts
const MONSTER_SPRITES = {
  lancer: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' },
  bear: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' },
  ogre: { idle: '/sprites/ogre_idle.gif', attack: '/sprites/ogre_attack.gif', death: '/sprites/death.gif' },
  minotaur: { idle: '/sprites/minotaur_idle.gif', attack: '/sprites/minotaur_attack.gif', death: '/sprites/death.gif' },
};

export const animatedMonsterPreview: ComponentPreview = {
  slug: 'animated-monster',
  title: 'Animated Monster',
  group: 'Game map',
  states: [
    {
      name: 'Lancer (Level 1)',
      render: () => (
        <TooltipProvider>
          <AnimatedMonster monster={{ name: 'Lancer', level: 1, sprite: MONSTER_SPRITES.lancer }} />
        </TooltipProvider>
      ),
    },
    {
      name: 'Bear (Level 2)',
      render: () => (
        <TooltipProvider>
          <AnimatedMonster monster={{ name: 'Bear', level: 2, sprite: MONSTER_SPRITES.bear }} />
        </TooltipProvider>
      ),
    },
    {
      name: 'Ogre (Level 3)',
      render: () => (
        <TooltipProvider>
          <AnimatedMonster monster={{ name: 'Ogre', level: 3, sprite: MONSTER_SPRITES.ogre }} />
        </TooltipProvider>
      ),
    },
    {
      name: 'Minotaur (Level 4)',
      render: () => (
        <TooltipProvider>
          <AnimatedMonster monster={{ name: 'Minotaur', level: 4, sprite: MONSTER_SPRITES.minotaur }} />
        </TooltipProvider>
      ),
    },
  ],
};
