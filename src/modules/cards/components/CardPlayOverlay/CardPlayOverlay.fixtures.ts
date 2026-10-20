import { CardName } from '@/lib/types';
import type { CardPlay } from './CardPlayOverlay.types';

export const warChiefPlay: CardPlay = { cardName: CardName.WarChief, playId: 1 };
export const extraMovePlay: CardPlay = { cardName: CardName.ExtraMove, playId: 2 };
export const foundExtraMovePlay: CardPlay = { cardName: CardName.ExtraMove, playId: 3, isFound: true };
