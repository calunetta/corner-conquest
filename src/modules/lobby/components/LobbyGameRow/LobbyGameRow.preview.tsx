import type { ComponentPreview } from '@/testbed';
import { LobbyGameRow } from './LobbyGameRow';
import { openGame, fullGame, customGoalGame } from './LobbyGameRow.fixtures';

export const lobbyGameRowPreview: ComponentPreview = {
  slug: 'lobby-game-row',
  title: 'Lobby game row',
  group: 'Lobby',
  states: [
    { name: 'Open room', render: () => <LobbyGameRow game={openGame} isJoining={false} isAnyJoining={false} onJoin={() => {}} /> },
    { name: 'Joining', render: () => <LobbyGameRow game={openGame} isJoining={true} isAnyJoining={true} onJoin={() => {}} /> },
    { name: 'Full room', render: () => <LobbyGameRow game={fullGame} isJoining={false} isAnyJoining={false} onJoin={() => {}} /> },
    { name: 'Custom VP goal (45 VP)', render: () => <LobbyGameRow game={customGoalGame} isJoining={false} isAnyJoining={false} onJoin={() => {}} /> },
  ],
};
