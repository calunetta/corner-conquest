import type { GameSettings, GameState, PlayerColor } from '@/lib/types';
import type { LinkGoogleAccountButtonViewProps } from '@/modules/session';

export type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

export type LobbyViewModel = {
  username: string | null;
  isGuest: boolean;
  linkGoogleAccountButton: LinkGoogleAccountButtonViewProps;
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
  vacantMatch: GameState | null;
  isReclaiming: boolean;
  onReclaimSeat: () => Promise<void>;
};
