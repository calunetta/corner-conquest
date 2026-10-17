'use client';

import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimatedMonster } from './AnimatedMonster.hook';
import { styles } from './AnimatedMonster.styles';
import type { AnimatedMonsterProps } from './AnimatedMonster.types';
import { BOSS_MONSTER_SCALE, MONSTER_SPRITE_SIZE_PX } from '../../island-tile-slots.types';

export function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const { spriteSrc, styleTransform } = useAnimatedMonster(monster);
  const spriteSizePx = monster.isBoss ? Math.round(MONSTER_SPRITE_SIZE_PX * BOSS_MONSTER_SCALE) : MONSTER_SPRITE_SIZE_PX;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={styles.wrapper}>
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={spriteSizePx}
            height={spriteSizePx}
            className={styles.image}
            style={{ transform: styleTransform }}
            unoptimized
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{monster.name} - Lvl: {monster.level}</p>
      </TooltipContent>
    </Tooltip>
  );
}
