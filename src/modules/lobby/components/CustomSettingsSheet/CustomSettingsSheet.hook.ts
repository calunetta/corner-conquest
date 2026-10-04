import { useState } from 'react';
import type { AbilityName, CardName, GameSettings } from '@/lib/types';
import type {
  CustomSettingsSheetProps,
  CustomSettingsSheetViewModel,
  SliderFieldKey,
} from './CustomSettingsSheet.types';

type CustomSettingsSheetHookProps = Pick<CustomSettingsSheetProps, 'onSave' | 'initialSettings'>;

/** Local UI state only, seeded once from `initialSettings` (not re-synced on prop change). */
export function useCustomSettingsSheet({
  onSave,
  initialSettings,
}: CustomSettingsSheetHookProps): CustomSettingsSheetViewModel {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const handleSliderChange = (key: SliderFieldKey, value: number): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleFogOfWarChange = (checked: boolean): void => {
    setSettings((prev) => ({ ...prev, fogOfWar: checked }));
  };

  const handleCardToggle = (cardName: CardName, checked: boolean): void => {
    setSettings((prev) => ({
      ...prev,
      availableCards: checked
        ? [...prev.availableCards, cardName]
        : prev.availableCards.filter((card) => card !== cardName),
    }));
  };

  const handleAbilityToggle = (abilityName: AbilityName, checked: boolean): void => {
    setSettings((prev) => ({
      ...prev,
      availableAbilities: checked
        ? [...prev.availableAbilities, abilityName]
        : prev.availableAbilities.filter((ability) => ability !== abilityName),
    }));
  };

  return {
    settings,
    onSliderChange: handleSliderChange,
    onFogOfWarChange: handleFogOfWarChange,
    onCardToggle: handleCardToggle,
    onAbilityToggle: handleAbilityToggle,
    onSave: () => onSave(settings),
  };
}
