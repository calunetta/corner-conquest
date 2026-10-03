import { renderHook, act } from '@testing-library/react';
import { useZoomState, DEFAULT_DESKTOP_ZOOM } from './MapGrid.zoom-state.hook';

describe('useZoomState', () => {
  describe('initialization', () => {
    it('initializes with DEFAULT_DESKTOP_ZOOM when no options provided', () => {
      const { result } = renderHook(() => useZoomState());

      expect(result.current.zoom).toBe(DEFAULT_DESKTOP_ZOOM);
      expect(result.current.defaultZoom).toBe(DEFAULT_DESKTOP_ZOOM);
    });

    it('initializes with custom initialZoom', () => {
      const { result } = renderHook(() => useZoomState({ initialZoom: 1.0 }));

      expect(result.current.zoom).toBe(1.0);
      expect(result.current.defaultZoom).toBe(1.0);
    });

    it('defaultZoom is initialZoom ?? DEFAULT_DESKTOP_ZOOM', () => {
      const customZoom = 1.05;
      const { result } = renderHook(() => useZoomState({ initialZoom: customZoom }));

      expect(result.current.defaultZoom).toBe(customZoom);
    });
  });

  describe('zoom limits', () => {
    it('sets desktop zoom limits by default (isMobile = false)', () => {
      const { result } = renderHook(() => useZoomState());

      expect(result.current.minZoom).toBe(0.85);
      expect(result.current.maxZoom).toBe(1.15);
    });

    it('sets desktop zoom limits when isMobile is explicitly false', () => {
      const { result } = renderHook(() => useZoomState({ isMobile: false }));

      expect(result.current.minZoom).toBe(0.85);
      expect(result.current.maxZoom).toBe(1.15);
    });

    it('sets mobile zoom limits when isMobile is true', () => {
      const { result } = renderHook(() => useZoomState({ isMobile: true }));

      expect(result.current.minZoom).toBe(0.75);
      expect(result.current.maxZoom).toBe(1.35);
    });

    it('mobile min is lower and max is higher than desktop', () => {
      const { result: desktop } = renderHook(() => useZoomState({ isMobile: false }));
      const { result: mobile } = renderHook(() => useZoomState({ isMobile: true }));

      expect(mobile.current.minZoom).toBeLessThan(desktop.current.minZoom);
      expect(mobile.current.maxZoom).toBeGreaterThan(desktop.current.maxZoom);
    });
  });

  describe('zoom state updates', () => {
    it('allows setting zoom value directly', () => {
      const { result } = renderHook(() => useZoomState());

      act(() => {
        result.current.setZoom(1.0);
      });

      expect(result.current.zoom).toBe(1.0);
    });

    it('allows functional updates to zoom', () => {
      const { result } = renderHook(() => useZoomState());

      act(() => {
        result.current.setZoom((prev) => prev + 0.1);
      });

      expect(result.current.zoom).toBeCloseTo(DEFAULT_DESKTOP_ZOOM + 0.1, 5);
    });

    it('does not enforce zoom limits in setZoom (clamping is caller responsibility)', () => {
      const { result } = renderHook(() => useZoomState());

      // setZoom allows setting zoom outside the minZoom/maxZoom range
      act(() => {
        result.current.setZoom(5.0);
      });

      expect(result.current.zoom).toBe(5.0);
    });

    it('maintains independent min/max even after zoom changes', () => {
      const { result } = renderHook(() => useZoomState());

      act(() => {
        result.current.setZoom(1.0);
      });

      expect(result.current.minZoom).toBe(0.85);
      expect(result.current.maxZoom).toBe(1.15);
    });
  });
});
