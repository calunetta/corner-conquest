
import { CardName } from "./enums";

export const BASE_CARDS: CardName[] = [
  CardName.ExtraMove, CardName.StealResource, CardName.Sabotage, CardName.Reinforce,
  CardName.Scout, CardName.Overcome, CardName.Wealthy, CardName.Productive, CardName.Efficient,
  CardName.MasterBuilder, CardName.WarChief,
  CardName.DecideDiceRoll, CardName.Teleport
];

// More copies of common cards, fewer of rare ones.
export const SPECIAL_CARDS: CardName[] = [
  CardName.ExtraMove, CardName.ExtraMove, CardName.ExtraMove,
  CardName.StealResource, CardName.StealResource,
  CardName.Reinforce, CardName.Reinforce,
  CardName.Wealthy, CardName.Wealthy,
  CardName.Productive, CardName.Productive,
  CardName.Efficient,
  CardName.MasterBuilder,
  CardName.WarChief,
  CardName.DecideDiceRoll,
  CardName.Scout,
  CardName.Overcome,
  CardName.Sabotage,
  CardName.Teleport, // Only one copy
];


export const USABLE_CARDS: CardName[] = [
    CardName.ExtraMove,
    CardName.StealResource,
    CardName.Teleport,
    CardName.Sabotage,
    CardName.Reinforce,
    CardName.Scout,
    CardName.Wealthy,
    CardName.Efficient,
    CardName.MasterBuilder,
];

export const SPECIAL_CARD_DESCRIPTIONS: Record<CardName, string> = {
    [CardName.ExtraMove]: 'Take an extra move action this turn.',
    [CardName.StealResource]: 'Steal 2 resources of one type from another player.',
    [CardName.Sabotage]: 'Choose an opponent to lose their next turn.',
    [CardName.Reinforce]: 'Deploy a new army for free.',
    [CardName.Scout]: 'Reveal any 3 hidden tiles on the map.',
    [CardName.Overcome]: 'Automatically win your next battle (player or monster).',
    [CardName.Wealthy]: 'Gain 5 resources of your choice.',
    [CardName.Productive]: 'Double your resource collection for one turn.',
    [CardName.Efficient]: 'Your next deployment costs 50% less food.',
    [CardName.MasterBuilder]: 'Your next upgrade costs 50% less iron.',
    [CardName.WarChief]: 'Gain +2 attack power for your next battle.',
    [CardName.DecideDiceRoll]: 'When attacking a monster, choose the value of one of your dice.',
    [CardName.Teleport]: 'Move one of your armies to any tile on the map.'
};
