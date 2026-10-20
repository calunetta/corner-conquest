import { mapZoomControlsPreview } from '@/modules/map/components/MapZoomControls/MapZoomControls.preview';
import { animatedMonsterPreview } from '@/modules/map/components/AnimatedMonster/AnimatedMonster.preview';
import { deathEffectPreview } from '@/modules/map/components/DeathEffect/DeathEffect.preview';
import { cardRevealEffectPreview } from '@/modules/map/components/CardRevealEffect/CardRevealEffect.preview';
import { tileDecorationsPreview } from '@/modules/map/components/TileDecorations/TileDecorations.preview';
import { tileResourcesPreview } from '@/modules/map/components/TileResources/TileResources.preview';
import { tileBoatsPreview } from '@/modules/map/components/TileBoats/TileBoats.preview';
import { tileOccupantsPreview } from '@/modules/map/components/TileOccupants/TileOccupants.preview';
import { islandTilePreview } from '@/modules/map/components/IslandTile/IslandTile.preview';
import { tileFogEditorPreview, tileFogPreview } from '@/modules/map/components/TileFog/TileFog.preview';
import { mapDecorationsPreview } from '@/modules/map/components/MapDecorations/MapDecorations.preview';
import { mapGridPreview } from '@/modules/map/components/MapGrid/MapGrid.preview';
import { combatDialogPreview } from '@/modules/combat/components/CombatDialog/CombatDialog.preview';
import { monsterCombatDialogPreview } from '@/modules/combat/components/MonsterCombatDialog/MonsterCombatDialog.preview';
import { armySelectionDialogPreview } from '@/modules/combat/components/ArmySelectionDialog/ArmySelectionDialog.preview';
import { attackSelectionDialogPreview } from '@/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.preview';
import { monsterSelectionDialogPreview } from '@/modules/combat/components/MonsterSelectionDialog/MonsterSelectionDialog.preview';
import { positionDialogPreview } from '@/modules/combat/components/PositionDialog/PositionDialog.preview';
import { gameBoardHeaderPreview } from '@/modules/hud/components/GameBoardHeader/GameBoardHeader.preview';
import { gameStatusBadgePreview } from '@/modules/hud/components/GameStatusBadge/GameStatusBadge.preview';
import { connectionWarningDialogPreview } from '@/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.preview';
import { resourceCollectionFeedbackDemoPreview } from '@/modules/game-board/ResourceCollectionFeedbackDemo.preview';
import { gameBoardSandboxPreview } from '@/features/game/components/GameBoardSandbox.preview';
import { cardPlaySandboxPreview } from '@/testbed/components/CardPlaySandbox/CardPlaySandbox.preview';
import { gameLogPreview } from '@/modules/hud/components/GameLog/GameLog.preview';
import { playerInfoPreview } from '@/modules/hud/components/PlayerInfo/PlayerInfo.preview';
import { tutorialBeaconPreview } from '@/modules/hud/components/TutorialBeacon/TutorialBeacon.preview';
import { actionsPanelPreview } from '@/modules/hud/components/ActionsPanel/ActionsPanel.preview';
import { mobileActionsBarPreview } from '@/modules/hud/components/ActionsPanel/MobileActionsBar.preview';
import { mobileEventLogSheetPreview } from '@/modules/hud/components/ActionsPanel/MobileEventLogSheet.preview';
import { cardFacePreview } from '@/modules/cards/components/CardFace/CardFace.preview';
import { cardPlayOverlayPreview } from '@/modules/cards/components/CardPlayOverlay/CardPlayOverlay.preview';
import { cardsDialogPreview } from '@/modules/cards/components/CardsDialog/CardsDialog.preview';
import { productiveCardDialogPreview } from '@/modules/cards/components/ProductiveCardDialog/ProductiveCardDialog.preview';
import { specialIslandRollDialogPreview } from '@/modules/cards/components/SpecialIslandRollDialog/SpecialIslandRollDialog.preview';
import { abilitiesDialogPreview } from '@/modules/cards/components/AbilitiesDialog/AbilitiesDialog.preview';
import { sabotageDialogPreview } from '@/modules/cards/components/SabotageDialog/SabotageDialog.preview';
import { wealthyDialogPreview } from '@/modules/cards/components/WealthyDialog/WealthyDialog.preview';
import { stealResourceDialogPreview } from '@/modules/cards/components/StealResourceDialog/StealResourceDialog.preview';
import { confirmExitDialogPreview } from '@/modules/session/components/ConfirmExitDialog/ConfirmExitDialog.preview';
import { hostLeaveDialogPreview } from '@/modules/session/components/HostLeaveDialog/HostLeaveDialog.preview';
import { victoryDialogPreview } from '@/modules/session/components/VictoryDialog/VictoryDialog.preview';
import { googleIconPreview } from '@/modules/session/components/GoogleIcon/GoogleIcon.preview';
import { linkGoogleAccountButtonPreview } from '@/modules/session/components/LinkGoogleAccountButton/LinkGoogleAccountButton.preview';
import { deleteAccountButtonPreview } from '@/modules/session/components/DeleteAccountButton/DeleteAccountButton.preview';
import { loginPreview } from '@/modules/session/components/Login/Login.preview';
import { adSlotPreview } from '@/modules/ads/components/AdSlot/AdSlot.preview';
import { lobbyPreview } from '@/modules/lobby/components/Lobby/Lobby.preview';
import { lobbyBackgroundPreview } from '@/modules/lobby/components/LobbyBackground/LobbyBackground.preview';
import { lobbyGameRowPreview } from '@/modules/lobby/components/LobbyGameRow/LobbyGameRow.preview';
import { createGameDialogPreview } from '@/modules/lobby/components/CreateGameDialog/CreateGameDialog.preview';
import { customSettingsSheetPreview } from '@/modules/lobby/components/CustomSettingsSheet/CustomSettingsSheet.preview';
import { rejoinMatchPanelPreview } from '@/modules/lobby/components/RejoinMatchPanel/RejoinMatchPanel.preview';
import { avatarPickerButtonPreview } from '@/modules/avatars/components/AvatarPickerButton/AvatarPickerButton.preview';
import { tileDecorationEditorPreview } from '@/testbed/components/TileDecorationEditor/TileDecorationEditor.preview';
import { monsterSpriteUploaderPreview } from '@/testbed/components/MonsterSpriteUploader/MonsterSpriteUploader.preview';
import { tileVariantEditorPreview } from '@/testbed/components/TileVariantEditor/TileVariantEditor.preview';
import { tileVariantGalleryPreview } from '@/testbed/components/TileVariantGallery/TileVariantGallery.preview';
import { iconEditorPreview } from '@/testbed/components/IconEditor/IconEditor.preview';
import type { ComponentPreview } from './testbed.types';

