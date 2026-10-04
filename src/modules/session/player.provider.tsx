'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePlayerProvider } from './player.hook';
import type { PlayerContextType } from './player.types';

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

export function PlayerProvider({ children }: { children: ReactNode }): JSX.Element {
  const value = usePlayerProvider();

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
