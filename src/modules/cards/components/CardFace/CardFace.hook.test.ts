import { act, renderHook } from '@testing-library/react';
import { CardName } from '@/lib/types';
import { CARD_ART } from '../../card-art';
import { useCardFace } from './CardFace.hook';

describe('useCardFace', () => {
  it.each(Object.values(CardName))('src for %s is its framed card art', (name) => {
    const { result } = renderHook(() => useCardFace(name));
    expect(result.current.src).toBe(CARD_ART[name].card);
  });

  it('hasFailed is false initially', () => {
    const { result } = renderHook(() => useCardFace(CardName.WarChief));
    expect(result.current.hasFailed).toBe(false);
  });

  it('hasFailed becomes true after onError', () => {
    const { result } = renderHook(() => useCardFace(CardName.WarChief));
    act(() => result.current.onError());
    expect(result.current.hasFailed).toBe(true);
  });

  it('hasFailed resets to false when rerendered with another card', () => {
    const { result, rerender } = renderHook(({ name }) => useCardFace(name), {
      initialProps: { name: CardName.WarChief as CardName },
    });
    act(() => result.current.onError());
    expect(result.current.hasFailed).toBe(true);

    rerender({ name: CardName.Scout });

    expect(result.current.hasFailed).toBe(false);
    expect(result.current.src).toBe(CARD_ART[CardName.Scout].card);
  });

  it('failure persists across rerenders with the same card', () => {
    const { result, rerender } = renderHook(({ name }) => useCardFace(name), {
      initialProps: { name: CardName.WarChief as CardName },
    });
    act(() => result.current.onError());
    rerender({ name: CardName.WarChief });
    expect(result.current.hasFailed).toBe(true);
  });
});
