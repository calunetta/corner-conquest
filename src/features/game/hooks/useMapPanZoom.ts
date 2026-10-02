'use client';

import { useState, useRef, useCallback } from 'react';

export const DEFAULT_DESKTOP_ZOOM = 0.85;
const MIN_ZOOM_DESKTOP = 0.85;
const MAX_ZOOM_DESKTOP = 1.15;
const MIN_ZOOM_MOBILE = 0.75;
const MAX_ZOOM_MOBILE = 1.35;
const ZOOM_STEP = 0.15;

interface UseMapPanZoomOptions {
  initialZoom?: number;
  isMobile?: boolean;
  maxPanX?: number;
  maxPanY?: number;
}

export function useMapPanZoom(options?: UseMapPanZoomOptions) {
  const defaultZoom = options?.initialZoom ?? DEFAULT_DESKTOP_ZOOM;
  const isMobile = options?.isMobile ?? false;
  const minZoom = isMobile ? MIN_ZOOM_MOBILE : MIN_ZOOM_DESKTOP;
  const maxZoom = isMobile ? MAX_ZOOM_MOBILE : MAX_ZOOM_DESKTOP;

  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(defaultZoom);
  const rafIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const clampPan = useCallback((x: number, y: number, currentZoom: number) => {
    // Increased pan blocking so the board stays tightly centered and cannot scroll too far up, down, or sideways
    const baseLimitX = options?.maxPanX ?? (isMobile ? 70 : 100);
    const baseLimitY = options?.maxPanY ?? (isMobile ? 50 : 75);
    const scaleFactor = Math.max(0.8, currentZoom / DEFAULT_DESKTOP_ZOOM);
    const limitX = Math.round(baseLimitX * scaleFactor);
    const limitY = Math.round(baseLimitY * scaleFactor);

    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  }, [isMobile, options?.maxPanX, options?.maxPanY]);

  const schedulePanUpdate = useCallback((targetX: number, targetY: number, currentZoom: number) => {
    const clamped = clampPan(targetX, targetY, currentZoom);
    pendingPanRef.current = clamped;

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

  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const nextZoom = Math.min(maxZoom, Math.round((prev + ZOOM_STEP) * 100) / 100);
      setPan(currentPan => clampPan(currentPan.x, currentPan.y, nextZoom));
      return nextZoom;
    });
  }, [clampPan, maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const nextZoom = Math.max(minZoom, Math.round((prev - ZOOM_STEP) * 100) / 100);
      setPan(currentPan => clampPan(currentPan.x, currentPan.y, nextZoom));
      return nextZoom;
    });
  }, [clampPan, minZoom]);

  const resetZoom = useCallback(() => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  }, [defaultZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isInteractive = !!(e.target as HTMLElement)?.closest('button, a, input, select, [role="button"]');
    
    if (e.button === 0 || e.button === 1) {
      isMouseDownRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialPanRef.current = { ...pan };

      if (!isInteractive) {
        setIsDragging(true);
      }
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!hasDraggedRef.current && Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedRef.current) {
      schedulePanUpdate(
        initialPanRef.current.x + dx,
        initialPanRef.current.y + dy,
        zoom
      );
    }
  }, [schedulePanUpdate, zoom]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);

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

  // Touch handlers for mobile & tablet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const isInteractive = !!(e.target as HTMLElement)?.closest('button, a, input, select, [role="button"]');

    if (e.touches.length === 1) {
      isMouseDownRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...pan };

      if (!isInteractive) {
        setIsDragging(true);
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      isMouseDownRef.current = false;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistanceRef.current = distance;
      initialPinchZoomRef.current = zoom;
    }
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isMouseDownRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;

      if (!hasDraggedRef.current && Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }

      if (hasDraggedRef.current) {
        schedulePanUpdate(
          initialPanRef.current.x + dx,
          initialPanRef.current.y + dy,
          zoom
        );
      }
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / initialPinchDistanceRef.current;
      const newZoom = Math.min(maxZoom, Math.max(minZoom, initialPinchZoomRef.current * scale));
      const roundedZoom = Math.round(newZoom * 100) / 100;
      setZoom(roundedZoom);
      setPan(prev => clampPan(prev.x, prev.y, roundedZoom));
    }
  }, [schedulePanUpdate, zoom, clampPan, minZoom, maxZoom]);

  const handleTouchEnd = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    initialPinchDistanceRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);

  return {
    zoom,
    pan,
    defaultZoom,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
