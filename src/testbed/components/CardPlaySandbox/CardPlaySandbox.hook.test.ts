import { act, renderHook } from '@testing-library/react';
import { CardName } from '@/lib/types';
import { SANDBOX_STARTING_HAND } from './CardPlaySandbox.fixtures';
import { useCardPlaySandbox } from './CardPlaySandbox.hook';

function setup() {
  return renderHook(() => useCardPlaySandbox());
}

describe('useCardPlaySandbox', () => {
  it('starts idle: full hand, open gate, no play, turn 1', () => {
    const { result } = setup();
    expect(result.current.play).toBeNull();
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.game.turn).toBe(1);
    expect(result.current.localPlayer.specialCards).toEqual(SANDBOX_STARTING_HAND);
  });

  it('opens and closes the Cards dialog', () => {
    const { result } = setup();
    act(() => result.current.handleOpenCards());
    expect(result.current.uiState.dialogs.cardsPlayerId).toBe(0);
    expect(result.current.isBlocked).toBe(true);
    act(() => result.current.handleCloseCards());
    expect(result.current.uiState.dialogs.cardsPlayerId).toBeNull();
    expect(result.current.isBlocked).toBe(false);
  });

  it('Extra Move plays right after the Cards dialog closes', () => {
    const { result } = setup();
    act(() => result.current.handleOpenCards());
    act(() => result.current.handleUseCard(CardName.ExtraMove));
    expect(result.current.uiState.dialogs.cardsPlayerId).toBeNull();
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 1 });
    expect(result.current.localPlayer.specialCards).not.toContain(CardName.ExtraMove);
    expect(result.current.localPlayer.actionsThisTurn).toHaveLength(1);
  });

  it('Sabotage waits for the target, cancel plays nothing and keeps the card', () => {
    const { result } = setup();
    act(() => result.current.handleUseCard(CardName.Sabotage));
    expect(result.current.uiState.dialogs.sabotage).toEqual({ isOpen: true });
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.play).toBeNull();
    act(() => result.current.handleCancelCard());
    expect(result.current.play).toBeNull();
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.uiState.dialogs.sabotage).toBeNull();
    expect(result.current.uiState.pendingAction).toBeNull();
    expect(result.current.localPlayer.specialCards).toContain(CardName.Sabotage);
  });

  it.each([CardName.Sabotage, CardName.Wealthy, CardName.StealResource])(
    '%s plays and is consumed only after resolve',
    (cardName) => {
      const { result } = setup();
      act(() => result.current.handleUseCard(cardName));
      expect(result.current.play).toBeNull();
      act(() => result.current.handleResolveCard());
      expect(result.current.play).toEqual({ cardName, playId: 1 });
      expect(result.current.localPlayer.specialCards).not.toContain(cardName);
      expect(result.current.uiState.pendingAction).toBeNull();
    },
  );

  it('re-using a cancelled Sabotage then resolving plays once', () => {
    const { result } = setup();
    act(() => result.current.handleUseCard(CardName.Sabotage));
    act(() => result.current.handleCancelCard());
    act(() => result.current.handleUseCard(CardName.Sabotage));
    act(() => result.current.handleResolveCard());
    expect(result.current.play).toEqual({ cardName: CardName.Sabotage, playId: 1 });
  });

  it.each([CardName.Teleport, CardName.Scout])(
    '%s plays at selection, while the map step is pending and the gate is open',
    (cardName) => {
      const { result } = setup();
      act(() => result.current.handleUseCard(cardName));
      expect(result.current.isBlocked).toBe(false);
      expect(result.current.uiState.pendingAction?.type).toBe(cardName.toLowerCase());
      expect(result.current.play).toEqual({ cardName, playId: 1 });
      expect(result.current.localPlayer.specialCards).toContain(cardName);
    },
  );

  it.each([CardName.Teleport, CardName.Scout])('%s resolving later does not replay', (cardName) => {
    const { result } = setup();
    act(() => result.current.handleUseCard(cardName));
    act(() => result.current.endPlay());
    act(() => result.current.handleResolveCard());
    expect(result.current.play).toBeNull();
    expect(result.current.localPlayer.specialCards).not.toContain(cardName);
    expect(result.current.uiState.pendingAction).toBeNull();
  });

  it('handleResolveCard without a pending step does nothing', () => {
    const { result } = setup();
    act(() => result.current.handleResolveCard());
    expect(result.current.game.log).toEqual([]);
    expect(result.current.play).toBeNull();
  });

  it.each([CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll])(
    'combat card %s is logged but never plays',
    (cardName) => {
      const { result } = setup();
      act(() => result.current.handleLogCombatCard(cardName));
      expect(result.current.game.log).toHaveLength(1);
      expect(result.current.play).toBeNull();
      expect(result.current.localPlayer.specialCards).toEqual(SANDBOX_STARTING_HAND);
    },
  );

  it('next turn restores the hand, bumps the turn and clears a pending step', () => {
    const { result } = setup();
    act(() => result.current.handleUseCard(CardName.Teleport));
    act(() => result.current.handleNextTurn());
    expect(result.current.game.turn).toBe(2);
    expect(result.current.localPlayer.specialCards).toEqual(SANDBOX_STARTING_HAND);
    expect(result.current.uiState.pendingAction).toBeNull();
  });

  it('the same card on the next turn plays again', () => {
    const { result } = setup();
    act(() => result.current.handleUseCard(CardName.Teleport));
    act(() => result.current.endPlay());
    act(() => result.current.handleNextTurn());
    act(() => result.current.handleUseCard(CardName.Teleport));
    expect(result.current.play).toEqual({ cardName: CardName.Teleport, playId: 2 });
  });

  it('handleFindCard opens the roll dialog with the card and blocks the gate; no play yet', () => {
    const { result } = setup();
    act(() => result.current.handleFindCard(CardName.WarChief));
    expect(result.current.uiState.dialogs.specialIslandRoll).toEqual({
      isOpen: true,
      roll: 6,
      cardDrawn: CardName.WarChief,
      x: 0,
      y: 0,
    });
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.play).toBeNull();
  });

  it('handleCloseFoundCard plays the found card and leaves the game log untouched', () => {
    const { result } = setup();
    const logBefore = [...result.current.game.log];
    act(() => result.current.handleFindCard(CardName.WarChief));
    act(() => result.current.handleCloseFoundCard());
    expect(result.current.uiState.dialogs.specialIslandRoll).toBeNull();
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.play).toEqual({ cardName: CardName.WarChief, playId: 1, isFound: true });
    expect(result.current.game.log).toEqual(logBefore);
    expect(result.current.localPlayer.specialCards).toEqual(SANDBOX_STARTING_HAND);
  });

  it('finding then using Extra Move plays twice', () => {
    const { result } = setup();
    act(() => result.current.handleFindCard(CardName.ExtraMove));
    act(() => result.current.handleCloseFoundCard());
    act(() => result.current.endPlay());
    act(() => result.current.handleUseCard(CardName.ExtraMove));
    expect(result.current.play).toEqual({ cardName: CardName.ExtraMove, playId: 2 });
  });
});
