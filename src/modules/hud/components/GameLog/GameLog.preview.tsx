import type { ComponentPreview } from '@/testbed';
import { GameLogView } from './GameLog';
import {
  declutterOffLog,
  declutterOnLog,
  emptyLog,
  legacyOnlyLog,
  mixedTwoTurnsLog,
  preGameLog,
  withMilestoneLog,
} from './GameLog.fixtures';

export const gameLogPreview: ComponentPreview = {
  slug: 'hud-game-log',
  title: 'Game log',
  group: 'HUD',
  states: [
    { name: 'Empty', render: () => <GameLogView {...emptyLog} /> },
    { name: 'Legacy only', render: () => <GameLogView {...legacyOnlyLog} /> },
    { name: 'Mixed, two turns', render: () => <GameLogView {...mixedTwoTurnsLog} /> },
    { name: 'With milestone', render: () => <GameLogView {...withMilestoneLog} /> },
    { name: 'Declutter off (default)', render: () => <GameLogView {...declutterOffLog} /> },
    { name: 'Declutter on', render: () => <GameLogView {...declutterOnLog} /> },
    { name: 'Pre-game (turn 0)', render: () => <GameLogView {...preGameLog} /> },
  ],
};
