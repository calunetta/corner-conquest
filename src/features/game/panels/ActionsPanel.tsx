
'use client';
import type { GameState, Player, Army, CardName } from '@/lib/types';
import type { PendingAction } from '@/features/game/types';
import { GameAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sword, ShoppingCart, Anchor, Zap, Album, University, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

type ActionsPanelProps = {
  onAction: (action: GameAction, payload?: any) => void;
  onLocalAction: (action: GameAction, payload?: any) => void;
  localPlayer: Player;
  gameState: GameState;
  isMyTurn: boolean;
  timeLeft: number;
  turnDuration: number;
  selectedArmy: Army | null;
  pendingAction: PendingAction;
};

type ActionConfig = {
  id: GameAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tooltip: string;
  onClick: () => void;
};

export function ActionsPanel({ 
    onAction, 
    onLocalAction,
    localPlayer, 
    gameState, 
    isMyTurn, 
    timeLeft, 
    turnDuration, 
    selectedArmy, 
    pendingAction
}: ActionsPanelProps) {
  const { map, specialCardsDeck, settings } = gameState;
  
  const currentTile = (selectedArmy && map) 
    ? map[selectedArmy.position.y * settings.gridSize.cols + selectedArmy.position.x] 
    : null;

  const hasArmyActed = !!selectedArmy?.hasActed;
  const isCardActionInProgress = !!pendingAction;

  const canPosition = selectedArmy && currentTile && (currentTile.type === 'resource' || currentTile.type === 'base') && currentTile.resources.length > 0 && !localPlayer.positions.some(p => p.armyId === selectedArmy.id) && (!currentTile.monsters || currentTile.monsters.length === 0);
  const canAttack = selectedArmy && currentTile && (currentTile.occupants.some(o => o.playerId !== localPlayer.id) || (currentTile.type === 'monster' && !!currentTile.monsters && currentTile.monsters.length > 0));
  
  const upgradeCost = localPlayer.masterBuilderActive ? Math.ceil(settings.upgradeCost / 2) : settings.upgradeCost;
  const deployCost = localPlayer.efficientActive ? Math.ceil(localPlayer.nextArmyCost / 2) : localPlayer.nextArmyCost;

  const canDeploy = (localPlayer.resources.wheat >= deployCost || localPlayer.reinforceActive) && localPlayer.armyCount < 5 && !localPlayer.actionsThisTurn.includes(GameAction.Deploy);
  const canBuyCard = localPlayer.resources.gems >= 10 && specialCardsDeck.length > 0 && !localPlayer.actionsThisTurn.includes(GameAction.BuyCard);
  const canUpgrade = localPlayer.resources.iron >= upgradeCost && !localPlayer.actionsThisTurn.includes(GameAction.Upgrade) && localPlayer.attackPower < 4;
  
  const isCancellableActionInProgress = !!pendingAction;

  const mainActions: ActionConfig[] = [
    { id: GameAction.Attack, label: 'Attack', icon: <Shield />, disabled: !canAttack || hasArmyActed || isCardActionInProgress, tooltip: "Attack another player's army or a monster on the same island. Can only be done once per turn, before moving.", onClick: () => onAction(GameAction.Attack, { army: selectedArmy }) },
    { id: GameAction.local_Position, label: 'Position', icon: <Anchor />, disabled: !canPosition || hasArmyActed || isCardActionInProgress, tooltip: "Position your army on a resource to position on. Can only be done once per turn, before moving.", onClick: () => onLocalAction(GameAction.local_Position, { army: selectedArmy }) },
  ];
  
  const deployLabel = localPlayer.reinforceActive
    ? 'Deploy'
    : `Deploy (${localPlayer.resources.wheat}/${deployCost} Wheat)`;

  const buyCardLabel = `Buy Card`;

  const secondaryActions: ActionConfig[] = [
    { 
      id: GameAction.Upgrade, 
      label: `Upgrade (${localPlayer.resources.iron}/${upgradeCost} Iron)`, 
      icon: <Zap />, 
      disabled: !canUpgrade, 
      tooltip: "Spend iron to permanently increase your army's attack power by 1. Can only be done once per turn.",
      onClick: () => onAction(GameAction.Upgrade)
    },
    { 
      id: GameAction.BuyCard, 
      label: buyCardLabel, 
      icon: <ShoppingCart />, 
      disabled: !canBuyCard, 
      tooltip: "Spend 10 gems to draw a random special card from the deck. Can only be done once per turn.",
      onClick: () => onAction(GameAction.BuyCard)
    },
    { 
      id: GameAction.Deploy, 
      label: deployLabel, 
      icon: <Sword />, 
      disabled: !canDeploy, 
      tooltip: "Spend wheat to deploy a new army at your base. The cost increases with each new army.",
      onClick: () => onAction(GameAction.Deploy)
    },
    { 
      id: GameAction.local_OpenAbilitiesShop, 
      label: 'Abilities Shop', 
      icon: <University />, 
      disabled: false, 
      tooltip: "Purchase permanent passive abilities for your empire.",
      onClick: () => onLocalAction(GameAction.local_OpenAbilitiesShop)
    },
  ];
  
  const alwaysAvailableActions: ActionConfig[] = [
      { 
        id: GameAction.local_ShowCards, 
        label: 'My Cards', 
        icon: <Album />, 
        disabled: localPlayer.specialCards.length === 0, 
        tooltip: "View your collected special cards. You can use one per turn.", 
        onClick: () => onLocalAction(GameAction.local_ShowCards, { playerId: localPlayer.id })
      },
  ]
  
  const timerPercentage = (timeLeft / turnDuration) * 100;

  const getDisabledReason = (actionId: GameAction): string => {
    if (isCardActionInProgress) return "Complete or cancel your current card action.";
    switch (actionId) {
        case GameAction.Upgrade:
            if (localPlayer.attackPower >= 4) return "Maximum attack power reached.";
            if (localPlayer.resources.iron < upgradeCost) return "Not enough iron.";
            if (localPlayer.actionsThisTurn.includes(GameAction.Upgrade)) return "You've already upgraded this turn.";
            return "This action is not available.";
        case GameAction.BuyCard:
            if (localPlayer.resources.gems < 10) return "Not enough gems.";
            if (specialCardsDeck.length === 0) return "No cards left in the deck.";
            if (localPlayer.actionsThisTurn.includes(GameAction.BuyCard)) return "You've already bought a card this turn.";
            return "This action is not available.";
        case GameAction.Deploy:
            if (!localPlayer.reinforceActive && localPlayer.resources.wheat < deployCost) return "Not enough wheat.";
            if (localPlayer.armyCount >= 5) return "Maximum army size reached.";
            if (localPlayer.actionsThisTurn.includes(GameAction.Deploy)) return "You've already deployed this turn.";
            return "This action is not available.";
        case GameAction.Attack:
            if (!selectedArmy) return "You must select an army first.";
            if (!currentTile || (!currentTile.occupants.some(o => o.playerId !== localPlayer.id) && (!currentTile.monsters || currentTile.monsters.length === 0))) return "There is nothing to attack on this tile.";
            return "This action is not available.";
        case GameAction.local_Position:
            if (!selectedArmy) return "You must select an army first.";
            if (localPlayer.positions.some(p => p.armyId === selectedArmy?.id)) return "You are already positioned here.";
            if (!currentTile || (currentTile.type !== 'resource' && currentTile.type !== 'base') || currentTile.resources.length === 0) return "This tile has no resources to position on.";
            if (currentTile.monsters && currentTile.monsters.length > 0) return "Cannot position on an island with monsters.";
            return "This action is not available.";
        case GameAction.local_ShowCards:
            if (localPlayer.specialCards.length === 0) return "You have no special cards.";
            return "This action is not available.";
        default:
            return "This action is not available.";
    }
  };

  const renderButton = (action: ActionConfig, isMain: boolean) => {
    const isDisabled = action.id.startsWith('local:') ? action.disabled : (!isMyTurn || action.disabled);

    return (
        <TooltipProvider key={action.id}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={isMain ? "w-full" : ""}>
                        <Button
                            variant={pendingAction?.type === action.id.toLowerCase() ? 'default' : 'outline'}
                            onClick={action.onClick}
                            disabled={isDisabled}
                            className={`flex h-auto min-h-12 w-full flex-col items-center justify-center gap-1 p-2 text-center ${isMain ? 'h-16 text-xs' : 'text-xs sm:flex-row sm:text-sm'}`}
                        >
                            {action.icon}
                            <span className="whitespace-normal">{action.label}</span>
                        </Button>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{action.tooltip}</p>
                    {isDisabled && <p className="mt-1 text-xs text-destructive">
                        {!isMyTurn && !action.id.startsWith('local:') ? "It's not your turn." : (hasArmyActed && [GameAction.Attack, GameAction.local_Position].includes(action.id) ? "This army has already acted." : getDisabledReason(action.id))}
                    </p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg">Actions</CardTitle>
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
                <Button size="sm" onClick={() => onAction(GameAction.EndTurn)} className="relative overflow-hidden">
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
            {mainActions.map((action) => renderButton(action, true))}
            {alwaysAvailableActions.map((action) => renderButton(action, true))}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 flex-wrap gap-2">
            {secondaryActions.map((action) => renderButton(action, false))}
        </div>
        <div className='text-center mt-2 text-sm text-muted-foreground'>
            Cards in deck: {specialCardsDeck.length}
        </div>
      </CardContent>
    </Card>
  );
}
