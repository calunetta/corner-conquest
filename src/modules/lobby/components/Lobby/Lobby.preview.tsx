import type { ComponentPreview } from '@/testbed';
import { LobbyView } from './Lobby';
import { emptyLobby, loadingLobby, lobbyWithOpenGames } from './Lobby.fixtures';

export const lobbyPreview: ComponentPreview = {
  slug: 'lobby-main',
  title: 'Lobby',
  group: 'Lobby',
  states: [
    { name: 'Loading', render: () => <LobbyView {...loadingLobby} /> },
    { name: 'Empty', render: () => <LobbyView {...emptyLobby} /> },
    { name: 'With open games', render: () => <LobbyView {...lobbyWithOpenGames} /> },
  ],
};
