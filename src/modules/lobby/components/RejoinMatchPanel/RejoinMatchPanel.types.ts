import type { GameState } from '@/lib/types';

export type RejoinMatchPanelProps = {
  game: GameState;
  isReclaiming: boolean;
  onReclaim: () => void;
};
