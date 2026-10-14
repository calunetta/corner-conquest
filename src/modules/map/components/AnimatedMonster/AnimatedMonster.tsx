'use client';

import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimatedMonster } from './AnimatedMonster.hook';
import { styles } from './AnimatedMonster.styles';
import type { AnimatedMonsterProps } from './AnimatedMonster.types';
import { MONSTER_SPRITE_SIZE_PX } from '../../island-tile-slots.types';

export function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const { spriteSrc, styleTransform } = useAnimatedMonster(monster);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={styles.wrapper}>
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={MONSTER_SPRITE_SIZE_PX}
            height={MONSTER_SPRITE_SIZE_PX}
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
