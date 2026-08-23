'use client';

import React from 'react';
import type { Army, CardName } from '@/lib/types';
import { GameAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Anchor, Zap, Album, University, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TutorialBeacon } from '../components/TutorialBeacon';
import { HAND_LIMIT } from '@/lib/types';
import { useGameBoard } from '../context/GameBoardContext';

import { useTurnTimer } from '../hooks/useTurnTimer';

type ActionConfig = {
  id: GameAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tooltip: string;
  onClick: () => void;
};

export function ActionsPanel() {
  const {
    onAction,
    onLocalAction,
    localPlayer,
    gameState,
    isMyTurn,
    selectedArmy,
    uiState,
  } = useGameBoard();

  const { timeLeft, turnDuration } = useTurnTimer({
    isMyTurn,
    gameStatus: gameState?.status || '',
    onAction,
  });

  const { pendingAction } = uiState;
  const { map, specialCardsDeck, settings } = gameState;

  const currentTile =
    selectedArmy && map
      ? map[selectedArmy.position.y * settings.gridSize.cols + selectedArmy.position.x]
      : null;

  const hasArmyActed = !!selectedArmy?.hasActed;
  const isCardActionInProgress = !!pendingAction;

  const canPosition =
    selectedArmy &&
    currentTile &&
    (currentTile.type === 'resource' || currentTile.type === 'base') &&
    currentTile.resources.length > 0 &&
    !localPlayer.positions.some(p => p.armyId === selectedArmy.id) &&
    (!currentTile.monsters || currentTile.monsters.length === 0);

  const canAttack =
    selectedArmy &&
    currentTile &&
    (currentTile.occupants.some(o => o.playerId !== localPlayer.id) ||
      (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));

  const canUseCardForAbility = !localPlayer.actionsThisTurn.includes(GameAction.UseCard);

  let deployCost = localPlayer.nextArmyCost;
  if (localPlayer.reinforceActive && canUseCardForAbility) deployCost = 0;
  else if (localPlayer.efficientActive && canUseCardForAbility) deployCost = Math.ceil(deployCost / 2);

  const isCancellableActionInProgress =
    isCardActionInProgress ||
    localPlayer.reinforceActive ||
    localPlayer.efficientActive ||
    localPlayer.masterBuilderActive ||
    localPlayer.hasExtraMove;

  const mainActions: ActionConfig[] = [
    {
      id: GameAction.local_Position,
      label: 'Position',
      icon: <Anchor className="h-4 w-4" />,
      disabled: !isMyTurn || isCardActionInProgress || hasArmyActed || !canPosition,
      tooltip: 'Station an army on a resource to collect it at the start of your turn.',
      onClick: () => onLocalAction(GameAction.local_Position, { army: selectedArmy }),
    },
    {
      id: GameAction.local_Attack,
      label: 'Attack',
      icon: <Sword className="h-4 w-4" />,
      disabled: !isMyTurn || isCardActionInProgress || hasArmyActed || !canAttack,
      tooltip: 'Attack enemy armies or monsters on the same tile.',
      onClick: () => onLocalAction(GameAction.local_Attack, { army: selectedArmy }),
    },
  ];

  const alwaysAvailableActions: ActionConfig[] = [
    {
      id: GameAction.Deploy,
      label: `Deploy (${deployCost}W)`,
      icon: <Shield className="h-4 w-4" />,
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.armies.length >= 5 ||
        localPlayer.actionsThisTurn.includes(GameAction.Deploy) ||
        localPlayer.resources.wheat < deployCost,
      tooltip: `Deploy a new army at your base. Costs ${deployCost} wheat.`,
      onClick: () => onAction(GameAction.Deploy),
    },
  ];

  const secondaryActions: ActionConfig[] = [
    {
      id: GameAction.Upgrade,
      label: `Upgrade (${settings.upgradeCost}I)`,
      icon: <Zap className="h-4 w-4" />,
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.attackPower >= 4 ||
        localPlayer.actionsThisTurn.includes(GameAction.Upgrade) ||
        localPlayer.resources.iron < settings.upgradeCost,
      tooltip: `Increase your attack power. Max: 4. Costs ${settings.upgradeCost} iron.`,
      onClick: () => onAction(GameAction.Upgrade),
    },
    {
      id: GameAction.BuyCard,
      label: 'Buy Card (10G)',
      icon: <ShoppingCart className="h-4 w-4" />,
      disabled:
        !isMyTurn ||
        isCardActionInProgress ||
        localPlayer.specialCards.length >= HAND_LIMIT ||
        localPlayer.actionsThisTurn.includes(GameAction.BuyCard) ||
        localPlayer.resources.gems < 10 ||
        (specialCardsDeck.length === 0 && gameState.discardPile.length === 0),
      tooltip: 'Buy a special card from the deck. Costs 10 gems.',
      onClick: () => onAction(GameAction.BuyCard),
    },
    {
      id: GameAction.local_ShowCards,
      label: `Cards (${localPlayer.specialCards.length}/${HAND_LIMIT})`,
      icon: <Album className="h-4 w-4" />,
      disabled: localPlayer.specialCards.length === 0,
      tooltip: 'View and use your special cards.',
      onClick: () => onLocalAction(GameAction.local_ShowCards, { playerId: localPlayer.id }),
    },
    {
      id: GameAction.local_OpenAbilitiesShop,
      label: 'Abilities',
      icon: <University className="h-4 w-4" />,
      disabled: !isMyTurn,
      tooltip: 'View and buy passive abilities.',
      onClick: () => onLocalAction(GameAction.local_OpenAbilitiesShop),
    },
  ];

  const timerPercentage = (timeLeft / turnDuration) * 100;

  const getDisabledReason = (action: ActionConfig) => {
    if (!isMyTurn) return "It's not your turn.";
    if (isCardActionInProgress && action.id !== GameAction.local_ShowCards) return 'Complete or cancel the current card action first.';
    if (action.id === GameAction.local_Attack || action.id === GameAction.local_Position) {
      if (!selectedArmy) return 'You must select an army first.';
      if (hasArmyActed) return 'This army has already acted this turn.';
    }

    switch (action.id) {
      case GameAction.BuyCard:
        if (localPlayer.resources.gems < 10) return 'Not enough gems. Cost: 10';
        if (localPlayer.specialCards.length >= HAND_LIMIT) return `Maximum hand limit reached (${HAND_LIMIT} cards).`;
        if (localPlayer.actionsThisTurn.includes(GameAction.BuyCard)) return "You've already bought a card this turn.";
        if (specialCardsDeck.length === 0 && gameState.discardPile.length === 0) return 'No cards remaining in the deck or discard pile.';
        return 'This action is not available.';
      case GameAction.Upgrade:
        if (localPlayer.resources.iron < settings.upgradeCost) return `Not enough iron. Cost: ${settings.upgradeCost}`;
        if (localPlayer.attackPower >= 4) return 'Maximum attack power reached (4).';
        if (localPlayer.actionsThisTurn.includes(GameAction.Upgrade)) return "You've already upgraded this turn.";
        return 'This action is not available.';
      case GameAction.Deploy:
        if (!(localPlayer.reinforceActive && canUseCardForAbility) && localPlayer.resources.wheat < deployCost) return `Not enough wheat. Cost: ${deployCost}`;
        if (localPlayer.armies.length >= 5) return 'Maximum army size reached (5 armies).';
        if (localPlayer.actionsThisTurn.includes(GameAction.Deploy)) return "You've already deployed this turn.";
        return 'This action is not available.';
      case GameAction.local_Attack:
        if (!selectedArmy) return 'You must select an army first.';
        if (!currentTile || (!currentTile.occupants.some(o => o.playerId !== localPlayer.id) && (!currentTile.monsters || currentTile.monsters.length === 0))) return 'There is nothing to attack on this tile.';
        return 'This action is not available.';
      case GameAction.local_Position:
        if (!selectedArmy) return 'You must select an army first.';
        if (localPlayer.positions.some(p => p.armyId === selectedArmy?.id)) return 'This army is already positioned.';
        if (!currentTile || (currentTile.type !== 'resource' && currentTile.type !== 'base') || currentTile.resources.length === 0) return 'This tile has no resources to position on.';
        if (currentTile.monsters && currentTile.monsters.length > 0) return 'Cannot position on an island with monsters.';
        return 'This action is not available.';
      case GameAction.local_ShowCards:
        if (localPlayer.specialCards.length === 0) return 'You have no special cards.';
        return 'This action is not available.';
      case GameAction.local_OpenAbilitiesShop:
        if (!isMyTurn) return 'Can only access shop on your turn.';
        return 'This action is not available.';
      default:
        return 'This action is not available.';
    }
  };

  const renderButton = (action: ActionConfig, isMain: boolean) => {
    const isPendingMatch = !!(
      pendingAction &&
      'cardName' in pendingAction &&
      pendingAction.cardName &&
      pendingAction.cardName.toLowerCase().includes(action.label.toLowerCase())
    );

    return (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          <div className={isMain ? 'w-full' : ''}>
            <Button
              variant={isPendingMatch ? 'default' : 'outline'}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`flex h-auto min-h-12 w-full flex-col items-center justify-center gap-1 p-2 text-center ${
                isMain ? 'h-16 text-xs' : 'text-xs sm:flex-row sm:text-sm'
              }`}
            >
              {action.icon}
              <span className="whitespace-normal">{action.label}</span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{action.tooltip}</p>
          {action.disabled && <p className="mt-1 text-xs text-destructive">{getDisabledReason(action)}</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Card className="bg-background/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          Actions
          <TutorialBeacon
            id="actions-info"
            title="The Actions Panel"
            description="Use this panel to command your armies, deploy new ones, buy special cards, and upgrade your attack power. Hover over any button to see what it does!"
            side="top"
          />
        </CardTitle>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isMyTurn && isCancellableActionInProgress && (
            <Button variant="destructive" size="sm" onClick={() => onLocalAction(GameAction.local_CancelAction)}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {isMyTurn && selectedArmy && (
            <Button variant="secondary" size="sm" onClick={() => onLocalAction(GameAction.local_DeselectArmy)}>
              <XCircle className="mr-2 h-4 w-4" />
              Deselect Army
            </Button>
          )}
          {isMyTurn && (
            <Button
              size="sm"
              disabled={isCardActionInProgress}
              onClick={() => onAction(GameAction.EndTurn)}
              className="relative overflow-hidden"
            >
              <span
                className="absolute left-0 top-0 h-full bg-primary/50 transition-all duration-1000 ease-linear"
                style={{ width: `${timerPercentage}%` }}
              ></span>
              <span className="relative z-10">End Turn</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-3 grid-rows-1 gap-2">
          {mainActions.map(action => renderButton(action, true))}
          {alwaysAvailableActions.map(action => renderButton(action, true))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 flex-wrap gap-2">
          {secondaryActions.map(action => renderButton(action, false))}
        </div>
        <div className="text-center mt-2 text-sm text-muted-foreground">
          Cards in deck: {specialCardsDeck.length}
        </div>
      </CardContent>
    </Card>
  );
}
