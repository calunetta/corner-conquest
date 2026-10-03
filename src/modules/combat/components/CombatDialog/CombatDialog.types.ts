import type { GameState, PlayerColor } from '@/lib/types';

export interface CombatDialogProps {
  gameState: GameState;
  onRoll: (payload: { useWarChief: boolean; useOvercome: boolean }) => void;
  onClose: () => void;
  isMyTurn: boolean;
  localPlayerId: number;
}

export type CombatCardSelection = 'none' | 'overcome' | 'warchief';

export interface CombatantViewModel {
  name: string;
  color: PlayerColor;
  sprite: string;       // attack or death sprite, already resolved
  isWinner: boolean;     // only meaningful when isCombatOver
  rolls: number[];
  total: number;
}

export interface CombatDialogViewModel {
  phase: 'rolling' | 'results';
  isCombatOver: boolean;
  attacker: CombatantViewModel;
  defender: CombatantViewModel;
  winner: { name: string; color: PlayerColor } | null; // null = draw; only read when isCombatOver
  canPerformAction: boolean;   // isMyTurn && isAttacker
  canSelectCard: boolean;      // phase === 'rolling' && canPerformAction && canUseCard && (hasOvercomeCard || hasWarChiefCard)
  hasOvercomeCard: boolean;
  hasWarChiefCard: boolean;
}
