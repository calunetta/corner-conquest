import type { CSSProperties } from 'react';

export interface CloudViewModel {
  id: string;
  /** % from left edge of the viewport, 0-100 */
  left: number;
  /** % from top edge of the viewport, 0-100 */
  top: number;
  /** full spawn->drift->fade lifetime, in seconds */
  durationSeconds: number;
  /** 0-1, final drifted opacity/scale multiplier for depth */
  scale: number;
  /** Public path of one of the real cloud sprites. */
  sprite: string;
}

export interface LobbyBackgroundViewModel {
  clouds: CloudViewModel[];
}

/** Wander state of the monster island's sprite, advanced by useLobbyMonster. */
export interface MonsterWanderState {
  isAttacking: boolean;
  isFlipped: boolean;
  /** Last idle horizontal offset, in % of the sprite's own width. */
  offsetPercent: number;
}

export interface LobbyMonsterViewModel {
  /** Public path of the idle or attack sprite. */
  spriteSrc: string;
  style: CSSProperties;
}
