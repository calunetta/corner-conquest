import { CardName, PlayerColor } from '@/lib/types';
import type { Player } from '@/lib/types';
import { buildPlayer } from '@/modules/map/board-context.fixtures';
import type { SandboxGame } from './CardPlaySandbox.types';

export const SANDBOX_LOCAL_PLAYER_ID = 'p-local';

export const SANDBOX_STARTING_HAND: CardName[] = [
  CardName.ExtraMove,
  CardName.Sabotage,
  CardName.Wealthy,
  CardName.StealResource,
  CardName.Teleport,
  CardName.Scout,
  CardName.Reinforce,
];

export const SANDBOX_COMBAT_CARDS: CardName[] = [CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll];

export const SANDBOX_OPPONENTS: Player[] = [
  buildPlayer({
    id: 1,
    playerId: 'p-red',
    name: 'Red',
    color: PlayerColor.Red,
    resources: { food: 3, wood: 3, gold: 3 },
  }),
  buildPlayer({
    id: 2,
    playerId: 'p-purple',
    name: 'Purple',
    color: PlayerColor.Purple,
    resources: { food: 3, wood: 3, gold: 3 },
  }),
];

export const SANDBOX_INITIAL_GAME: SandboxGame = {
  turn: 1,
  cards: SANDBOX_STARTING_HAND,
  hasUsedCard: false,
  log: [],
};
