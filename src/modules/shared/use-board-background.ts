'use client';

import * as React from 'react';
import {
  getBoardBackgroundEnabled,
  hydrateBoardBackgroundFromStorage,
  setBoardBackgroundEnabled,
  subscribeToBoardBackgroundState,
} from './board-background-store';

export interface UseBoardBackgroundResult {
  isBackgroundOn: boolean;
  setBackgroundOn: (enabled: boolean) => void;
}

/** Shares the device-local sky-background preference between every component that calls it. */
export function useBoardBackground(): UseBoardBackgroundResult {
  const [isBackgroundOn, setIsBackgroundOn] = React.useState<boolean>(getBoardBackgroundEnabled());

  React.useEffect(() => {
    hydrateBoardBackgroundFromStorage();
    // Hydration may have run before this component subscribed, so re-read the value it settled on.
    setIsBackgroundOn(getBoardBackgroundEnabled());
    return subscribeToBoardBackgroundState(setIsBackgroundOn);
  }, []);

  return { isBackgroundOn, setBackgroundOn: setBoardBackgroundEnabled };
}
