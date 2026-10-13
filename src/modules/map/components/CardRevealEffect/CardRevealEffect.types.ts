export interface CardRevealEffectProps {
  id: string;
  createdAt?: number;
  onHidden?: () => void;
}

export const REVEAL_ANIMATION_DURATION = 1400;

export const REVEAL_SPRITE_PATH = '/sprites/special_island_reveal.gif';

export interface CardRevealEffectState {
  isVisible: boolean;
  freshSpriteSrc: string;
}
