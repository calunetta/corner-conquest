export interface DeathEffectProps {
  sprite: string;
  id: string;
  createdAt?: number;
}

export const DEATH_ANIMATION_DURATION = 1200;

export interface DeathEffectState {
  isVisible: boolean;
  freshSpriteSrc: string;
}
