import type { Island, PlayerColor } from '@/lib/types';

export const BOAT_CORNER_POSITIONS = [
  { id: 'br', style: { bottom: '2px', right: '2px' } },
  { id: 'tr', style: { top: '2px', right: '2px' } },
  { id: 'tl', style: { top: '2px', left: '2px' } },
  { id: 'bl', style: { bottom: '2px', left: '2px' } },
];

export interface TileBoatsProps {
  island: Island;
}

export interface BoatEntryViewModel {
  key: string;
  color: PlayerColor;
  cornerStyle: Record<string, string>;
  showIdleCollector: boolean;
  idleCollectorSprite?: string;
}
