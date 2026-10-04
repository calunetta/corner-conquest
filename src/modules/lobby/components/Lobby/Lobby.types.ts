import type { GameSettings, GameState, PlayerColor } from '@/lib/types';

export type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

export type LobbyViewModel = {
  username: string | null;
  games: GameState[];
  isGamesLoading: boolean;
  isCreateDialogOpen: boolean;
  onOpenCreateDialog: () => void;
  onCreateDialogChange: (open: boolean) => void;
  isJoiningGame: string | null;
  onJoinGame: (gameId: string) => void;
  onCreateGame: (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor,
    numBots: number,
    debugMode: boolean,
    settings: GameSettings,
  ) => Promise<boolean>;
  onLogout: () => void;
};
