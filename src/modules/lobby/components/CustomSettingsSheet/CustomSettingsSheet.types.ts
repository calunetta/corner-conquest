import type { AbilityName, CardName, GameSettings } from '@/lib/types';

export type CustomSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: GameSettings) => void;
  initialSettings: GameSettings;
};

export type SliderFieldKey =
  | 'victoryPointGoal'
  | 'vpPerIslandDiscovery'
  | 'resourceDensity'
  | 'initialDeployCost'
  | 'deployCostIncrement'
  | 'upgradeCost'
  | 'abilityCost'
  | 'baseResourceAmount';

export type SliderFieldConfig = {
  key: SliderFieldKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

export type CustomSettingsSheetViewModel = {
  settings: GameSettings;
  onSliderChange: (key: SliderFieldKey, value: number) => void;
  onFogOfWarChange: (checked: boolean) => void;
  onCardToggle: (cardName: CardName, checked: boolean) => void;
  onAbilityToggle: (abilityName: AbilityName, checked: boolean) => void;
  onSave: () => void;
};
