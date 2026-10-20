import type { CardName } from '@/lib/types';

export type CardFaceSize = 'tile' | 'hero' | 'hero-compact';

export interface CardFaceProps {
  cardName: CardName;
  size: CardFaceSize;
  /** Default "" (decorative: a visible name is always adjacent). Pass text for standalone use. */
  alt?: string;
  className?: string;
}

export interface CardFaceViewModel {
  /** `CARD_ART[cardName].card` */
  src: string;
  /** true after the image fired onError for the current `src` */
  hasFailed: boolean;
  onError: () => void;
}
