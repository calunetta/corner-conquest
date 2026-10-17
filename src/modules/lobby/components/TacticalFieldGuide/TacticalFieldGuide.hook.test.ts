import { act, renderHook } from '@testing-library/react';
import { useTacticalFieldGuide } from './TacticalFieldGuide.hook';

describe('useTacticalFieldGuide', () => {
  it('starts collapsed', () => {
    const { result } = renderHook(() => useTacticalFieldGuide());

    expect(result.current.isExpanded).toBe(false);
  });

  it('toggles expanded state on each call to toggleExpanded', () => {
    const { result } = renderHook(() => useTacticalFieldGuide());

    act(() => result.current.toggleExpanded());
    expect(result.current.isExpanded).toBe(true);

    act(() => result.current.toggleExpanded());
    expect(result.current.isExpanded).toBe(false);
  });
});
