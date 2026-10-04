import type { ComponentPreview } from '@/testbed';
import { LobbyBackground } from './LobbyBackground';

export const lobbyBackgroundPreview: ComponentPreview = {
  slug: 'lobby-background',
  title: 'Lobby Background',
  group: 'Lobby',
  states: [{ name: 'Default', render: () => <LobbyBackground /> }],
};
