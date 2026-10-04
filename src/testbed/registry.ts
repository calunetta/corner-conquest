import { mapZoomControlsPreview } from '@/modules/map/components/MapZoomControls/MapZoomControls.preview';
import { animatedMonsterPreview } from '@/modules/map/components/AnimatedMonster/AnimatedMonster.preview';
import { deathEffectPreview } from '@/modules/map/components/DeathEffect/DeathEffect.preview';
import { tileForestPreview } from '@/modules/map/components/TileForest/TileForest.preview';
import { tileResourcesPreview } from '@/modules/map/components/TileResources/TileResources.preview';
import { tileBoatsPreview } from '@/modules/map/components/TileBoats/TileBoats.preview';
import { tileOccupantsPreview } from '@/modules/map/components/TileOccupants/TileOccupants.preview';
import { islandTilePreview } from '@/modules/map/components/IslandTile/IslandTile.preview';
import { combatDialogPreview } from '@/modules/combat/components/CombatDialog/CombatDialog.preview';
import { monsterCombatDialogPreview } from '@/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview';
import { armySelectionDialogPreview } from '@/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.preview';
import { attackSelectionDialogPreview } from '@/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.preview';
import { monsterSelectionDialogPreview } from '@/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.preview';
import { positionDialogPreview } from '@/modules/combat/components/PositionDialog/PositionDialog.preview';
import { gameBoardHeaderPreview } from '@/modules/hud/components/GameBoardHeader/GameBoardHeader.preview';
import { gameStatusBadgePreview } from '@/modules/hud/components/GameStatusBadge/GameStatusBadge.preview';
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
import { confirmExitDialogPreview } from '@/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.preview';
import { hostLeaveDialogPreview } from '@/modules/session/components/HostLeaveDialog/HostLeaveDialog.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [
  mapZoomControlsPreview,
  animatedMonsterPreview,
  deathEffectPreview,
  tileForestPreview,
  tileResourcesPreview,
  tileBoatsPreview,
  tileOccupantsPreview,
  islandTilePreview,
  combatDialogPreview,
  monsterCombatDialogPreview,
  armySelectionDialogPreview,
  attackSelectionDialogPreview,
  monsterSelectionDialogPreview,
  positionDialogPreview,
  gameBoardHeaderPreview,
  gameStatusBadgePreview,
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
  confirmExitDialogPreview,
  hostLeaveDialogPreview,
];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
