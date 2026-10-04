'use client';

import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimatedMonster } from './AnimatedMonster.hook';
import { styles } from './AnimatedMonster.styles';
import type { AnimatedMonsterProps } from './AnimatedMonster.types';

export function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const { spriteSrc, styleTransform } = useAnimatedMonster(monster);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={styles.wrapper}>
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={64}
            height={64}
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
