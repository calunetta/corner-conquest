'use client';

import Image from 'next/image';
import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { toPointerPercent } from './TileDecorationEditor.map';
import { styles } from './TileDecorationEditor.styles';

/** Pointer movement below this many px is a click, not a drag, so selecting never nudges a sprite. */
const DRAG_THRESHOLD_PX = 4;
const KEYBOARD_STEP_PERCENT = 1;
const KEYBOARD_LARGE_STEP_PERCENT = 5;

const ARROW_DIRECTIONS: Record<string, { dTop: number; dLeft: number }> = {
  ArrowUp: { dTop: -1, dLeft: 0 },
  ArrowDown: { dTop: 1, dLeft: 0 },
  ArrowLeft: { dTop: 0, dLeft: -1 },
  ArrowRight: { dTop: 0, dLeft: 1 },
};

interface DragStart {
  clientX: number;
  clientY: number;
  isDragging: boolean;
}

export interface TileDecorationEditorSpriteProps {
  image: string;
  ariaLabel: string;
  /** Fully computed by the caller: position keys + width/height + transform + zIndex if any. */
  style: CSSProperties;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (topPercent: number, leftPercent: number) => void;
  onNudge: (dTop: number, dLeft: number) => void;
}

/** One sprite on the canvas: a focusable button that selects on press, drags with the pointer
 *  (1:1 with the tile's box) and nudges with the arrow keys (Shift for the large step). Format-
 *  agnostic: the caller computes the full style (center-point decorations, corner-anchored
 *  default elements), so both editing modes share this exact interaction logic. */
export function TileDecorationEditorSprite({
  image,
  ariaLabel,
  style,
  isSelected,
  onSelect,
  onDrag,
  onNudge,
}: TileDecorationEditorSpriteProps) {
  const dragStartRef = useRef<DragStart | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onSelect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { clientX: event.clientX, clientY: event.clientY, isDragging: false };
  }

  // Enter and Space on a focused button fire a click without a pointerdown, so keyboard users
  // select through this handler (WCAG 2.1.1). Selecting twice on a pointer press is harmless.
  function handleClick() {
    onSelect();
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;
    if (!dragStart.isDragging && !exceedsDragThreshold(dragStart, event)) return;

    dragStart.isDragging = true;
    const canvasBox = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!canvasBox) return;
    onDrag(
      toPointerPercent(event.clientY, canvasBox.top, canvasBox.height),
      toPointerPercent(event.clientX, canvasBox.left, canvasBox.width),
    );
  }

  function endPointerGesture() {
    dragStartRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? KEYBOARD_LARGE_STEP_PERCENT : KEYBOARD_STEP_PERCENT;
    onNudge(direction.dTop * step, direction.dLeft * step);
  }

  return (
    <button
      type="button"
      className={styles.sprite({ isSelected })}
      style={style}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      data-testid="tile-decoration-editor-sprite"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerGesture}
      onPointerCancel={endPointerGesture}
      onKeyDown={handleKeyDown}
    >
      <Image src={image} alt="" fill className={styles.spriteImage} unoptimized />
    </button>
  );
}

function exceedsDragThreshold(dragStart: DragStart, event: PointerEvent<HTMLButtonElement>): boolean {
  const distance = Math.hypot(event.clientX - dragStart.clientX, event.clientY - dragStart.clientY);
  return distance > DRAG_THRESHOLD_PX;
}
