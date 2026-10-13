import type { Player } from '@/lib/types';
import { createPlayer, defaultGameSettings } from '@/modules/game-rules';

const HUMAN_SEAT_INDEX = 0;
const BOT_SEAT_INDEX = 1;
const WINNING_VICTORY_POINTS = 20;
const BASE_POSITION = { x: 0, y: 0 };

/** Shared by the tests and the testbed preview. Deterministic: no random values or dates. */
export const humanWinner: Player = {
  ...createPlayer(HUMAN_SEAT_INDEX, 'human-player', 'Mira', 'blue', false, BASE_POSITION, defaultGameSettings, false),
  victoryPoints: WINNING_VICTORY_POINTS,
};

export const botWinner: Player = {
  ...createPlayer(BOT_SEAT_INDEX, 'bot-player', 'Bot Rex', 'red', true, BASE_POSITION, defaultGameSettings, false),
  victoryPoints: WINNING_VICTORY_POINTS,
};
