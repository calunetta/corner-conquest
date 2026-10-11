import type { GameState } from '@/lib/types';
import type { RejoinMatchPanelProps } from './RejoinMatchPanel.types';

/** Minimal match shaped object; the panel only reads `name`. */
const vacantGame = { id: 'game-vacant', name: 'Hollow Shoals' } as GameState;

export const idleRejoinPanel: RejoinMatchPanelProps = {
  game: vacantGame,
  isReclaiming: false,
  onReclaim: () => undefined,
};

export const reclaimingRejoinPanel: RejoinMatchPanelProps = { ...idleRejoinPanel, isReclaiming: true };
