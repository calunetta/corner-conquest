'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export interface MobileActionsBarState {
  /** Attach to the fixed bar's own root element (not the spacer). */
  barRef: React.RefObject<HTMLDivElement>;
  /** 0 until the first measurement effect runs; feeds the spacer's inline height. */
  barHeightPx: number;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
}

/**
 * Manages mobile actions bar UI state: height measurement via ResizeObserver
 * and sheet open/closed state.
 */
export function useMobileActionsBar(): MobileActionsBarState {
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeightPx, setBarHeightPx] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useLayoutEffect(() => {
    const element = barRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      const entry = entries[0];
      setBarHeightPx(entry.contentRect.height);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return {
    barRef,
    barHeightPx,
    isSheetOpen,
    onSheetOpenChange: setIsSheetOpen,
  };
}
