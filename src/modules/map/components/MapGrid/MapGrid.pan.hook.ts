'use client';

import { useState, useRef, useCallback } from 'react';
import { DEFAULT_DESKTOP_ZOOM } from './MapGrid.zoom-state.hook';
import { useDragGesture } from './MapGrid.drag-gesture.hook';

export interface UsePanOptions {
  isMobile: boolean;
  maxPanX?: number;
  maxPanY?: number;
}

export interface PanState {
  pan: { x: number; y: number };
  isDragging: boolean;
  clampPan: (x: number, y: number, currentZoom: number) => { x: number; y: number };
  resetPan: () => void;
  setPanClamped: (updater: (current: { x: number; y: number }) => { x: number; y: number }) => void;
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePan(options: UsePanOptions, zoom: number): PanState {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const clampPan = useCallback((x: number, y: number, currentZoom: number) => {
    const baseLimitX = options.maxPanX ?? (options.isMobile ? 70 : 100);
    const baseLimitY = options.maxPanY ?? (options.isMobile ? 50 : 75);
    const scaleFactor = Math.max(0.8, currentZoom / DEFAULT_DESKTOP_ZOOM);
    const limitX = Math.round(baseLimitX * scaleFactor);
    const limitY = Math.round(baseLimitY * scaleFactor);
    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  }, [options.isMobile, options.maxPanX, options.maxPanY]);

  const schedulePanUpdate = useCallback((targetX: number, targetY: number, currentZoom: number) => {
    pendingPanRef.current = clampPan(targetX, targetY, currentZoom);
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingPanRef.current) {
          setPan(pendingPanRef.current);
          pendingPanRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  }, [clampPan]);

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const setPanClamped = useCallback(
    (updater: (current: { x: number; y: number }) => { x: number; y: number }) => {
      setPan((current) => clampPan(updater(current).x, updater(current).y, zoom));
    },
    [clampPan, zoom],
  );

  const onEndDrag = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);

  const dragGesture = useDragGesture({
    pan,
    zoom,
    onScheduleUpdate: schedulePanUpdate,
    onDragStateChange: setIsDragging,
    onEndDrag,
  });

  return {
    pan,
    isDragging,
    clampPan,
    resetPan,
    setPanClamped,
    dragHandlers: dragGesture.dragHandlers,
  };
}
