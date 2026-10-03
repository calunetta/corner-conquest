import { mapZoomControlsPreview } from '@/modules/map/components/MapZoomControls/MapZoomControls.preview';
import { combatDialogPreview } from '@/modules/combat/components/CombatDialog/CombatDialog.preview';
import { monsterCombatDialogPreview } from '@/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview';
import { gameLogPreview } from '@/modules/hud/components/GameLog/GameLog.preview';
import { playerInfoPreview } from '@/modules/hud/components/PlayerInfo/PlayerInfo.preview';
import { actionsPanelPreview } from '@/modules/hud/components/ActionsPanel/ActionsPanel.preview';
import { cardsDialogPreview } from '@/modules/cards/components/CardsDialog/CardsDialog.preview';
import { productiveCardDialogPreview } from '@/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.preview';
import { specialIslandRollDialogPreview } from '@/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.preview';
import { abilitiesDialogPreview } from '@/modules/cards/components/AbilitiesDialog/AbilitiesDialog.preview';
import { sabotageDialogPreview } from '@/modules/cards/components/SabotageDialog/SabotageDialog.preview';
import { wealthyDialogPreview } from '@/modules/cards/components/WealthyDialog/WealthyDialog.preview';
import { stealResourceDialogPreview } from '@/modules/cards/components/StealResourceDialog/StealResourceDialog.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [
  mapZoomControlsPreview,
  combatDialogPreview,
  monsterCombatDialogPreview,
  gameLogPreview,
  playerInfoPreview,
  actionsPanelPreview,
  cardsDialogPreview,
  productiveCardDialogPreview,
  specialIslandRollDialogPreview,
  abilitiesDialogPreview,
  sabotageDialogPreview,
  wealthyDialogPreview,
  stealResourceDialogPreview,
];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
