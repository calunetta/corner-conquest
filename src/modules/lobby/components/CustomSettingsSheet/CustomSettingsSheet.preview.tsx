import type { ComponentPreview } from '@/testbed';
import { CustomSettingsSheet } from './CustomSettingsSheet';
import { defaultGameSettings } from '@/modules/game-rules';

const noop = () => undefined;

export const customSettingsSheetPreview: ComponentPreview = {
  slug: 'lobby-settings-sheet',
  title: 'Custom settings sheet',
  group: 'Lobby',
  states: [
    {
      name: 'Default',
      render: () => (
        <CustomSettingsSheet
          open={true}
          onOpenChange={noop}
          onSave={noop}
          initialSettings={defaultGameSettings}
        />
      ),
    },
  ],
};
