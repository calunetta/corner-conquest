import type { NumberRange } from './LobbyBackground.layout';

export function randomWithin(range: NumberRange): number {
  return range.min + Math.random() * (range.max - range.min);
}
