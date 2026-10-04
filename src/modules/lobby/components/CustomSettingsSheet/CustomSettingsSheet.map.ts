import { AbilityName } from '@/lib/types';
import type { SliderFieldConfig, SliderFieldKey } from './CustomSettingsSheet.types';

const PERCENT_MULTIPLIER = 100;

export const GENERAL_SLIDERS: SliderFieldConfig[] = [
  { key: 'victoryPointGoal', label: 'Victory Points to Win', min: 10, max: 100, step: 5 },
  { key: 'vpPerIslandDiscovery', label: 'VP per Island Discovery', min: 0, max: 5, step: 1 },
  { key: 'resourceDensity', label: 'Resource vs. Monster Density', min: 0.1, max: 0.9, step: 0.05 },
];

export const COST_SLIDERS: SliderFieldConfig[] = [
  { key: 'initialDeployCost', label: 'Initial Deploy Cost (Food)', min: 1, max: 10, step: 1 },
  { key: 'deployCostIncrement', label: 'Deploy Cost Increment', min: 0, max: 5, step: 1 },
  { key: 'upgradeCost', label: 'Upgrade Cost (Iron)', min: 1, max: 15, step: 1 },
  { key: 'abilityCost', label: 'Ability Cost (Gems)', min: 5, max: 50, step: 5 },
  { key: 'baseResourceAmount', label: 'Resources per Spot', min: 1, max: 5, step: 1 },
];

/** Moved verbatim from the legacy CustomSettingsSheet.tsx. */
export const ALL_ABILITIES: AbilityName[] = [AbilityName.Explorer, AbilityName.Collector];

/** Resource density is a 0-1 fraction shown as a percentage; every other slider shows its raw number. */
export function toSliderDisplayValue(key: SliderFieldKey, value: number): string {
  if (key === 'resourceDensity') {
    return `${Math.round(value * PERCENT_MULTIPLIER)}%`;
  }
  return String(value);
}
