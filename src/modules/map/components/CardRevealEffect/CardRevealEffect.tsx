'use client';

import Image from 'next/image';
import { useCardRevealEffect } from './CardRevealEffect.hook';
import { styles } from './CardRevealEffect.styles';
import type { CardRevealEffectProps } from './CardRevealEffect.types';

export function CardRevealEffect(props: CardRevealEffectProps) {
  const { isVisible, freshSpriteSrc } = useCardRevealEffect(props);

  if (!isVisible) return null;

  return (
    <div className={styles.wrapper}>
      <Image
        key={props.id}
        src={freshSpriteSrc}
        alt="Card revealed"
        fill
        className={styles.image}
        unoptimized
        priority
      />
    </div>
  );
}
