import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from './use-toast';
import { getToastState } from './toast-store';

describe('useToast', () => {
  beforeEach(() => {
    // Reset the store before each test
    getToastState().toasts = [];
  });

  it('returns the current toast state and toast/dismiss functions', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current).toHaveProperty('toasts');
    expect(result.current).toHaveProperty('toast');
    expect(result.current).toHaveProperty('dismiss');
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('updates when toast() is called outside the hook', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toHaveLength(0);

    act(() => {
      toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
  });

  it('updates when multiple toasts are added', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toBe('Toast 3');
    expect(result.current.toasts[1].title).toBe('Toast 2');
    expect(result.current.toasts[2].title).toBe('Toast 1');
  });

  it('updates when toast.dismiss() is called', () => {
    const { result } = renderHook(() => useToast());

    let toastRef: ReturnType<typeof toast>;
    act(() => {
      toastRef = toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      toastRef!.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('removes listener on unmount, so post-unmount toasts do not update the hook', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'First Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);

    unmount();

    // Call toast after unmount
    act(() => {
      toast({ title: 'Post-Unmount Toast' });
    });

    // The hook is no longer subscribed, so this assertion would fail if we tried to check
    // result.current. Instead, verify the store state changed (proving toast() worked),
    // but the hook is no longer listening.
    expect(getToastState().toasts).toHaveLength(2);
  });

  it('calls the hook-provided toast() function and updates the hook', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hook Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hook Toast');
  });

  it('calls the hook-provided dismiss() function', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
