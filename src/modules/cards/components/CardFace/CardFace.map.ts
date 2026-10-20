import type { CardFaceSize } from './CardFace.types';

const CARD_FACE_DIMENSIONS: Record<CardFaceSize, { width: number; height: number }> = {
  tile: { width: 80, height: 120 },
  hero: { width: 200, height: 300 },
  'hero-compact': { width: 150, height: 225 },
};

/** Every size keeps the 2:3 portrait ratio of the card art. */
export function toCardFaceDimensions(size: CardFaceSize): { width: number; height: number } {
  return CARD_FACE_DIMENSIONS[size];
}
