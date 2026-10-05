import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useMobileActionsBar } from './MobileActionsBar.hook';

// Store all ResizeObserver instances and their callbacks so we can invoke them in tests
const resizeObserverInstances: Array<{
  callback: ResizeObserverCallback;
  observe: jest.Mock;
  disconnect: jest.Mock;
}> = [];

window.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
  const instance = {
    callback,
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  resizeObserverInstances.push(instance);
  return instance;
}) as unknown as typeof window.ResizeObserver;

// Test component that wraps the hook and renders a DOM element
function HookTestComponent({
  onStateChange,
}: {
  onStateChange?: (state: ReturnType<typeof useMobileActionsBar>) => void;
}) {
  const state = useMobileActionsBar();

  React.useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return (
    <div ref={state.barRef} data-testid="bar-element">
      Bar content
    </div>
  );
}

describe('useMobileActionsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resizeObserverInstances.length = 0;
  });

  it('returns initial state with zero height and sheet closed', () => {
    const { result } = renderHook(() => useMobileActionsBar());

    expect(result.current.barHeightPx).toBe(0);
    expect(result.current.isSheetOpen).toBe(false);
    expect(result.current.barRef).toBeDefined();
    expect(result.current.onSheetOpenChange).toBeDefined();
  });

  it('sets up ResizeObserver when ref is attached to a real element', () => {
    render(
      <HookTestComponent />,
    );

    // The component should have rendered and attached the ref
    expect(screen.getByTestId('bar-element')).toBeInTheDocument();

    // ResizeObserver should have been created
    expect(window.ResizeObserver).toHaveBeenCalled();
    expect(resizeObserverInstances.length).toBeGreaterThan(0);

    // observe should have been called on the instance
    const instance = resizeObserverInstances[0];
    expect(instance.observe).toHaveBeenCalled();
  });

  it('updates barHeightPx when ResizeObserver callback is invoked with a height', () => {
    let capturedState: ReturnType<typeof useMobileActionsBar> | undefined;

    render(
      <HookTestComponent
        onStateChange={(state) => {
          capturedState = state;
        }}
      />,
    );

    expect(capturedState?.barHeightPx).toBe(0);

    // Manually invoke the captured callback with a height value
    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        instance.callback(
          [
            {
              contentRect: { height: 72, width: 100 },
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver,
        );
      }
    });

    expect(capturedState?.barHeightPx).toBe(72);
  });

  it('toggles sheet open/closed state with onSheetOpenChange', () => {
    const { result } = renderHook(() => useMobileActionsBar());

    expect(result.current.isSheetOpen).toBe(false);

    // Open sheet
    act(() => {
      result.current.onSheetOpenChange(true);
    });

    expect(result.current.isSheetOpen).toBe(true);

    // Close sheet
    act(() => {
      result.current.onSheetOpenChange(false);
    });

    expect(result.current.isSheetOpen).toBe(false);
  });

  it('calls disconnect on ResizeObserver when component unmounts', () => {
    const { unmount } = render(<HookTestComponent />);

    // Before unmount, capture the instance
    const instance = resizeObserverInstances[0];
    expect(instance).toBeDefined();
    expect(instance.disconnect).not.toHaveBeenCalled();

    unmount();

    // After unmount, disconnect should have been called
    expect(instance.disconnect).toHaveBeenCalled();
  });

  it('handles empty ResizeObserver entries gracefully', () => {
    let capturedState: ReturnType<typeof useMobileActionsBar> | undefined;

    render(
      <HookTestComponent
        onStateChange={(state) => {
          capturedState = state;
        }}
      />,
    );

    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        // Call with empty entries array
        instance.callback([], {} as ResizeObserver);
      }
    });

    // Should remain 0 since no entries were processed
    expect(capturedState?.barHeightPx).toBe(0);
  });

  it('updates barHeightPx on multiple ResizeObserver callback invocations', () => {
    let capturedState: ReturnType<typeof useMobileActionsBar> | undefined;

    render(
      <HookTestComponent
        onStateChange={(state) => {
          capturedState = state;
        }}
      />,
    );

    // First invocation
    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        instance.callback(
          [{ contentRect: { height: 72, width: 100 } } as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });

    expect(capturedState?.barHeightPx).toBe(72);

    // Second invocation with different height
    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        instance.callback(
          [{ contentRect: { height: 100, width: 100 } } as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });

    expect(capturedState?.barHeightPx).toBe(100);
  });

  it('maintains sheet state independently from height updates', () => {
    let capturedState: ReturnType<typeof useMobileActionsBar> | undefined;

    render(
      <HookTestComponent
        onStateChange={(state) => {
          capturedState = state;
        }}
      />,
    );

    // Change height
    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        instance.callback(
          [{ contentRect: { height: 72, width: 100 } } as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });

    // Open sheet
    act(() => {
      capturedState?.onSheetOpenChange(true);
    });

    expect(capturedState?.isSheetOpen).toBe(true);
    expect(capturedState?.barHeightPx).toBe(72);

    // Height changes again
    act(() => {
      if (resizeObserverInstances.length > 0) {
        const instance = resizeObserverInstances[0];
        instance.callback(
          [{ contentRect: { height: 85, width: 100 } } as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });

    // Sheet should still be open
    expect(capturedState?.isSheetOpen).toBe(true);
    expect(capturedState?.barHeightPx).toBe(85);
  });
});
