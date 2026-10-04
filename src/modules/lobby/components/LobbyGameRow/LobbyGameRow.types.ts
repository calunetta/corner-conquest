import type { GameState } from '@/lib/types';

export type LobbyGameRowProps = {
  game: GameState;
  isJoining: boolean;
  isAnyJoining: boolean;
  onJoin: (gameId: string) => void;
};

export type SettingsSummaryRow = {
  label: string;
  value: string;
};
