import type { CardName, GameState, Monster, PlayerColor } from '@/lib/types';

export interface MonsterCombatDialogProps {
  gameState: GameState;
  onRoll: (payload: {
    monster: Monster;
    useDecideCard: boolean;
    decidedValue: number;
    useOvercomeCard: boolean;
    useWarChief: boolean;
  }) => void;
  onClose: () => void;
  // Kept for signature compatibility with GameDialogManager's call site; never invoked
  // internally today (legacy handleCancel calls only onClose) — do not wire it up, that
  // would be a behavior change, out of scope.
  onCancel: (payload?: { cardName?: CardName }) => void;
  isMyTurn?: boolean;
  localPlayerId?: number;
}

export type MonsterCombatCardSelection = 'none' | 'overcome' | 'warchief' | 'decide';

export interface MonsterAttackViewModel {
  title: string;
  attackerName: string;
  attackerColor: PlayerColor;
  attackerSprite: string;
  attackerPowerLabel: string;
  monster: { name: string; sprite: string; powerLabel: string } | null;
  canSelectCard: boolean;
  hasDecideCard: boolean;
  hasOvercomeCard: boolean;
  hasWarChiefCard: boolean;
  canAttack: boolean;
}

export interface MonsterResultsViewModel {
  isPlayerWinner: boolean;
  attacker: { name: string; color: PlayerColor; sprite: string; rolls: number[]; total: number; isWinner: boolean };
  monster: { name: string; sprite: string | null; rolls: number[]; total: number; isWinner: boolean } | null;
  outcomeText: string;         // `${attackerName} Defeated the Monster!` | 'The Monster prevailed!'
}

export interface MonsterSpectatorViewModel {
  attackerName: string;
  monsterLabel: string;        // `${monster.name} (Lvl ${monster.level})`, or 'the monster' if absent
}

export type MonsterCombatScreen =
  | { kind: 'attack'; data: MonsterAttackViewModel }
  | { kind: 'results'; data: MonsterResultsViewModel }
  | { kind: 'spectator'; data: MonsterSpectatorViewModel };

export interface MonsterCombatViewModel {
  isAttacker: boolean; // drives AlertDialog's onOpenChange, independent of which screen is shown
  screen: MonsterCombatScreen;
}

export interface MonsterAttackScreenProps {
  data: MonsterAttackViewModel;
  selectedCard: MonsterCombatCardSelection;
  decidedValue: number;
  onSelectCard: (card: MonsterCombatCardSelection) => void;
  onDecidedValueChange: (value: number) => void;
  onCancel: () => void;
  onAttack: () => void;
}

export interface MonsterResultsScreenProps {
  data: MonsterResultsViewModel;
  onContinue: () => void;
}

export interface MonsterSpectatorScreenProps {
  data: MonsterSpectatorViewModel;
}
