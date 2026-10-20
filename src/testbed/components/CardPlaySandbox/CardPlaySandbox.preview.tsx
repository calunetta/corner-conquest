import type { ComponentPreview } from '@/testbed';
import {
  WithEventLogBoard,
  emptyEventLogGameState,
} from '@/modules/hud/components/ActionsPanel/MobileEventLogSheet.preview';
import { CardPlaySandbox } from './CardPlaySandbox';

export const cardPlaySandboxPreview: ComponentPreview = {
  slug: 'testbed-card-play-sandbox',
  title: 'Card play sandbox',
  group: 'Cards',
  states: [
    {
      name: 'Desktop',
      render: () => (
        <div className="relative min-h-[600px] p-4">
          <CardPlaySandbox variant="desktop" />
        </div>
      ),
    },
    {
      name: 'Mobile (narrow the window below 768px for the compact card)',
      render: () => (
        <WithEventLogBoard gameState={emptyEventLogGameState}>
          <div className="relative min-h-[600px] p-4">
            <CardPlaySandbox variant="mobile" />
          </div>
        </WithEventLogBoard>
      ),
    },
  ],
};
