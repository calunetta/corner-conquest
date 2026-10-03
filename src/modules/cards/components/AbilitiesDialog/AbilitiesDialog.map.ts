import type { GameState, Player } from '@/lib/types';
import { AbilityName } from '@/lib/types';
import type { AbilitiesDialogViewModel, AbilityViewModel } from './AbilitiesDialog.types';

interface AbilityInfo {
  name: AbilityName;
  title: string;
  description: string;
}

/** Explorer/Collector copy, legacy CardsDialog.tsx:36-39 equivalent for AbilitiesDialog. */
export const ALL_ABILITIES: AbilityInfo[] = [
  {
    name: AbilityName.Explorer,
    title: 'Explorer',
    description: 'Passively gain 1 VP per turn for each island you have an army on.',
  },
  {
    name: AbilityName.Collector,
    title: 'Collector',
    description:
      'Passively collect 1 of each available resource from every island you have an army on at the end of your turn.',
  },
];

/** Pure. Mirrors legacy AbilitiesDialog.tsx's derived data exactly. */
export function toAbilitiesDialogViewModel(
  gameState: GameState,
  player: Player,
  isMyTurn: boolean,
): AbilitiesDialogViewModel {
  const { settings } = gameState;
  const cost = settings.abilityCost;

  const abilities: AbilityViewModel[] = ALL_ABILITIES.filter((ability) =>
    settings.availableAbilities.includes(ability.name),
  ).map((ability) => {
    const hasAbility = Boolean(player.passiveAbilities[ability.name]);

    return {
      name: ability.name,
      title: ability.title,
      description: ability.description,
      hasAbility,
      showBuyButton: !hasAbility && isMyTurn,
      canAfford: player.resources.gold >= cost,
    };
  });

  return { cost, abilities };
}
