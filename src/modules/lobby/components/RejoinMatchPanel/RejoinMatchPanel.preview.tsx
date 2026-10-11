import type { ComponentPreview } from '@/testbed';
import { RejoinMatchPanel } from './RejoinMatchPanel';
import { idleRejoinPanel, reclaimingRejoinPanel } from './RejoinMatchPanel.fixtures';

export const rejoinMatchPanelPreview: ComponentPreview = {
  slug: 'lobby-rejoin-match-panel',
  title: 'Rejoin match panel',
  group: 'Lobby',
  states: [
    { name: 'Default', render: () => <RejoinMatchPanel {...idleRejoinPanel} /> },
    { name: 'Reclaiming (disabled)', render: () => <RejoinMatchPanel {...reclaimingRejoinPanel} /> },
  ],
};
