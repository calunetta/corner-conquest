'use client';

import { useRef } from 'react';
import type { PointerEvent } from 'react';
import type { DecorationInstance } from '@/modules/map';
import { toDraggedInstancePercent, toResizedSize } from './TileDecorationEditor.map';
import { styles, SPRITE_CENTER_TRANSFORM } from './TileDecorationEditor.styles';

interface PressState {
  top: number;
  left: number;
  size: number;
  clientX: number;
  clientY: number;
}

/** The overlay that holds the sprites. Its box is the canvas, so percentages are measured against it. */
function overlayBox(element: HTMLElement) {
  return element.parentElement?.getBoundingClientRect() ?? null;
}

interface DragLayerProps {
  /** The selected decoration. Dragging anywhere on the tile moves it, as the placement preview does. */
  instance: DecorationInstance;
  onDrag: (top: number, left: number) => void;
}

/** Covers the tile under the sprites. A press on empty tile drags the selected decoration by the
 *  pointer's travel, so it is easy to place without hitting its small picture. */
export function TileDecorationEditorDragLayer({ instance, onDrag }: DragLayerProps) {
  const pressRef = useRef<PressState | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = { top: instance.top, left: instance.left, size: instance.size, clientX: event.clientX, clientY: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    const box = overlayBox(event.currentTarget);
    if (!press || !box) return;
    const next = toDraggedInstancePercent(
      { top: press.top, left: press.left, pointerX: press.clientX, pointerY: press.clientY },
      { x: event.clientX, y: event.clientY },
      box,
    );
    onDrag(next.top, next.left);
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 touch-none cursor-move select-none"
      data-testid="decoration-drag-layer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => (pressRef.current = null)}
      onPointerCancel={() => (pressRef.current = null)}
    />
  );
}

interface ResizeHandleProps {
  instance: DecorationInstance;
  onResize: (size: number) => void;
}

/** A handle on the selected decoration's bottom-right corner. Drag it to resize. */
export function TileDecorationEditorResizeHandle({ instance, onResize }: ResizeHandleProps) {
  const pressRef = useRef<PressState | null>(null);
  const cornerTop = instance.top + instance.size / 2;
  const cornerLeft = instance.left + instance.size / 2;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = { top: instance.top, left: instance.left, size: instance.size, clientX: event.clientX, clientY: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    const box = overlayBox(event.currentTarget);
    if (!press || !box) return;
    onResize(toResizedSize(press.size, event.clientX - press.clientX, event.clientY - press.clientY, box.width));
  }

  return (
    <div
      className={styles.resizeHandle}
      style={{ top: `${cornerTop}%`, left: `${cornerLeft}%`, zIndex: instance.z + 1, transform: SPRITE_CENTER_TRANSFORM }}
      data-testid="decoration-resize-handle"
      aria-hidden
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => (pressRef.current = null)}
      onPointerCancel={() => (pressRef.current = null)}
    />
  );
}
