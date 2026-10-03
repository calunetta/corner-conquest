import { renderHook, act } from '@testing-library/react';
import { usePan } from './MapGrid.pan.hook';
import { DEFAULT_DESKTOP_ZOOM } from './MapGrid.zoom-state.hook';

describe('usePan', () => {
  describe('clampPan', () => {
    it('clamps symmetrically around 0 using desktop limits', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const clamped = result.current.clampPan(200, 150, DEFAULT_DESKTOP_ZOOM);

      // Desktop limits: X=100, Y=75 at DEFAULT_DESKTOP_ZOOM
      expect(clamped.x).toBe(100);
      expect(clamped.y).toBe(75);
    });

    it('clamps negative values symmetrically', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const clamped = result.current.clampPan(-200, -150, DEFAULT_DESKTOP_ZOOM);

      expect(clamped.x).toBe(-100);
      expect(clamped.y).toBe(-75);
    });

    it('preserves in-range positive values', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const clamped = result.current.clampPan(50, 30, DEFAULT_DESKTOP_ZOOM);

      expect(clamped.x).toBe(50);
      expect(clamped.y).toBe(30);
    });

    it('preserves in-range negative values', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const clamped = result.current.clampPan(-50, -30, DEFAULT_DESKTOP_ZOOM);

      expect(clamped.x).toBe(-50);
      expect(clamped.y).toBe(-30);
    });

    it('scales clamp limits based on zoom (higher zoom allows more pan)', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const atDefaultZoom = result.current.clampPan(200, 200, DEFAULT_DESKTOP_ZOOM);
      const atZoomedIn = result.current.clampPan(200, 200, 1.15);

      // Higher zoom = larger scaleFactor = larger limits
      expect(Math.abs(atZoomedIn.x)).toBeGreaterThan(Math.abs(atDefaultZoom.x));
      expect(Math.abs(atZoomedIn.y)).toBeGreaterThan(Math.abs(atDefaultZoom.y));
    });

    it('uses mobile limits when isMobile is true', () => {
      const { result: desktop } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));
      const { result: mobile } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const desktopClamped = desktop.current.clampPan(200, 200, DEFAULT_DESKTOP_ZOOM);
      const mobileClamped = mobile.current.clampPan(200, 200, DEFAULT_DESKTOP_ZOOM);

      // Mobile base limits (70, 50) differ from desktop (100, 75)
      expect(mobileClamped.x).toBe(70);
      expect(mobileClamped.y).toBe(50);
      expect(desktopClamped.x).toBe(100);
      expect(desktopClamped.y).toBe(75);
    });
  });

  describe('mouse drag handlers', () => {
    it('records drag start on mouse down (before threshold)', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const event = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseDown(event);
      });

      // isDragging is true immediately on mousedown (before threshold check)
      expect(result.current.isDragging).toBe(true);
    });

    it('does not set isDragging immediately on interactive elements', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const button = document.createElement('button');
      const event = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      Object.defineProperty(event, 'target', { value: button, enumerable: true });

      act(() => {
        result.current.dragHandlers.onMouseDown(event);
      });

      // isDragging should not be set on interactive elements
      expect(result.current.isDragging).toBe(false);
    });

    it('isDragging becomes true when mousedown on button then dragged past 4px threshold (legacy semantics)', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const button = document.createElement('button');
      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      Object.defineProperty(downEvent, 'target', { value: button, enumerable: true });

      act(() => {
        result.current.dragHandlers.onMouseDown(downEvent);
      });

      // isDragging is false immediately after mousedown on interactive element
      expect(result.current.isDragging).toBe(false);

      // Now move past the 4px threshold
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 115,
        clientY: 215,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseMove(moveEvent);
      });

      // isDragging should NOW be true, per legacy semantics (drag started on button still pans)
      expect(result.current.isDragging).toBe(true);
    });

    it('pan does not change until 4px drag threshold is exceeded', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseDown(downEvent);
      });

      // Small move (2px) - below 4px threshold
      const moveEventSmall = new MouseEvent('mousemove', {
        clientX: 102,
        clientY: 201,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseMove(moveEventSmall);
      });

      // Pan should not change yet (below threshold)
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
      // isDragging should still reflect pre-threshold state for small moves
      expect(result.current.isDragging).toBe(true); // Set on mousedown, not rechecked
    });

    it('isDragging transitions after exceeding 4px drag threshold', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseDown(downEvent);
      });

      expect(result.current.isDragging).toBe(true);

      // Large move (10px) - exceeds 4px threshold
      const moveEventLarge = new MouseEvent('mousemove', {
        clientX: 110,
        clientY: 210,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseMove(moveEventLarge);
      });

      // isDragging stays true after exceeding threshold
      expect(result.current.isDragging).toBe(true);
    });

    it('clears dragging state on mouse up', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseDown(downEvent);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.dragHandlers.onMouseUp();
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('flushes pending pan on mouse up (RAF batching)', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
        buttons: 1,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseDown(downEvent);
      });

      // Move past threshold (10px)
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 110,
        clientY: 210,
      }) as unknown as React.MouseEvent;

      act(() => {
        result.current.dragHandlers.onMouseMove(moveEvent);
      });

      // Before RAF fires, pan is still 0 (batched in RAF)
      expect(result.current.pan).toEqual({ x: 0, y: 0 });

      // On mouse up, pan should be flushed immediately
      act(() => {
        result.current.dragHandlers.onMouseUp();
      });

      // Pan should be updated by mouseUp (it flushes pendingPanRef)
      expect(result.current.pan.x).toBeGreaterThan(0);
      expect(result.current.pan.y).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('touch handlers', () => {
    it('handles single-finger touch drag start', () => {
      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      expect(result.current.isDragging).toBe(true);
    });

    it('single-finger touch respects 4px drag threshold', () => {
      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      // Small move (2px) - below threshold
      const smallMoveEvent = {
        touches: [{ clientX: 102, clientY: 201 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchMove(smallMoveEvent);
      });

      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it('pan updates after exceeding 4px drag threshold (with RAF batching)', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      // Large move (10px) - exceeds threshold
      const largeMoveEvent = {
        touches: [{ clientX: 110, clientY: 210 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchMove(largeMoveEvent);
      });

      expect(result.current.isDragging).toBe(true);

      // Flush on touch end (RAF batching)
      act(() => {
        result.current.dragHandlers.onTouchEnd();
      });

      // Pan should be flushed by onTouchEnd
      expect(result.current.pan.x).toBeGreaterThan(0);
      expect(result.current.pan.y).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('no-op on two-finger touch (pinch is handled elsewhere)', () => {
      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 300 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      // With 2 touches, isDragging should not be set
      expect(result.current.isDragging).toBe(false);
    });

    it('two-finger touch move is ignored (onTouchMove no-op for touches.length !== 1)', () => {
      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      // Switch to 2 touches in move event
      const twoTouchMoveEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 300 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchMove(twoTouchMoveEvent);
      });

      // Pan should not update (only single-finger moves update pan)
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it('clears dragging state on touch end', () => {
      const { result } = renderHook(() => usePan({ isMobile: true }, DEFAULT_DESKTOP_ZOOM));

      const startEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.dragHandlers.onTouchStart(startEvent);
      });

      act(() => {
        result.current.dragHandlers.onTouchEnd();
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('pan management', () => {
    it('resets pan to origin', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      // Set pan to a non-zero value
      act(() => {
        result.current.setPanClamped(() => ({ x: 50, y: 50 }));
      });

      expect(result.current.pan.x).toBe(50);
      expect(result.current.pan.y).toBe(50);

      act(() => {
        result.current.resetPan();
      });

      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it('setPanClamped clamps the updated pan value', () => {
      const { result } = renderHook(() => usePan({ isMobile: false }, DEFAULT_DESKTOP_ZOOM));

      // Try to set pan beyond the clamp limit
      act(() => {
        result.current.setPanClamped(() => ({ x: 500, y: 500 }));
      });

      // Should be clamped to desktop limits (100, 75)
      expect(result.current.pan.x).toBe(100);
      expect(result.current.pan.y).toBe(75);
    });

    it('setPanClamped respects zoom scale factor', () => {
      const zoomedZoom = 1.15;
      const { result } = renderHook(() => usePan({ isMobile: false }, zoomedZoom));

      // At higher zoom, pan limits are higher
      act(() => {
        result.current.setPanClamped(() => ({ x: 500, y: 500 }));
      });

      // Should be clamped to a higher value than desktop defaults
      expect(result.current.pan.x).toBeGreaterThan(100);
      expect(result.current.pan.y).toBeGreaterThan(75);
    });
  });
});
