import type { GameLogViewModel } from './GameLog.types';

export const emptyLog: GameLogViewModel = {
  entries: [],
};

export const multiEntryLog: GameLogViewModel = {
  entries: [
    'Player Red upgraded to 3 attack power',
    'Player Blue deployed a new army',
    'Player Red gained 5 Food from harvesting',
    'Player Blue attacked on the island',
    'Player Red gained 3 Gold from special island',
  ],
};
