import { defaultGameSettings } from '@/modules/game-rules';
import { PlayerColor } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import type { LinkGoogleAccountButtonViewProps } from '@/modules/session';
import type { AvatarPickerButtonViewModel } from '@/modules/avatars';
import type { LobbyViewModel } from './Lobby.types';

const noop = (): void => undefined;
const noopJoin = async (): Promise<boolean> => true;
const noopReclaim = async (): Promise<void> => undefined;

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

const idleLinkGoogleAccountButton: LinkGoogleAccountButtonViewProps = {
  isLinking: false,
  errorDialog: { open: false, title: '', description: '' },
  onLink: noop,
  onErrorDialogOpenChange: noop,
};

const noAvatarPicker: AvatarPickerButtonViewModel = {
  currentAvatarId: null,
  isDialogOpen: false,
  onOpenChange: noop,
  cells: [],
  isSaving: false,
  saveError: null,
  onSelect: noop,
};

const baseViewModel: LobbyViewModel = {
  username: 'Ada',
  isGuest: false,
  linkGoogleAccountButton: idleLinkGoogleAccountButton,
  avatarPicker: noAvatarPicker,
  games: [],
  isGamesLoading: false,
  isCreateDialogOpen: false,
  onOpenCreateDialog: noop,
  onCreateDialogChange: noop,
  isJoiningGame: null,
  onJoinGame: noop,
  onCreateGame: noopJoin,
  onLogout: noop,
  vacantMatch: null,
  isReclaiming: false,
  onReclaimSeat: noopReclaim,
};

export const loadingLobby: LobbyViewModel = { ...baseViewModel, isGamesLoading: true };

export const emptyLobby: LobbyViewModel = { ...baseViewModel, games: [] };

export const lobbyWithOpenGames: LobbyViewModel = { ...baseViewModel, games: openGames };

/** A guest's anonymous session: the header offers the Link Google Account button. */
export const guestLobby: LobbyViewModel = { ...lobbyWithOpenGames, isGuest: true };

const vacantGame: GameState = createOpenGame('game-vacant', 'Hollow Shoals', 2, [
  createLobbyPlayer('p4', 'Ada', PlayerColor.Blue),
  createLobbyPlayer('p5', 'Bo', PlayerColor.Red),
]);

/** The player's seat is still held in a match they can rejoin, so the general lobby is hidden. */
export const lobbyWithVacantSeat: LobbyViewModel = {
  ...lobbyWithOpenGames,
  isCreateDialogOpen: true,
  vacantMatch: vacantGame,
};
