import { useRef, useCallback } from 'react';

const DRAG_THRESHOLD = 4;

interface DragGestureOptions {
  pan: { x: number; y: number };
  zoom: number;
  onScheduleUpdate: (targetX: number, targetY: number, currentZoom: number) => void;
  onDragStateChange: (dragging: boolean) => void;
  onEndDrag: () => void;
}

interface DragGestureResult {
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

const isInteractiveElement = (element: HTMLElement | null): boolean =>
  !!element?.closest('button, a, input, select, [role="button"]');

export function useDragGesture(options: DragGestureOptions): DragGestureResult {
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      const isInteractive = isInteractiveElement(e.target as HTMLElement);
      isMouseDownRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialPanRef.current = { ...options.pan };
      if (!isInteractive) {
        isDraggingRef.current = true;
        options.onDragStateChange(true);
      }
    },
    [options],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (!hasDraggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        hasDraggedRef.current = true;
        isDraggingRef.current = true;
        options.onDragStateChange(true);
      }
      if (hasDraggedRef.current) {
        options.onScheduleUpdate(initialPanRef.current.x + dx, initialPanRef.current.y + dy, options.zoom);
      }
    },
    [options],
  );

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    isDraggingRef.current = false;
    options.onDragStateChange(false);
    options.onEndDrag();
  }, [options]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const isInteractive = isInteractiveElement(e.target as HTMLElement);
      isMouseDownRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPanRef.current = { ...options.pan };
      if (!isInteractive) {
        isDraggingRef.current = true;
        options.onDragStateChange(true);
      }
    },
    [options],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1 || !isMouseDownRef.current) return;
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (!hasDraggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        hasDraggedRef.current = true;
        isDraggingRef.current = true;
        options.onDragStateChange(true);
      }
      if (hasDraggedRef.current) {
        options.onScheduleUpdate(initialPanRef.current.x + dx, initialPanRef.current.y + dy, options.zoom);
      }
    },
    [options],
  );

  const handleTouchEnd = useCallback(() => {
    isMouseDownRef.current = false;
    isDraggingRef.current = false;
    options.onDragStateChange(false);
    options.onEndDrag();
  }, [options]);

  return {
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
