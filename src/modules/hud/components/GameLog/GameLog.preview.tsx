import type { ComponentPreview } from '@/testbed';
import { GameLogView } from './GameLog';
import { emptyLog, multiEntryLog } from './GameLog.fixtures';

export const gameLogPreview: ComponentPreview = {
  slug: 'hud-game-log',
  title: 'Game log',
  group: 'HUD',
  states: [
    { name: 'Empty', render: () => <GameLogView {...emptyLog} /> },
    { name: 'With entries', render: () => <GameLogView {...multiEntryLog} /> },
  ],
};
