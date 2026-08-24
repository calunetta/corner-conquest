'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.15;

export function useMapPanZoom() {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1.0);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if clicking directly on a button or dialog control inside the canvas
    const isInteractive = !!(e.target as HTMLElement)?.closest('button, a, input, select, [role="button"]');
    
    // Middle click, right click, or clicking canvas background / non-interactive area
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

    // Start dragging after 4px of movement
    if (!hasDraggedRef.current && Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedRef.current) {
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Zoom on wheel (natural wheel zoom or ctrl-wheel zoom)
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

      if (!hasDraggedRef.current && Math.hypot(dx, dy) > 6) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }

      if (hasDraggedRef.current) {
        setPan({
          x: initialPanRef.current.x + dx,
          y: initialPanRef.current.y + dy,
        });
      }
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / initialPinchDistanceRef.current;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialPinchZoomRef.current * scale));
      setZoom(Math.round(newZoom * 100) / 100);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    initialPinchDistanceRef.current = null;
  }, []);

  return {
    zoom,
    pan,
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
