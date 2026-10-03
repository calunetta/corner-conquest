import { mapZoomControlsPreview } from './legacy/MapZoomControls.preview';
import { sabotageDialogPreview } from './legacy/SabotageDialog.preview';
import { combatDialogPreview } from '@/modules/combat/components/CombatDialog/CombatDialog.preview';
import { monsterCombatDialogPreview } from '@/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview';
import { cardsDialogPreview } from '@/modules/cards/components/CardsDialog/CardsDialog.preview';
import { productiveCardDialogPreview } from '@/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.preview';
import { specialIslandRollDialogPreview } from '@/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.preview';
import { abilitiesDialogPreview } from '@/modules/cards/components/AbilitiesDialog/AbilitiesDialog.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [
  mapZoomControlsPreview,
  sabotageDialogPreview,
  combatDialogPreview,
  monsterCombatDialogPreview,
  cardsDialogPreview,
  productiveCardDialogPreview,
  specialIslandRollDialogPreview,
  abilitiesDialogPreview,
];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
