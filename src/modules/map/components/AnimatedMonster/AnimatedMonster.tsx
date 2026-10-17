'use client';

import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimatedMonster } from './AnimatedMonster.hook';
import { styles } from './AnimatedMonster.styles';
import type { AnimatedMonsterProps } from './AnimatedMonster.types';
import { BOSS_MONSTER_SCALE, MONSTER_SIZE_PERCENT } from '../../island-tile-slots.types';

// Intrinsic size of the monster GIFs. Only the aspect and the layout hint matter; CSS sets the drawn size.
const SPRITE_NATURAL_PX = 256;

export function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const { spriteSrc, styleTransform } = useAnimatedMonster(monster);
  const sizePercent = monster.isBoss ? MONSTER_SIZE_PERCENT * BOSS_MONSTER_SCALE : MONSTER_SIZE_PERCENT;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={styles.wrapper}>
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={SPRITE_NATURAL_PX}
            height={SPRITE_NATURAL_PX}
            className={styles.image}
            style={{ transform: styleTransform, width: `${sizePercent}%`, height: 'auto', aspectRatio: '1 / 1' }}
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
