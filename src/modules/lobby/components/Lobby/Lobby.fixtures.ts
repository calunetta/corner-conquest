import { defaultGameSettings } from '@/modules/game-rules';
import { PlayerColor } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import type { LobbyViewModel } from './Lobby.types';

const noop = (): void => undefined;
const noopJoin = async (): Promise<boolean> => true;

/** Minimal, deterministic player shaped object; only the fields the lobby views read matter. */
const createLobbyPlayer = (playerId: string, name: string, color: PlayerColor): Player =>
  ({ playerId, name, color }) as Player;

/** Minimal, deterministic match shaped object for the open-games list. */
const createOpenGame = (id: string, name: string, maxPlayers: number, players: Player[]): GameState =>
  ({ id, name, maxPlayers, players, settings: defaultGameSettings }) as GameState;

const openGames: GameState[] = [
  createOpenGame('game-1', "Ada's Archipelago", 4, [
    createLobbyPlayer('p1', 'Ada', PlayerColor.Blue),
    createLobbyPlayer('p2', 'Bo', PlayerColor.Red),
  ]),
  createOpenGame('game-2', "Rex's Grand Conquest", 2, [createLobbyPlayer('p3', 'Rex', PlayerColor.Purple)]),
];

const baseViewModel: LobbyViewModel = {
  username: 'Ada',
  games: [],
  isGamesLoading: false,
  isCreateDialogOpen: false,
  onOpenCreateDialog: noop,
  onCreateDialogChange: noop,
  isJoiningGame: null,
  onJoinGame: noop,
  onCreateGame: noopJoin,
  onLogout: noop,
};

export const loadingLobby: LobbyViewModel = { ...baseViewModel, isGamesLoading: true };

export const emptyLobby: LobbyViewModel = { ...baseViewModel, games: [] };

export const lobbyWithOpenGames: LobbyViewModel = { ...baseViewModel, games: openGames };
