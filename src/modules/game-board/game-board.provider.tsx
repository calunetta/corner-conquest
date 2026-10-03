'use client';

import { createContext, useContext } from 'react';
import { useGameBoardProvider } from './game-board.hook';
import type { GameBoardContextType, GameBoardProviderProps } from './game-board.types';

const GameBoardContext = createContext<GameBoardContextType | null>(null);

export function useGameBoard(): GameBoardContextType {
  const context = useContext(GameBoardContext);
  if (!context) {
    throw new Error('useGameBoard must be used within a GameBoardProvider');
  }
  return context;
}

export function GameBoardProvider({
  children,
  ...props
}: GameBoardProviderProps): JSX.Element {
  const value = useGameBoardProvider(props);

  return <GameBoardContext.Provider value={value}>{children}</GameBoardContext.Provider>;
}