/** Every preview shown in the testbed. Register new previews here (skill: testbed-preview). */
export const previews: ComponentPreview[] = [
  mapZoomControlsPreview,
  animatedMonsterPreview,
  deathEffectPreview,
  cardRevealEffectPreview,
  tileDecorationsPreview,
  tileResourcesPreview,
  tileBoatsPreview,
  tileOccupantsPreview,
  islandTilePreview,
  tileFogPreview,
  tileFogEditorPreview,
  mapDecorationsPreview,
  mapGridPreview,
  combatDialogPreview,
  monsterCombatDialogPreview,
  armySelectionDialogPreview,
  attackSelectionDialogPreview,
  monsterSelectionDialogPreview,
  positionDialogPreview,
  gameBoardHeaderPreview,
  gameStatusBadgePreview,
  connectionWarningDialogPreview,
  resourceCollectionFeedbackDemoPreview,
  gameBoardSandboxPreview,
  cardPlaySandboxPreview,
  gameLogPreview,
  playerInfoPreview,
  tutorialBeaconPreview,
  actionsPanelPreview,
  mobileActionsBarPreview,
  mobileEventLogSheetPreview,
  cardFacePreview,
  cardsDialogPreview,
  cardPlayOverlayPreview,
  productiveCardDialogPreview,
  specialIslandRollDialogPreview,
  abilitiesDialogPreview,
  sabotageDialogPreview,
  wealthyDialogPreview,
  stealResourceDialogPreview,
  confirmExitDialogPreview,
  hostLeaveDialogPreview,
  victoryDialogPreview,
  googleIconPreview,
  linkGoogleAccountButtonPreview,
  deleteAccountButtonPreview,
  loginPreview,
  adSlotPreview,
  lobbyPreview,
  lobbyBackgroundPreview,
  lobbyGameRowPreview,
  avatarPickerButtonPreview,
  createGameDialogPreview,
  customSettingsSheetPreview,
  rejoinMatchPanelPreview,
  tileDecorationEditorPreview,
  monsterSpriteUploaderPreview,
  tileVariantEditorPreview,
  tileVariantGalleryPreview,
  iconEditorPreview,
];

export function findPreview(slug: string): ComponentPreview | undefined {
  return previews.find((preview) => preview.slug === slug);
}
