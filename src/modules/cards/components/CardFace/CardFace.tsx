'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RegistryIcon } from '@/modules/shared';
import { useCardFace } from './CardFace.hook';
import { toCardFaceDimensions } from './CardFace.map';
import { styles } from './CardFace.styles';
import type { CardFaceProps } from './CardFace.types';

export function CardFace({ cardName, size, alt, className }: CardFaceProps) {
  const { src, hasFailed, onError } = useCardFace(cardName);
  const { width, height } = toCardFaceDimensions(size);

  return (
    <div
      data-testid="card-face"
      data-card={cardName}
      style={{ width, height }}
      className={cn(styles.root({ size }), className)}
    >
      {hasFailed ? (
        <div className={styles.placeholder}>
          <RegistryIcon id="layers" className={styles.placeholderIcon} />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt ?? ''}
          width={width}
          height={height}
          className={styles.image}
          onError={onError}
        />
      )}
    </div>
  );
}
