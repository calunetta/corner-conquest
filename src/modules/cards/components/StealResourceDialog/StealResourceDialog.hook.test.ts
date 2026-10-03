import { renderHook, act } from '@testing-library/react';
import { PlayerColor, ResourceType } from '@/lib/types';
import type { Player } from '@/lib/types';
import { useStealResourceDialog } from './StealResourceDialog.hook';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
    ...overrides,
  }) as Player;

describe('useStealResourceDialog', () => {
  const players = [
    buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', resources: { food: 3, wood: 2, gold: 5 } }),
    buildPlayer({ id: 1, playerId: 'p1', name: 'Bo', resources: { food: 0, wood: 4, gold: 0 } }),
  ];

  it('starts on the player-selection step', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    expect(result.current.step.kind).toBe('player');
  });

  it('onSelectPlayer moves to the resource step for that player and resets any prior resource selection', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSelectPlayer(1));

    expect(result.current.step).toEqual(
      expect.objectContaining({ kind: 'resource', playerId: 1, playerName: 'Bo', canConfirm: false }),
    );
  });

  it('onSelectResource sets canConfirm true once a resource is chosen', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSelectPlayer(0));
    act(() => result.current.onSelectResource(ResourceType.Gold));

    expect(result.current.step).toEqual(
      expect.objectContaining({ kind: 'resource', canConfirm: true }),
    );
  });

  it('onBack returns to the player-selection step', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSelectPlayer(0));
    act(() => result.current.onSelectResource(ResourceType.Gold));
    act(() => result.current.onBack());

    expect(result.current.step.kind).toBe('player');
  });

  it('onSteal calls props.onSteal with the selected player id and resource', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSelectPlayer(1));
    act(() => result.current.onSelectResource(ResourceType.Wood));
    act(() => result.current.onSteal());

    expect(onSteal).toHaveBeenCalledWith(1, ResourceType.Wood);
    expect(onSteal).toHaveBeenCalledTimes(1);
  });

  it('onSteal is a no-op when no resource has been selected yet', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSelectPlayer(0));
    act(() => result.current.onSteal());

    expect(onSteal).not.toHaveBeenCalled();
  });

  it('onSteal is a no-op when no player has been selected (still on the player step)', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    act(() => result.current.onSteal());

    expect(onSteal).not.toHaveBeenCalled();
  });

  it('forwards onClose unchanged', () => {
    const onSteal = jest.fn();
    const onClose = jest.fn();

    const { result } = renderHook(() => useStealResourceDialog({ players, onSteal, onClose }));

    result.current.onClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
