import { defaultGameSettings } from '@/modules/game-rules';
import type { CustomSettingsSheetProps } from './CustomSettingsSheet.types';

export const defaultCustomSettingsSheetProps: CustomSettingsSheetProps = {
  open: true,
  onOpenChange: () => undefined,
  onSave: () => undefined,
  initialSettings: defaultGameSettings,
};
