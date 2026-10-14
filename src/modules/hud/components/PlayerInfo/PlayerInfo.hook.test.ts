import { act, renderHook } from '@testing-library/react';
import { useGameBoard } from '@/features/game/context/GameBoardContext';
import type { GameState, LogEntry, Player, StructuredLogEntry } from '@/lib/types';
import { CardName, ResourceType } from '@/lib/types';
import { RESOURCE_GAIN_ANIMATION_MS } from '@/modules/shared';
import { usePlayerInfo } from './PlayerInfo.hook';

jest.mock('@/features/game/context/GameBoardContext');

const createPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    playerId: 'player-0',
    name: 'Test Player',
    color: 'blue',
    isBot: false,
    armies: [{ id: 0, position: { x: 0, y: 0 }, hasActed: false }],
    resources: { food: 10, wood: 5, gold: 3 },
    armyCount: 1,
    attackPower: 1,
    nextArmyCost: 10,
    victoryPoints: 5,
    specialCards: [CardName.Scout],
    positions: [],
    passiveAbilities: { collector: false, explorer: false },
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    actionsThisTurn: [],
    revealedTiles: [],
    ...overrides,
  }) as Player;

describe('usePlayerInfo', () => {
  it('builds a view model from player props and context', () => {
    const player = createPlayer({
      name: 'Alice',
      color: 'red',
      victoryPoints: 20,
    });

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:45', isExpiring: false },
      isMyTurn: true,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: true, vpGoal: 30 })
    );

    expect(result.current.name).toBe('Alice');
    expect(result.current.color).toBe('red');
    expect(result.current.victoryPoints).toBe(20);
    expect(result.current.vpGoal).toBe(30);
    expect(result.current.isCurrentPlayer).toBe(true);
  });

  it('defaults vpGoal to 10 when not provided', () => {
    const player = createPlayer({ victoryPoints: 5 });

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: false })
    );

    expect(result.current.vpGoal).toBe(10);
  });

  it('includes turnBadge when isCurrentPlayer is true and isMyTurn is true', () => {
    const player = createPlayer();

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:23', isExpiring: false },
      isMyTurn: true,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: true })
    );

    expect(result.current.turnBadge).not.toBe(null);
    expect(result.current.turnBadge?.showCountdown).toBe(true);
    expect(result.current.turnBadge?.formattedTime).toBe('1:23');
  });

  it('excludes turnBadge when isCurrentPlayer is false', () => {
    const player = createPlayer();

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: false })
    );

    expect(result.current.turnBadge).toBe(null);
  });

  it('passes turnTimer.isExpiring through to the view model', () => {
    const player = createPlayer();

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '0:05', isExpiring: true },
      isMyTurn: true,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: true })
    );

    expect(result.current.turnBadge?.isExpiring).toBe(true);
  });

  it('sets turnBadge.showCountdown to false when isMyTurn is false', () => {
    const player = createPlayer();

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: true })
    );

    expect(result.current.turnBadge?.showCountdown).toBe(false);
  });

  it('includes buffs from player state', () => {
    const player = createPlayer({
      reinforceActive: true,
      passiveAbilities: { collector: true, explorer: false },
    });

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: false })
    );

    expect(result.current.buffs).toHaveLength(2);
    expect(result.current.buffs.some(b => b.id === 'collector')).toBe(true);
    expect(result.current.buffs.some(b => b.id === 'reinforce')).toBe(true);
  });

  it('includes resources in correct order', () => {
    const player = createPlayer({
      resources: { food: 20, wood: 10, gold: 5 },
    });

    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() =>
      usePlayerInfo({ player, isCurrentPlayer: false })
    );

    expect(result.current.resources).toHaveLength(3);
    expect(result.current.resources[0].type).toBe('food');
    expect(result.current.resources[1].type).toBe('wood');
    expect(result.current.resources[2].type).toBe('gold');
    expect(result.current.resources[0].value).toBe(20);
    expect(result.current.resources[1].value).toBe(10);
    expect(result.current.resources[2].value).toBe(5);
  });
});

