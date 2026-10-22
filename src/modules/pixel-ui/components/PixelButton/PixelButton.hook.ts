import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ConsumerHandlers, PixelButtonVisual, PixelButtonVisualState } from './PixelButton.types';

export const KEY_PRESS_MS = 100;

const isActivationKey = (key: string): boolean => key === 'Enter' || key === ' ';

/** Derives the art state (regular, hover, pressed, disabled) from pointer and keyboard events. */
export function usePixelButtonVisual(
  isDisabled: boolean,
  consumer?: ConsumerHandlers,
): PixelButtonVisualState {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimer.current === null) return;
    clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
  }, []);

  useEffect(() => clearReleaseTimer, [clearReleaseTimer]);

  // Re-enabling must not resurface a press that began before the button was disabled.
  useEffect(() => {
    if (!isDisabled) return;
    clearReleaseTimer();
    setIsHovered(false);
    setIsPressed(false);
  }, [isDisabled, clearReleaseTimer]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isActivationKey(event.key)) return;
    clearReleaseTimer();
    setIsPressed(true);
    releaseTimer.current = setTimeout(() => {
      releaseTimer.current = null;
      setIsPressed(false);
    }, KEY_PRESS_MS);
  };

  const handleBlur = () => {
    clearReleaseTimer();
    setIsHovered(false);
    setIsPressed(false);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  return {
    visual: toVisual(isDisabled, isPressed, isHovered),
    handlers: {
      onPointerEnter: (event) => {
        consumer?.onPointerEnter?.(event);
        setIsHovered(true);
      },
      onPointerLeave: (event) => {
        consumer?.onPointerLeave?.(event);
        handlePointerLeave();
      },
      onPointerDown: (event) => {
        consumer?.onPointerDown?.(event);
        setIsPressed(true);
      },
      onPointerUp: (event) => {
        consumer?.onPointerUp?.(event);
        setIsPressed(false);
      },
      onPointerCancel: (event) => {
        consumer?.onPointerCancel?.(event);
        handlePointerLeave();
      },
      onKeyDown: (event) => {
        consumer?.onKeyDown?.(event);
        handleKeyDown(event);
      },
      onBlur: (event) => {
        consumer?.onBlur?.(event);
        handleBlur();
      },
    },
  };
}

function toVisual(isDisabled: boolean, isPressed: boolean, isHovered: boolean): PixelButtonVisual {
  if (isDisabled) return 'disabled';
  if (isPressed) return 'pressed';
  return isHovered ? 'hover' : 'regular';
}
