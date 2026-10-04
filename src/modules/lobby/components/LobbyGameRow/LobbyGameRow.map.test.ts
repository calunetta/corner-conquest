import type { GameSettings } from '@/lib/types';
import { defaultGameSettings } from '@/modules/game-rules';
import { toSettingsSummaryRows } from './LobbyGameRow.map';

describe('toSettingsSummaryRows', () => {
  it('returns the same 7 rows, order and labels as the legacy SettingsDisplay', () => {
    const rows = toSettingsSummaryRows(defaultGameSettings);

    expect(rows.map((row) => row.label)).toEqual([
      'Victory Point Goal',
      'Fog of War',
      'Resource Density',
      'VP per Discovery',
      'Initial Deploy Cost',
      'Upgrade Cost',
      'Ability Cost',
    ]);
  });

  it('formats Fog of War as Enabled/Disabled', () => {
    const enabled = toSettingsSummaryRows({ ...defaultGameSettings, fogOfWar: true });
    const disabled = toSettingsSummaryRows({ ...defaultGameSettings, fogOfWar: false });

    expect(enabled.find((row) => row.label === 'Fog of War')?.value).toBe('Enabled');
    expect(disabled.find((row) => row.label === 'Fog of War')?.value).toBe('Disabled');
  });

  it.each([
    [0.6, '60%'],
    [0.456, '46%'], // rounds to the nearest percent
    [0.454, '45%'],
    [0, '0%'], // boundary: minimum density
    [1, '100%'], // boundary: maximum density
  ])('rounds resourceDensity %s to %s', (resourceDensity, expected) => {
    const rows = toSettingsSummaryRows({ ...defaultGameSettings, resourceDensity });

    expect(rows.find((row) => row.label === 'Resource Density')?.value).toBe(expected);
  });

  it('renders every numeric field as its exact String() value', () => {
    const settings: GameSettings = {
      ...defaultGameSettings,
      victoryPointGoal: 42,
      vpPerIslandDiscovery: 3,
      initialDeployCost: 7,
      upgradeCost: 11,
      abilityCost: 25,
    };

    const rows = toSettingsSummaryRows(settings);

    expect(rows.find((row) => row.label === 'Victory Point Goal')?.value).toBe('42');
    expect(rows.find((row) => row.label === 'VP per Discovery')?.value).toBe('3');
    expect(rows.find((row) => row.label === 'Initial Deploy Cost')?.value).toBe('7');
    expect(rows.find((row) => row.label === 'Upgrade Cost')?.value).toBe('11');
    expect(rows.find((row) => row.label === 'Ability Cost')?.value).toBe('25');
  });

  it('does not mutate the input settings object (purity)', () => {
    const settings = { ...defaultGameSettings };
    const settingsCopy = { ...settings };

    toSettingsSummaryRows(settings);

    expect(settings).toEqual(settingsCopy);
  });
});