describe('usePlayerInfo resource gain pulses', () => {
  const LOCAL_PLAYER_ID = 'player-0';

  const buildGainEntry = (playerId: string, type: ResourceType): StructuredLogEntry => ({
    kind: 'structured',
    turn: 1,
    category: 'economy',
    message: 'gained stuff',
    playerId,
    resourceGain: [{ type, amount: 1, tileIds: ['0-0'] }],
  });

  const mockBoard = (log: LogEntry[]) => {
    jest.mocked(useGameBoard).mockReturnValue({
      turnTimer: { formattedTime: '1:30', isExpiring: false },
      isMyTurn: false,
      gameState: { log } as unknown as GameState,
      localPlayer: { playerId: LOCAL_PLAYER_ID } as Player,
    } as unknown as ReturnType<typeof useGameBoard>);
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pulses the matching chip on the local player card when a gain for that player is logged', () => {
    const player = createPlayer({ playerId: LOCAL_PLAYER_ID });
    mockBoard([]);
    const { result, rerender } = renderHook(() => usePlayerInfo({ player, isCurrentPlayer: false }));

    mockBoard([buildGainEntry(LOCAL_PLAYER_ID, ResourceType.Gold)]);
    rerender();

    const gold = result.current.resources.find((resource) => resource.type === ResourceType.Gold);
    expect(gold?.gainPulse).toEqual(expect.objectContaining({ token: 1 }));
    expect(result.current.resources.filter((resource) => resource.gainPulse !== null)).toHaveLength(1);
  });

  it('pulses two chips when one update grants two resource types (Collector tick)', () => {
    const player = createPlayer({ playerId: LOCAL_PLAYER_ID });
    mockBoard([]);
    const { result, rerender } = renderHook(() => usePlayerInfo({ player, isCurrentPlayer: false }));

    mockBoard([
      {
        ...buildGainEntry(LOCAL_PLAYER_ID, ResourceType.Wood),
        resourceGain: [
          { type: ResourceType.Wood, amount: 1, tileIds: ['0-0'] },
          { type: ResourceType.Gold, amount: 1, tileIds: ['0-0'] },
        ],
      },
    ]);
    rerender();

    expect(result.current.resources.map((resource) => resource.gainPulse !== null)).toEqual([false, true, true]);
  });

  it('never pulses a card that belongs to another player, even when that player gains resources', () => {
    const otherPlayer = createPlayer({ playerId: 'player-1' });
    mockBoard([]);
    const { result, rerender } = renderHook(() => usePlayerInfo({ player: otherPlayer, isCurrentPlayer: false }));

    mockBoard([buildGainEntry('player-1', ResourceType.Gold)]);
    rerender();

    expect(result.current.resources.every((resource) => resource.gainPulse === null)).toBe(true);
  });

  it('ignores a gain logged for a different player on the local player card', () => {
    const player = createPlayer({ playerId: LOCAL_PLAYER_ID });
    mockBoard([]);
    const { result, rerender } = renderHook(() => usePlayerInfo({ player, isCurrentPlayer: false }));

    mockBoard([buildGainEntry('player-1', ResourceType.Gold)]);
    rerender();

    expect(result.current.resources.every((resource) => resource.gainPulse === null)).toBe(true);
  });

  it('does not pulse for gains already in the log at mount (seeds without replay)', () => {
    const player = createPlayer({ playerId: LOCAL_PLAYER_ID });
    mockBoard([buildGainEntry(LOCAL_PLAYER_ID, ResourceType.Gold)]);

    const { result } = renderHook(() => usePlayerInfo({ player, isCurrentPlayer: false }));

    expect(result.current.resources.every((resource) => resource.gainPulse === null)).toBe(true);
  });

  it('clears the pulse exactly after RESOURCE_GAIN_ANIMATION_MS', () => {
    const player = createPlayer({ playerId: LOCAL_PLAYER_ID });
    mockBoard([]);
    const { result, rerender } = renderHook(() => usePlayerInfo({ player, isCurrentPlayer: false }));
    mockBoard([buildGainEntry(LOCAL_PLAYER_ID, ResourceType.Gold)]);
    rerender();

    act(() => jest.advanceTimersByTime(RESOURCE_GAIN_ANIMATION_MS - 1));
    expect(result.current.resources[2].gainPulse).not.toBeNull();

    act(() => jest.advanceTimersByTime(1));
    expect(result.current.resources[2].gainPulse).toBeNull();
  });
});
