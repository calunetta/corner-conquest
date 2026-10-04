import type { Monster } from '@/lib/types';

export interface AnimatedMonsterProps {
  monster: Monster;
}

export interface AnimatedMonsterState {
  spriteSrc: string;
  styleTransform: string;
}
