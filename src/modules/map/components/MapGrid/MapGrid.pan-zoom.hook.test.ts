import { renderHook, act } from '@testing-library/react';
import { useMapPanZoom } from './MapGrid.pan-zoom.hook';
import { DEFAULT_DESKTOP_ZOOM } from './MapGrid.zoom-state.hook';

describe('useMapPanZoom', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('returns the correct initial state with defaults', () => {
      const { result } = renderHook(() => useMapPanZoom());

      expect(result.current.zoom).toBe(DEFAULT_DESKTOP_ZOOM);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
      expect(result.current.defaultZoom).toBe(DEFAULT_DESKTOP_ZOOM);
      expect(result.current.isDragging).toBe(false);
    });

    it('returns the correct initial state with custom initialZoom', () => {
      const customZoom = 1.0;
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: customZoom }));

      expect(result.current.zoom).toBe(customZoom);
      expect(result.current.defaultZoom).toBe(customZoom);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });
  });

  describe('zoomIn', () => {
    it('increases zoom by 0.15 step', () => {
      const { result } = renderHook(() => useMapPanZoom());

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.zoom).toBeCloseTo(DEFAULT_DESKTOP_ZOOM + 0.15, 2);
    });

    it('clamps zoom at maxZoom (1.15 for desktop)', () => {
      const { result } = renderHook(() => useMapPanZoom());

      act(() => {
        // Zoom in multiple times to reach and exceed max
        result.current.zoomIn();
        result.current.zoomIn();
        result.current.zoomIn();
      });

      expect(result.current.zoom).toBeLessThanOrEqual(1.15);
    });

    it('clamped value is exactly maxZoom when exceeded', () => {
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: 1.1 }));

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.zoom).toBe(1.15);
    });

    it('reclamps pan after zooming in (pan limits scale with zoom)', () => {
      const { result } = renderHook(() => useMapPanZoom());

      // Set pan using setPanClamped at a large value that will be clamped
      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 0,
          clientY: 0,
          button: 0,
        } as unknown as React.MouseEvent);
        result.current.handlers.onMouseMove({
          clientX: 200,
          clientY: 200,
        } as unknown as React.MouseEvent);
        jest.advanceTimersByTime(0); // Flush RAF
        result.current.handlers.onMouseUp();
      });

      // Zoom in - higher zoom allows more pan, so limits increase
      act(() => {
        result.current.zoomIn();
      });

      // Pan may increase or stay the same (not decrease), since we reclamped with higher zoom
      expect(result.current.pan.x).toBeGreaterThanOrEqual(0);
      expect(result.current.pan.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('zoomOut', () => {
    it('decreases zoom by 0.15 step', () => {
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: 1.0 }));

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.zoom).toBeCloseTo(1.0 - 0.15, 2);
    });

    it('clamps zoom at minZoom (0.85 for desktop)', () => {
      const { result } = renderHook(() => useMapPanZoom());

      act(() => {
        // Already at DEFAULT_DESKTOP_ZOOM (0.85, which is MIN_ZOOM)
        result.current.zoomOut();
        result.current.zoomOut();
      });

      expect(result.current.zoom).toBeGreaterThanOrEqual(0.85);
      expect(result.current.zoom).toBe(0.85); // Can't zoom below min
    });

    it('clamped value is exactly minZoom when exceeded', () => {
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: 0.9 }));

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.zoom).toBe(0.85);
    });
  });

  describe('resetZoom', () => {
    it('resets zoom to default and pan to origin', () => {
      const customDefault = 1.0;
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: customDefault }));

      // Set pan by dragging past threshold and flushing on mouse up
      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 200,
          button: 0,
        } as unknown as React.MouseEvent);
        result.current.handlers.onMouseMove({
          clientX: 110,
          clientY: 210,
        } as unknown as React.MouseEvent);
        // onMouseUp flushes pendingPanRef
        result.current.handlers.onMouseUp();
      });

      // Zoom in to change zoom
      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.zoom).not.toBe(customDefault);
      expect(result.current.pan.x).toBeGreaterThan(0);
      expect(result.current.pan.y).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.resetZoom();
      });

      expect(result.current.zoom).toBe(customDefault);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });
  });

  describe('onWheel', () => {
    it('zooms in when scrolling up (deltaY < 0) with ctrlKey', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: -50,
        ctrlKey: true,
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('zooms out when scrolling down (deltaY > 0) with ctrlKey', () => {
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: 1.0 }));
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: 50,
        ctrlKey: true,
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBeLessThan(initialZoom);
    });

    it('zooms in when scrolling up with metaKey (Mac)', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: -50,
        metaKey: true,
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('zooms in when scrolling up with altKey', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: -50,
        altKey: true,
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('zooms in when |deltaY| > 20 (no modifier needed)', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: -50, // |50| > 20
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('does not zoom with small deltaY (|deltaY| <= 20) and no modifier', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: 10, // |10| <= 20, no modifier
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBe(initialZoom);
    });

    it('does not zoom with -20 <= deltaY <= 20 and no modifier (boundary)', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      const event = new WheelEvent('wheel', {
        deltaY: 20, // Boundary case
      }) as unknown as React.WheelEvent;

      act(() => {
        result.current.handlers.onWheel(event);
      });

      expect(result.current.zoom).toBe(initialZoom);
    });
  });

  describe('isDragging field', () => {
    it('is present in the returned shape', () => {
      const { result } = renderHook(() => useMapPanZoom());

      expect(result.current).toHaveProperty('isDragging');
      expect(typeof result.current.isDragging).toBe('boolean');
    });

    it('isDragging is false initially', () => {
      const { result } = renderHook(() => useMapPanZoom());

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('two-finger pinch', () => {
    it('scales zoom based on pinch distance (pinch out)', () => {
      const { result } = renderHook(() => useMapPanZoom());
      const initialZoom = result.current.zoom;

      // Two-finger touch start (distance = 100)
      const startEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(startEvent);
      });

      // Pinch out (fingers move apart, distance = 200)
      const moveEvent = {
        touches: [
          { clientX: 50, clientY: 200 },
          { clientX: 250, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchMove(moveEvent);
      });

      // Scale = 200 / 100 = 2.0, so zoom should double (or max out)
      expect(result.current.zoom).toBeGreaterThan(initialZoom);
    });

    it('scales zoom based on pinch distance (pinch in)', () => {
      const { result } = renderHook(() => useMapPanZoom({ initialZoom: 1.0 }));
      const initialZoom = result.current.zoom;

      // Two-finger touch start (distance = 200)
      const startEvent = {
        touches: [
          { clientX: 50, clientY: 200 },
          { clientX: 250, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(startEvent);
      });

      // Pinch in (fingers move together, distance = 100)
      const moveEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchMove(moveEvent);
      });

      // Scale = 100 / 200 = 0.5, so zoom should halve
      expect(result.current.zoom).toBeLessThan(initialZoom);
    });

    it('clamps pinch zoom at minZoom and maxZoom', () => {
      const { result } = renderHook(() => useMapPanZoom());

      const startEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(startEvent);
      });

      // Extreme pinch out (very large distance)
      const moveEvent = {
        touches: [
          { clientX: -100, clientY: 200 },
          { clientX: 400, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchMove(moveEvent);
      });

      // Should be clamped at maxZoom
      expect(result.current.zoom).toBeLessThanOrEqual(1.15);
    });

    it('resets pinch distance ref on onTouchEnd', () => {
      const { result } = renderHook(() => useMapPanZoom());

      // Start two-finger pinch
      const startEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(startEvent);
      });

      // End touch
      act(() => {
        result.current.handlers.onTouchEnd();
      });

      // Now start a new single-finger touch (should use current zoom, not the old initial)
      const singleTouchStart = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(singleTouchStart);
      });

      // isDragging should be set for single-finger pan (verify pinch ref was reset)
      expect(result.current.isDragging).toBe(true);
    });
  });

  describe('single-finger touch pan', () => {
    it('allows single-finger panning after two-finger pinch ends', () => {
      const { result } = renderHook(() => useMapPanZoom());

      // Start two-finger pinch
      const pinchStart = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 },
        ],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(pinchStart);
      });

      // End pinch
      act(() => {
        result.current.handlers.onTouchEnd();
      });

      // Start single-finger pan
      const singleStart = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(singleStart);
      });

      expect(result.current.isDragging).toBe(true);

      // Move should update pan
      const moveEvent = {
        touches: [{ clientX: 110, clientY: 210 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchMove(moveEvent);
        // onTouchEnd flushes pendingPanRef
        result.current.handlers.onTouchEnd();
      });

      expect(result.current.pan.x).toBeGreaterThan(0);
      expect(result.current.isDragging).toBe(false);
    });
  });
});
