import { defaultGameSettings } from '@/modules/game-rules';
import { PlayerColor } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';

/** Minimal, deterministic player shaped object; only the fields the row and its popover read matter. */
const createRowPlayer = (playerId: string, name: string, color: PlayerColor): Player =>
  ({ playerId, name, color }) as Player;

export const openGame: GameState = {
  id: 'game-open',
  name: "Ada's Archipelago",
  maxPlayers: 4,
  players: [createRowPlayer('p1', 'Ada', PlayerColor.Blue), createRowPlayer('p2', 'Bo', PlayerColor.Red)],
  settings: defaultGameSettings,
} as GameState;

export const fullGame: GameState = {
  id: 'game-full',
  name: "Rex's Grand Conquest",
  maxPlayers: 2,
  players: [createRowPlayer('p3', 'Rex', PlayerColor.Purple), createRowPlayer('p4', 'Mira', PlayerColor.Yellow)],
  settings: defaultGameSettings,
} as GameState;

/** Non-default victory point goal, so the VP badge shows the game's own value rather than the 30 VP default. */
export const customGoalGame: GameState = {
  ...openGame,
  id: 'game-custom-goal',
  name: "Mira's Long War",
  settings: { ...defaultGameSettings, victoryPointGoal: 45 },
} as GameState;
