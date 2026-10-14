'use client';

import Image from 'next/image';
import { MONSTER_SPRITE_SIZE_PX } from '../../island-tile-slots.types';
import { useDeathEffect } from './DeathEffect.hook';
import { styles } from './DeathEffect.styles';
import type { DeathEffectProps } from './DeathEffect.types';

export function DeathEffect(props: DeathEffectProps) {
  const { isVisible, freshSpriteSrc } = useDeathEffect(props);

  if (!isVisible) return null;

  return (
    <div className={styles.wrapper}>
      <Image
        key={props.id}
        src={freshSpriteSrc}
        alt="Death animation"
        width={MONSTER_SPRITE_SIZE_PX}
        height={MONSTER_SPRITE_SIZE_PX}
        unoptimized
        priority
      />
    </div>
  );
}
