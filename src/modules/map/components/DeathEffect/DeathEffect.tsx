'use client';

import Image from 'next/image';
import { MONSTER_SIZE_PERCENT } from '../../island-tile-slots.types';
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
        width={256}
        height={256}
        style={{ width: `${MONSTER_SIZE_PERCENT}%`, height: 'auto', aspectRatio: '1 / 1' }}
        unoptimized
        priority
      />
    </div>
  );
}
