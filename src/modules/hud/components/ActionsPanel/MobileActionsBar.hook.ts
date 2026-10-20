'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { GameAction } from '@/lib/types';

export interface MobileActionsBarState {
  /** Attach to the fixed bar's own root element (not the spacer). */
  barRef: React.RefObject<HTMLDivElement>;
  /** 0 until the first measurement effect runs; feeds the spacer's inline height. */
  barHeightPx: number;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  isLogSheetOpen: boolean;
  onLogSheetOpenChange: (open: boolean) => void;
  /** Closes the actions sheet, then forwards the click. */
  onSheetActionClick: (id: GameAction) => void;
}

/**
 * Manages mobile actions bar UI state: height measurement via ResizeObserver
 * and the open/closed state of the actions sheet and the event log sheet.
 * The two sheets never stack: opening one closes the other.
 */
export function useMobileActionsBar(onActionClick: (id: GameAction) => void): MobileActionsBarState {
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeightPx, setBarHeightPx] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false);

  const onSheetOpenChange = useCallback((open: boolean) => {
    setIsSheetOpen(open);
    if (open) setIsLogSheetOpen(false);
  }, []);

  const onLogSheetOpenChange = useCallback((open: boolean) => {
    setIsLogSheetOpen(open);
    if (open) setIsSheetOpen(false);
  }, []);

  const onSheetActionClick = useCallback(
    (id: GameAction) => {
      setIsSheetOpen(false);
      onActionClick(id);
    },
    [onActionClick],
  );

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
    onSheetOpenChange,
    isLogSheetOpen,
    onLogSheetOpenChange,
    onSheetActionClick,
  };
}
