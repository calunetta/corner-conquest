'use client';

import { useRef, useCallback } from 'react';
import { usePan } from './MapGrid.pan.hook';
import { useZoomState, DEFAULT_DESKTOP_ZOOM } from './MapGrid.zoom-state.hook';

const ZOOM_STEP = 0.15;

export { DEFAULT_DESKTOP_ZOOM };

export interface UseMapPanZoomOptions {
  initialZoom?: number;
  isMobile?: boolean;
  maxPanX?: number;
  maxPanY?: number;
}

export interface UseMapPanZoomResult {
  zoom: number;
  pan: { x: number; y: number };
  defaultZoom: number;
  isDragging: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onWheel: (e: React.WheelEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function useMapPanZoom(options?: UseMapPanZoomOptions): UseMapPanZoomResult {
  const isMobile = options?.isMobile ?? false;
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(options?.initialZoom ?? DEFAULT_DESKTOP_ZOOM);

  const zoomState = useZoomState({ initialZoom: options?.initialZoom, isMobile });
  const panState = usePan({ isMobile, maxPanX: options?.maxPanX, maxPanY: options?.maxPanY }, zoomState.zoom);

  const zoomIn = useCallback(() => {
    const nextZoom = Math.min(zoomState.maxZoom, Math.round((zoomState.zoom + ZOOM_STEP) * 100) / 100);
    zoomState.setZoom(nextZoom);
    panState.setPanClamped((current) => current);
  }, [zoomState, panState]);

  const zoomOut = useCallback(() => {
    const nextZoom = Math.max(zoomState.minZoom, Math.round((zoomState.zoom - ZOOM_STEP) * 100) / 100);
    zoomState.setZoom(nextZoom);
    panState.setPanClamped((current) => current);
  }, [zoomState, panState]);

  const resetZoom = useCallback(() => {
    zoomState.setZoom(zoomState.defaultZoom);
    panState.resetPan();
  }, [zoomState, panState]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || Math.abs(e.deltaY) > 20) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  }, [zoomIn, zoomOut]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      panState.dragHandlers.onTouchStart(e);
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistanceRef.current = distance;
      initialPinchZoomRef.current = zoomState.zoom;
    }
  }, [panState, zoomState]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      panState.dragHandlers.onTouchMove(e);
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / initialPinchDistanceRef.current;
      const newZoom = Math.min(zoomState.maxZoom, Math.max(zoomState.minZoom, initialPinchZoomRef.current * scale));
      const roundedZoom = Math.round(newZoom * 100) / 100;
      zoomState.setZoom(roundedZoom);
      panState.setPanClamped((prev) => prev);
    }
  }, [panState, zoomState]);

  const handleTouchEnd = useCallback(() => {
    panState.dragHandlers.onTouchEnd();
    initialPinchDistanceRef.current = null;
  }, [panState]);

  return {
    zoom: zoomState.zoom,
    pan: panState.pan,
    defaultZoom: zoomState.defaultZoom,
    isDragging: panState.isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    handlers: {
      onMouseDown: panState.dragHandlers.onMouseDown,
      onMouseMove: panState.dragHandlers.onMouseMove,
      onMouseUp: panState.dragHandlers.onMouseUp,
      onMouseLeave: panState.dragHandlers.onMouseLeave,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
