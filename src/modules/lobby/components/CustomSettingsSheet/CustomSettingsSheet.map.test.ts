import { GENERAL_SLIDERS, COST_SLIDERS, ALL_ABILITIES, toSliderDisplayValue } from './CustomSettingsSheet.map';
import { AbilityName } from '@/lib/types';

describe('toSliderDisplayValue', () => {
  it.each([
    [0.45, '45%'],
    [0.6, '60%'],
    [0, '0%'], // boundary: minimum density
    [1, '100%'], // boundary: maximum density
    [0.454, '45%'], // rounds to the nearest percent
  ])('resourceDensity %s formats as %s', (value, expected) => {
    expect(toSliderDisplayValue('resourceDensity', value)).toBe(expected);
  });

  it.each([
    ['victoryPointGoal', 50, '50'],
    ['initialDeployCost', 6, '6'],
    ['abilityCost', 15, '15'],
    ['baseResourceAmount', 0, '0'], // boundary: zero is a valid raw number
  ] as const)('%s returns the raw String(value): %s -> %s', (key, value, expected) => {
    expect(toSliderDisplayValue(key, value)).toBe(expected);
  });
});

describe('GENERAL_SLIDERS / COST_SLIDERS', () => {
  it('GENERAL_SLIDERS has the 3 general fields with the legacy min/max/step', () => {
    expect(GENERAL_SLIDERS).toEqual([
      { key: 'victoryPointGoal', label: 'Victory Points to Win', min: 10, max: 100, step: 5 },
      { key: 'vpPerIslandDiscovery', label: 'VP per Island Discovery', min: 0, max: 5, step: 1 },
      { key: 'resourceDensity', label: 'Resource vs. Monster Density', min: 0.1, max: 0.9, step: 0.05 },
    ]);
  });

  it('COST_SLIDERS has the 5 cost fields with the legacy min/max/step', () => {
    expect(COST_SLIDERS).toEqual([
      { key: 'initialDeployCost', label: 'Initial Deploy Cost (Food)', min: 1, max: 10, step: 1 },
      { key: 'deployCostIncrement', label: 'Deploy Cost Increment', min: 0, max: 5, step: 1 },
      { key: 'upgradeCost', label: 'Upgrade Cost (Iron)', min: 1, max: 15, step: 1 },
      { key: 'abilityCost', label: 'Ability Cost (Gems)', min: 5, max: 50, step: 5 },
      { key: 'baseResourceAmount', label: 'Resources per Spot', min: 1, max: 5, step: 1 },
    ]);
  });
});

describe('ALL_ABILITIES', () => {
  it('is [Explorer, Collector], moved verbatim from the legacy file', () => {
    expect(ALL_ABILITIES).toEqual([AbilityName.Explorer, AbilityName.Collector]);
  });
});
