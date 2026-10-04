import { renderHook, act } from '@testing-library/react';
import { AbilityName, CardName } from '@/lib/types';
import { defaultGameSettings } from '@/modules/game-rules';
import { useCustomSettingsSheet } from './CustomSettingsSheet.hook';

describe('useCustomSettingsSheet', () => {
  it('seeds settings from initialSettings', () => {
    const { result } = renderHook(() =>
      useCustomSettingsSheet({ onSave: jest.fn(), initialSettings: defaultGameSettings }),
    );

    expect(result.current.settings).toEqual(defaultGameSettings);
  });

  it('onSliderChange updates only the targeted key', () => {
    const { result } = renderHook(() =>
      useCustomSettingsSheet({ onSave: jest.fn(), initialSettings: defaultGameSettings }),
    );

    act(() => {
      result.current.onSliderChange('victoryPointGoal', 50);
    });

    expect(result.current.settings.victoryPointGoal).toBe(50);
    expect(result.current.settings.upgradeCost).toBe(defaultGameSettings.upgradeCost);
  });

  it('onFogOfWarChange toggles fogOfWar', () => {
    const { result } = renderHook(() =>
      useCustomSettingsSheet({ onSave: jest.fn(), initialSettings: defaultGameSettings }),
    );

    act(() => {
      result.current.onFogOfWarChange(false);
    });

    expect(result.current.settings.fogOfWar).toBe(false);
  });

  it('onCardToggle(true) adds the card', () => {
    const initialSettings = { ...defaultGameSettings, availableCards: [] };
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave: jest.fn(), initialSettings }));

    act(() => {
      result.current.onCardToggle(CardName.Scout, true);
    });

    expect(result.current.settings.availableCards).toEqual([CardName.Scout]);
  });

  it('onCardToggle(false) removes the card', () => {
    const initialSettings = { ...defaultGameSettings, availableCards: [CardName.Scout] };
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave: jest.fn(), initialSettings }));

    act(() => {
      result.current.onCardToggle(CardName.Scout, false);
    });

    expect(result.current.settings.availableCards).toEqual([]);
  });

  it('onCardToggle(false) on a card not in the list leaves the list unchanged (invalid input)', () => {
    const initialSettings = { ...defaultGameSettings, availableCards: [CardName.Scout] };
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave: jest.fn(), initialSettings }));

    act(() => {
      result.current.onCardToggle(CardName.Sabotage, false);
    });

    expect(result.current.settings.availableCards).toEqual([CardName.Scout]);
  });

  it('onAbilityToggle(true) adds the ability', () => {
    const initialSettings = { ...defaultGameSettings, availableAbilities: [] };
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave: jest.fn(), initialSettings }));

    act(() => {
      result.current.onAbilityToggle(AbilityName.Explorer, true);
    });

    expect(result.current.settings.availableAbilities).toEqual([AbilityName.Explorer]);
  });

  it('onAbilityToggle(false) removes the ability', () => {
    const initialSettings = { ...defaultGameSettings, availableAbilities: [AbilityName.Explorer] };
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave: jest.fn(), initialSettings }));

    act(() => {
      result.current.onAbilityToggle(AbilityName.Explorer, false);
    });

    expect(result.current.settings.availableAbilities).toEqual([]);
  });

  it('onSave calls the prop with the current (edited) settings, not initialSettings', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useCustomSettingsSheet({ onSave, initialSettings: defaultGameSettings }));

    act(() => {
      result.current.onSliderChange('victoryPointGoal', 77);
    });
    act(() => {
      result.current.onSave();
    });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ victoryPointGoal: 77 }));
    expect(onSave).not.toHaveBeenCalledWith(defaultGameSettings);
  });

  it('does not re-sync settings when initialSettings prop changes after mount (seeded once)', () => {
    const { result, rerender } = renderHook(
      (props: { initialSettings: typeof defaultGameSettings }) =>
        useCustomSettingsSheet({ onSave: jest.fn(), initialSettings: props.initialSettings }),
      { initialProps: { initialSettings: defaultGameSettings } },
    );

    rerender({ initialSettings: { ...defaultGameSettings, victoryPointGoal: 999 } });

    expect(result.current.settings.victoryPointGoal).toBe(defaultGameSettings.victoryPointGoal);
  });
});
