import type { ComponentPreview } from '@/testbed';
import { GameLogView } from './GameLog';
import {
  declutterOffLog,
  cardUseLog,
  declutterOnLog,
  emptyLog,
  legacyOnlyLog,
  longSessionLog,
  mixedTwoTurnsLog,
  preGameLog,
  redactedCardUseLog,
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
    { name: 'Card uses', render: () => <GameLogView {...cardUseLog} /> },
    { name: 'Card use, redacted', render: () => <GameLogView {...redactedCardUseLog} /> },
    {
      // The sheet variant only scrolls inside a bounded parent; the height mirrors the mobile sheet's h-[75vh].
      name: 'Sheet variant',
      render: () => (
        <div className="flex h-[75vh] max-h-[85vh] flex-col">
          <GameLogView {...longSessionLog} variant="sheet" />
        </div>
      ),
    },
  ],
};
