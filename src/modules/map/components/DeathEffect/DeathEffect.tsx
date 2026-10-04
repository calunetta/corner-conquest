'use client';

import Image from 'next/image';
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
        width={64}
        height={64}
        unoptimized
        priority
      />
    </div>
  );
}
