import { useState } from 'react';
import type { CardName } from '@/lib/types';
import { CARD_ART } from '../../card-art';
import type { CardFaceViewModel } from './CardFace.types';

/** Tracks the failed `src` instead of a boolean, so switching card resets the failure without an effect. */
export function useCardFace(cardName: CardName): CardFaceViewModel {
  const src = CARD_ART[cardName].card;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return { src, hasFailed: failedSrc === src, onError: () => setFailedSrc(src) };
}
